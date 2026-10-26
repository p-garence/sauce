/**
 * @module server/backup/export
 * @description Générateur d'archives de sauvegarde complètes (.tar.gz) combinant le dump PostgreSQL,
 * les fichiers médias du répertoire uploads, et un manifeste JSON de métadonnées avec sommes de contrôle.
 */

import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { env } from '$env/dynamic/private';
import { UPLOAD_DIR } from '$lib/server/media/config';

const execAsync = promisify(exec);

export interface BackupManifest {
	version: string;
	createdAt: string;
	instance: {
		url: string;
	};
	stats: {
		databaseSizeBytes: number;
		uploadsCount: number;
		uploadsSizeBytes: number;
		archiveSizeBytes?: number;
	};
	checksums: {
		databaseSqlSha256: string;
		manifestSha256?: string;
	};
}

export interface BackupArchiveResult {
	archivePath: string;
	filename: string;
	manifest: BackupManifest;
	cleanup: () => Promise<void>;
}

/**
 * Calcule le hash SHA-256 d'un fichier sur disque de manière streamée.
 */
export async function calculateFileSha256(filePath: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const hash = crypto.createHash('sha256');
		const stream = createReadStream(filePath);
		stream.on('data', (data) => hash.update(data));
		stream.on('end', () => resolve(hash.digest('hex')));
		stream.on('error', (err) => reject(err));
	});
}

/**
 * Réalise un dump SQL complet de la base PostgreSQL.
 * Tente d'abord `pg_dump` direct, puis le conteneur Docker `social_db`.
 */
export async function dumpDatabase(targetPath: string): Promise<{ sizeBytes: number; sha256: string }> {
	const dbUrl = env.DATABASE_URL || 'postgres://root:mysecretpassword@localhost:5432/social';
	let dumpSuccess = false;
	let lastError: unknown = null;

	// 1. Tentative avec pg_dump natif
	try {
		await execAsync(`pg_dump --clean --if-exists "${dbUrl}" -f "${targetPath}"`);
		dumpSuccess = true;
	} catch (err) {
		lastError = err;
	}

	// 2. Fallback avec le conteneur Docker social_db
	if (!dumpSuccess) {
		try {
			await execAsync(`docker exec social_db pg_dump -U root -d social --clean --if-exists > "${targetPath}"`);
			dumpSuccess = true;
		} catch (err) {
			lastError = err;
		}
	}

	if (!dumpSuccess) {
		throw new Error(
			`Échec de la génération du dump PostgreSQL (ni pg_dump ni Docker social_db disponible): ${
				lastError instanceof Error ? lastError.message : String(lastError)
			}`
		);
	}

	const stats = await fs.stat(targetPath);
	const sha256 = await calculateFileSha256(targetPath);

	return {
		sizeBytes: stats.size,
		sha256
	};
}

/**
 * Calcule le nombre total de fichiers et l'espace disque de UPLOAD_DIR.
 */
async function getUploadsStats(): Promise<{ count: number; sizeBytes: number }> {
	let count = 0;
	let sizeBytes = 0;

	try {
		const entries = await fs.readdir(UPLOAD_DIR, { withFileTypes: true });
		for (const entry of entries) {
			if (entry.isFile()) {
				count++;
				const st = await fs.stat(path.join(UPLOAD_DIR, entry.name));
				sizeBytes += st.size;
			}
		}
	} catch {
		// Le dossier uploads n'existe pas encore ou est vide
	}

	return { count, sizeBytes };
}

/**
 * Crée une archive complète .tar.gz contenant database.sql, manifest.json et le dossier uploads.
 */
export async function createBackupArchive(): Promise<BackupArchiveResult> {
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	const filename = `social-backup-${timestamp}.tar.gz`;
	const stagingDir = path.resolve('/tmp', `social-backup-staging-${Date.now()}`);
	const archivePath = path.resolve('/tmp', filename);

	await fs.mkdir(stagingDir, { recursive: true });

	try {
		// 1. Dump SQL
		const sqlPath = path.join(stagingDir, 'database.sql');
		const { sizeBytes: dbSizeBytes, sha256: dbSha256 } = await dumpDatabase(sqlPath);

		// 2. Stats des uploads
		const uploadsStats = await getUploadsStats();

		// 3. Manifeste JSON
		const manifest: BackupManifest = {
			version: '1.0',
			createdAt: new Date().toISOString(),
			instance: {
				url: env.ORIGIN || 'http://localhost:4539'
			},
			stats: {
				databaseSizeBytes: dbSizeBytes,
				uploadsCount: uploadsStats.count,
				uploadsSizeBytes: uploadsStats.sizeBytes
			},
			checksums: {
				databaseSqlSha256: dbSha256
			}
		};

		const manifestPath = path.join(stagingDir, 'manifest.json');
		await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
		manifest.checksums.manifestSha256 = await calculateFileSha256(manifestPath);

		// 4. Création de l'archive tar.gz
		// S'assure que le dossier UPLOAD_DIR existe
		await fs.mkdir(UPLOAD_DIR, { recursive: true });

		const uploadsParent = path.dirname(UPLOAD_DIR);
		const uploadsBase = path.basename(UPLOAD_DIR);

		const tarCmd = `tar -czf "${archivePath}" -C "${stagingDir}" database.sql manifest.json -C "${uploadsParent}" "${uploadsBase}"`;
		await execAsync(tarCmd);

		const archiveStats = await fs.stat(archivePath);
		manifest.stats.archiveSizeBytes = archiveStats.size;

		const cleanup = async () => {
			try {
				await fs.rm(stagingDir, { recursive: true, force: true });
			} catch {}
			try {
				await fs.unlink(archivePath);
			} catch {}
		};

		return {
			archivePath,
			filename,
			manifest,
			cleanup
		};
	} catch (err) {
		// Nettoyage en cas d'erreur
		try {
			await fs.rm(stagingDir, { recursive: true, force: true });
			await fs.unlink(archivePath);
		} catch {}
		throw err;
	}
}
