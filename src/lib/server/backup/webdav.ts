/**
 * @module server/backup/webdav
 * @description Client HTTP WebDAV pour les sauvegardes automatisées dans le cloud (Nextcloud, kDrive, pCloud, etc.).
 * Chaque sauvegarde est stockée dans son propre sous-dossier dédié, permettant une organisation limpide,
 * un découpage anti-413 Nginx facile à importer, et une purge unitaire atomique.
 */

import { createReadStream } from 'node:fs';
import { stat, readdir, unlink } from 'node:fs/promises';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { Readable } from 'node:stream';
import path from 'node:path';
import type { BackupConfigItem } from './config';

const execAsync = promisify(exec);

/**
 * Construit le header d'authentification Basic.
 */
function getAuthHeader(user: string, pass: string): string {
	const credentials = Buffer.from(`${user}:${pass}`).toString('base64');
	return `Basic ${credentials}`;
}

/**
 * Normalise l'URL du dossier WebDAV en s'assurant qu'elle se termine par un slash.
 */
function normalizeWebdavFolderUrl(rawUrl: string): string {
	const trimmed = rawUrl.trim();
	return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
}

/**
 * Crée un dossier distant sur le serveur WebDAV via MKCOL.
 */
async function ensureRemoteFolder(folderUrl: string, auth: string): Promise<void> {
	const res = await fetch(folderUrl, {
		method: 'MKCOL',
		headers: { Authorization: auth }
	});
	// 201 Created ou 405 Method Not Allowed (si le dossier existe déjà) sont acceptés
	if (!res.ok && res.status !== 201 && res.status !== 405) {
		const text = await res.text().catch(() => '');
		console.warn(`MKCOL warning sur ${folderUrl} (${res.status}): ${text.slice(0, 100)}`);
	}
}

/**
 * Teste la connexion, l'existence du dossier racine et l'écriture sur le serveur WebDAV distant.
 */
export async function testWebdavConnection(
	url: string,
	user: string,
	pass: string
): Promise<{ success: boolean; message: string }> {
	if (!url || !user || !pass) {
		return {
			success: false,
			message: 'Veuillez renseigner l’URL, l’identifiant et le mot de passe WebDAV.'
		};
	}

	try {
		const folderUrl = normalizeWebdavFolderUrl(url);
		const auth = getAuthHeader(user, pass);

		// 1. ÉTAPE 1 : Vérifier l'existence du dossier distant via PROPFIND Depth: 0
		let propfindRes: Response;
		try {
			propfindRes = await fetch(folderUrl, {
				method: 'PROPFIND',
				headers: {
					Authorization: auth,
					Depth: '0',
					'Content-Type': 'application/xml; charset="utf-8"'
				}
			});
		} catch (networkErr) {
			return {
				success: false,
				message: `Impossible de contacter le serveur Cloud : ${
					networkErr instanceof Error ? networkErr.message : String(networkErr)
				}`
			};
		}

		if (propfindRes.status === 404) {
			return {
				success: false,
				message: `Le dossier distant spécifié n'existe pas sur le serveur WebDAV (HTTP 404). Vérifiez le chemin ou créez préalablement le dossier dans votre Cloud.`
			};
		}

		if (propfindRes.status === 401 || propfindRes.status === 403) {
			return {
				success: false,
				message: `Accès refusé par le serveur WebDAV (HTTP ${propfindRes.status}). Vérifiez vos identifiants ou utilisez un mot de passe d'application dédié.`
			};
		}

		if (propfindRes.status === 405) {
			return {
				success: false,
				message: `Méthode non autorisée (HTTP 405). L'URL indiquée ne semble pas pointer vers un point d'accès WebDAV valide.`
			};
		}

		// 2. ÉTAPE 2 : Test d'écriture PUT d'un fichier témoin
		const testFilename = `.social-backup-check-${Date.now()}.txt`;
		const testFileUrl = `${folderUrl}${testFilename}`;

		const putRes = await fetch(testFileUrl, {
			method: 'PUT',
			headers: {
				Authorization: auth,
				'Content-Type': 'text/plain'
			},
			body: 'Vérification de connexion Social'
		});

		if (putRes.status === 404 || putRes.status === 409) {
			return {
				success: false,
				message: `Impossible d'écrire dans le dossier distant (HTTP ${putRes.status}). Le dossier parent ou le dossier cible n'existe pas.`
			};
		}

		if (putRes.status === 413) {
			return {
				success: false,
				message: `Le serveur WebDAV a rejeté la requête (HTTP 413 Request Entity Too Large).`
			};
		}

		if (!putRes.ok && putRes.status !== 201 && putRes.status !== 204) {
			const text = await putRes.text().catch(() => '');
			return {
				success: false,
				message: `Échec d'écriture WebDAV (HTTP ${putRes.status} ${putRes.statusText}) : ${text.slice(0, 150)}`
			};
		}

		// 3. ÉTAPE 3 : Nettoyage DELETE du fichier témoin
		await fetch(testFileUrl, {
			method: 'DELETE',
			headers: { Authorization: auth }
		}).catch(() => {});

		return {
			success: true,
			message: 'Connexion WebDAV réussie ! Le dossier existe et les droits d’écriture sont validés.'
		};
	} catch (err) {
		return {
			success: false,
			message: `Erreur inattendue de test WebDAV : ${err instanceof Error ? err.message : String(err)}`
		};
	}
}

/**
 * Téléverse un fichier unique vers une URL distante.
 */
async function uploadSingleFileToWebdav(
	filePath: string,
	targetUrl: string,
	auth: string
): Promise<void> {
	const fileStat = await stat(filePath);
	const nodeStream = createReadStream(filePath);
	const webStream = Readable.toWeb(nodeStream);

	const res = await fetch(targetUrl, {
		method: 'PUT',
		headers: {
			Authorization: auth,
			'Content-Type': 'application/octet-stream',
			'Content-Length': fileStat.size.toString()
		},
		body: webStream as unknown as BodyInit,
		// @ts-expect-error duplex option pour fetch streaming Node
		duplex: 'half'
	});

	if (res.status === 413) {
		throw new Error(
			`Échec upload WebDAV (HTTP 413 Request Entity Too Large) : le serveur Nginx ou proxy de votre Cloud refuse les fichiers de cette taille (${(
				fileStat.size /
				(1024 * 1024)
			).toFixed(
				1
			)} Mo). Solution : activez l'option "Découpage en fragments" (ex: 5 Mo ou 10 Mo) dans la configuration des sauvegardes.`
		);
	}

	if (!res.ok && res.status !== 201 && res.status !== 204) {
		const text = await res.text().catch(() => '');
		throw new Error(`Échec upload WebDAV HTTP ${res.status}: ${text.slice(0, 200)}`);
	}
}

/**
 * Téléverse une archive locale sur le serveur WebDAV distant dans un NOUVEAU sous-dossier dédié.
 * Si le découpage en fragments (chunkSizeMb) est configuré, tous les fragments sont regroupés dans ce sous-dossier.
 */
export async function uploadBackupToWebdav(
	archivePath: string,
	filename: string,
	config: BackupConfigItem
): Promise<{ partsCount: number; destinationFolder: string }> {
	if (!config.webdavUrl || !config.webdavUsername || !config.webdavPassword) {
		throw new Error('Paramètres de connexion WebDAV incomplets.');
	}

	const baseFolderUrl = normalizeWebdavFolderUrl(config.webdavUrl);
	const auth = getAuthHeader(config.webdavUsername, config.webdavPassword);

	// 1. Détermination du nom de dossier dédié pour ce snapshot
	// Ex: social-backup-2026-10-25T17-10-00-000Z
	const backupFolderName = filename.replace(/\.(tar\.gz|tar\.gz\.enc)$/, '');
	const backupFolderUrl = `${baseFolderUrl}${backupFolderName}/`;

	// 2. Création du dossier dédié sur le serveur WebDAV
	await ensureRemoteFolder(backupFolderUrl, auth);

	const fileStat = await stat(archivePath);
	const chunkLimitBytes = (config.chunkSizeMb || 0) * 1024 * 1024;

	// 3. Découpage en fragments si activé et nécessaire
	if (chunkLimitBytes > 0 && fileStat.size > chunkLimitBytes) {
		const splitPrefix = `${archivePath}.part-`;
		await execAsync(`split -b ${config.chunkSizeMb}M -d "${archivePath}" "${splitPrefix}"`);

		const parentDir = path.dirname(archivePath);
		const basePrefix = path.basename(splitPrefix);
		const entries = await readdir(parentDir);
		const partFiles = entries.filter((f) => f.startsWith(basePrefix)).sort();

		if (partFiles.length === 0) {
			throw new Error('Échec de la génération des fragments de sauvegarde.');
		}

		try {
			for (const partName of partFiles) {
				const partPath = path.join(parentDir, partName);
				const partSuffix = partName.substring(basePrefix.length);
				const remotePartFilename = `${filename}.part${partSuffix}`;
				await uploadSingleFileToWebdav(partPath, `${backupFolderUrl}${remotePartFilename}`, auth);
			}

			return { partsCount: partFiles.length, destinationFolder: backupFolderName };
		} finally {
			for (const partName of partFiles) {
				await unlink(path.join(parentDir, partName)).catch(() => {});
			}
		}
	}

	// 4. Téléversement en fichier unique dans le sous-dossier
	await uploadSingleFileToWebdav(archivePath, `${backupFolderUrl}${filename}`, auth);
	return { partsCount: 1, destinationFolder: backupFolderName };
}

export interface RemoteBackupFolder {
	folderUrl: string;
	folderName: string;
	lastModified: Date;
}

/**
 * Liste les dossiers de sauvegarde présents sur le serveur WebDAV et purge les plus anciens dossiers
 * selon le nombre de rétention configuré.
 */
export async function pruneWebdavBackups(config: BackupConfigItem): Promise<{
	remainingCount: number;
	deletedCount: number;
}> {
	if (!config.webdavUrl || !config.webdavUsername || !config.webdavPassword) {
		return { remainingCount: 0, deletedCount: 0 };
	}

	const baseFolderUrl = normalizeWebdavFolderUrl(config.webdavUrl);
	const auth = getAuthHeader(config.webdavUsername, config.webdavPassword);

	// 1. Lister le contenu du dossier parent via PROPFIND Depth: 1
	const propfindRes = await fetch(baseFolderUrl, {
		method: 'PROPFIND',
		headers: {
			Authorization: auth,
			Depth: '1',
			'Content-Type': 'application/xml; charset="utf-8"'
		}
	});

	if (!propfindRes.ok) {
		console.warn(`Impossible de lister le dossier WebDAV (HTTP ${propfindRes.status})`);
		return { remainingCount: 0, deletedCount: 0 };
	}

	const xml = await propfindRes.text();

	// 2. Extraire les dossiers de sauvegarde commençant par social-backup-
	const folders: RemoteBackupFolder[] = [];
	const responseBlocks = xml.split(/<\/(?:[a-zA-Z0-9]+:)?response>/i);

	for (const block of responseBlocks) {
		const hrefMatch = block.match(/<(?:[a-zA-Z0-9]+:)?href>([^<]+)<\/(?:[a-zA-Z0-9]+:)?href>/i);
		if (!hrefMatch) continue;

		const href = decodeURIComponent(hrefMatch[1]);
		const cleanHref = href.endsWith('/') ? href.slice(0, -1) : href;
		const folderName = cleanHref.split('/').filter(Boolean).pop() || '';

		if (folderName.startsWith('social-backup-')) {
			const dateMatch = block.match(
				/<(?:[a-zA-Z0-9]+:)?getlastmodified>([^<]+)<\/(?:[a-zA-Z0-9]+:)?getlastmodified>/i
			);
			const lastModified = dateMatch ? new Date(dateMatch[1]) : new Date(0);

			folders.push({
				folderUrl: new URL(href, baseFolderUrl).toString(),
				folderName,
				lastModified
			});
		}
	}

	// Tri par date décroissante (les plus récents en premier)
	folders.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

	const retention = Math.max(1, config.retentionCount || 7);
	let deletedCount = 0;

	if (folders.length > retention) {
		const toDelete = folders.slice(retention);
		for (const folder of toDelete) {
			try {
				const delRes = await fetch(folder.folderUrl, {
					method: 'DELETE',
					headers: { Authorization: auth }
				});
				if (delRes.ok) {
					deletedCount++;
				}
			} catch (delErr) {
				console.warn(`Erreur lors de la suppression distante de ${folder.folderName}:`, delErr);
			}
		}
	}

	return {
		remainingCount: Math.min(folders.length, retention),
		deletedCount
	};
}
