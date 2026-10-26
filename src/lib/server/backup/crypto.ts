/**
 * @module server/backup/crypto
 * @description Fonctions de chiffrement et déchiffrement fort (AES-256-GCM) pour les archives de sauvegarde.
 * Format de l'archive chiffrée : [12 octets IV] [Corps chiffré] [16 octets Auth Tag].
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import { pipeline } from 'node:stream/promises';

/**
 * Génère une nouvelle clé de chiffrement maîtresse de 256 bits (64 caractères hexadécimaux).
 */
export function generateBackupKey(): string {
	return crypto.randomBytes(32).toString('hex');
}

/**
 * Valide si une clé est au bon format 256-bit hex (64 caractères).
 */
export function isValidBackupKey(key: string): boolean {
	return /^[0-9a-fA-F]{64}$/.test(key.trim());
}

/**
 * Chiffre un fichier disque avec AES-256-GCM.
 * Structure produite : [12 bytes IV][Ciphertext stream][16 bytes AuthTag].
 */
export async function encryptBackupArchive(
	sourcePath: string,
	destPath: string,
	keyHex: string
): Promise<void> {
	const key = Buffer.from(keyHex.trim(), 'hex');
	if (key.length !== 32) {
		throw new Error('La clé de chiffrement doit être une clé valide de 32 octets (64 hex).');
	}

	const iv = crypto.randomBytes(12);
	const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

	const readStream = fs.createReadStream(sourcePath);
	const writeStream = fs.createWriteStream(destPath);

	// 1. Écrire l'IV au tout début du fichier
	writeStream.write(iv);

	// 2. Chiffrer le contenu
	await pipeline(readStream, cipher, writeStream, { end: false });

	// 3. Écrire le tag d'authentification (16 octets) à la fin
	const authTag = cipher.getAuthTag();
	await new Promise<void>((resolve, reject) => {
		writeStream.once('error', reject);
		writeStream.end(authTag, () => resolve());
	});
}

/**
 * Déchiffre une archive sauvegardée chiffrée avec AES-256-GCM pour validation ou restauration.
 */
export async function decryptBackupArchive(
	sourcePath: string,
	destPath: string,
	keyHex: string
): Promise<void> {
	const key = Buffer.from(keyHex.trim(), 'hex');
	if (key.length !== 32) {
		throw new Error('La clé de chiffrement doit être une clé valide de 32 octets (64 hex).');
	}

	const fileStats = await fs.promises.stat(sourcePath);
	if (fileStats.size < 28) {
		throw new Error('Archive chiffrée invalide ou tronquée.');
	}

	// 1. Lire l'IV (12 octets)
	const fd = await fs.promises.open(sourcePath, 'r');
	const iv = Buffer.alloc(12);
	await fd.read(iv, 0, 12, 0);

	// 2. Lire le Tag d'authentification (16 derniers octets)
	const authTag = Buffer.alloc(16);
	await fd.read(authTag, 0, 16, fileStats.size - 16);
	await fd.close();

	const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
	decipher.setAuthTag(authTag);

	// 3. Déchiffrer le corps (de l'octet 12 jusqu'à size - 16)
	const readStream = fs.createReadStream(sourcePath, {
		start: 12,
		end: fileStats.size - 17
	});
	const writeStream = fs.createWriteStream(destPath);

	await pipeline(readStream, decipher, writeStream);
}
