import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { isBackupDue } from './scheduler';
import { testWebdavConnection } from './webdav';
import {
	generateBackupKey,
	isValidBackupKey,
	encryptBackupArchive,
	decryptBackupArchive
} from './crypto';

describe('Backup system', () => {
	describe('Crypto AES-256-GCM', () => {
		it('generates a valid 256-bit hexadecimal key (64 characters)', () => {
			const key = generateBackupKey();
			expect(key).toHaveLength(64);
			expect(isValidBackupKey(key)).toBe(true);
		});

		it('rejects invalid keys', () => {
			expect(isValidBackupKey('')).toBe(false);
			expect(isValidBackupKey('tropcourt')).toBe(false);
			expect(isValidBackupKey('z'.repeat(64))).toBe(false); // non-hex
		});

		it('encrypts and decrypts a file with perfect byte-for-byte fidelity', async () => {
			const key = generateBackupKey();
			const originalPath = path.resolve('/tmp', `test_orig_${Date.now()}.txt`);
			const encryptedPath = path.resolve('/tmp', `test_enc_${Date.now()}.bin`);
			const decryptedPath = path.resolve('/tmp', `test_dec_${Date.now()}.txt`);

			const testContent = 'Contenu secret ultra important de test de sauvegarde 1234567890 !';
			await fs.writeFile(originalPath, testContent, 'utf-8');

			try {
				await encryptBackupArchive(originalPath, encryptedPath, key);
				await decryptBackupArchive(encryptedPath, decryptedPath, key);

				const decryptedContent = await fs.readFile(decryptedPath, 'utf-8');
				expect(decryptedContent).toBe(testContent);
			} finally {
				await fs.unlink(originalPath).catch(() => {});
				await fs.unlink(encryptedPath).catch(() => {});
				await fs.unlink(decryptedPath).catch(() => {});
			}
		});

		it('fails to decrypt if the wrong key is provided', async () => {
			const key1 = generateBackupKey();
			const key2 = generateBackupKey();

			const originalPath = path.resolve('/tmp', `test_key1_${Date.now()}.txt`);
			const encryptedPath = path.resolve('/tmp', `test_key1_${Date.now()}.bin`);
			const decryptedPath = path.resolve('/tmp', `test_key1_dec_${Date.now()}.txt`);

			await fs.writeFile(originalPath, 'Top secret', 'utf-8');

			try {
				await encryptBackupArchive(originalPath, encryptedPath, key1);
				await expect(decryptBackupArchive(encryptedPath, decryptedPath, key2)).rejects.toThrow();
			} finally {
				await fs.unlink(originalPath).catch(() => {});
				await fs.unlink(encryptedPath).catch(() => {});
				await fs.unlink(decryptedPath).catch(() => {});
			}
		});

		it('assembles parts in correct natural numeric order even when disordered', async () => {
			const { assembleBackupParts } = await import('./import');
			const part0Path = path.resolve('/tmp', `test_part00_${Date.now()}.bin`);
			const part1Path = path.resolve('/tmp', `test_part01_${Date.now()}.bin`);
			const part2Path = path.resolve('/tmp', `test_part02_${Date.now()}.bin`);
			const combinedPath = path.resolve('/tmp', `test_combined_${Date.now()}.bin`);

			await fs.writeFile(part0Path, 'AAAAA', 'utf-8');
			await fs.writeFile(part1Path, 'BBBBB', 'utf-8');
			await fs.writeFile(part2Path, 'CCCCC', 'utf-8');

			try {
				// Ordre volontairement inversé dans le tableau
				await assembleBackupParts(
					[
						{ filepath: part2Path, originalFilename: 'backup.part02' },
						{ filepath: part0Path, originalFilename: 'backup.part00' },
						{ filepath: part1Path, originalFilename: 'backup.part01' }
					],
					combinedPath
				);

				const combinedContent = await fs.readFile(combinedPath, 'utf-8');
				expect(combinedContent).toBe('AAAAABBBBBCCCCC');
			} finally {
				await fs.unlink(part0Path).catch(() => {});
				await fs.unlink(part1Path).catch(() => {});
				await fs.unlink(part2Path).catch(() => {});
				await fs.unlink(combinedPath).catch(() => {});
			}
		});

		it('extracts and inspects manifest.json correctly from a tar.gz archive', async () => {
			const { inspectBackupArchive } = await import('./import');
			const testDir = path.resolve('/tmp', `test_inspect_archive_${Date.now()}`);
			const archivePath = path.resolve('/tmp', `test_archive_${Date.now()}.tar.gz`);

			await fs.mkdir(testDir, { recursive: true });
			const sampleManifest = {
				version: '1.0',
				createdAt: new Date().toISOString(),
				instance: { url: 'http://test-social.local' },
				stats: { databaseSizeBytes: 12345, uploadsCount: 42, uploadsSizeBytes: 67890 },
				checksums: { databaseSqlSha256: 'dummy' }
			};
			await fs.writeFile(
				path.join(testDir, 'manifest.json'),
				JSON.stringify(sampleManifest),
				'utf-8'
			);

			const { exec } = await import('node:child_process');
			const { promisify } = await import('node:util');
			const execAsync = promisify(exec);

			await execAsync(`tar -czf "${archivePath}" -C "${testDir}" manifest.json`);

			try {
				const inspected = await inspectBackupArchive(archivePath);
				expect(inspected.version).toBe('1.0');
				expect(inspected.instance.url).toBe('http://test-social.local');
				expect(inspected.stats.databaseSizeBytes).toBe(12345);
			} finally {
				await fs.rm(testDir, { recursive: true, force: true }).catch(() => {});
				await fs.unlink(archivePath).catch(() => {});
			}
		});
	});

	describe('Scheduler isBackupDue', () => {
		const baseConfig = {
			id: 'test-config',
			name: 'Sauvegarde Test',
			chunkSizeMb: 10,
			updatedAt: new Date()
		};

		it('returns false when backup is disabled', () => {
			const config = {
				...baseConfig,
				enabled: false,
				webdavUrl: 'https://cloud.exemple.com/dav',
				webdavUsername: 'user',
				webdavPassword: 'pwd',
				frequency: 'daily' as const,
				retentionCount: 7,
				encryptionKey: generateBackupKey(),
				lastRunAt: null,
				lastRunStatus: null,
				lastRunError: null
			};
			expect(isBackupDue(config)).toBe(false);
		});

		it('returns false when frequency is manual', () => {
			const config = {
				...baseConfig,
				enabled: true,
				webdavUrl: 'https://cloud.exemple.com/dav',
				webdavUsername: 'user',
				webdavPassword: 'pwd',
				frequency: 'manual' as const,
				retentionCount: 7,
				encryptionKey: generateBackupKey(),
				lastRunAt: null,
				lastRunStatus: null,
				lastRunError: null
			};
			expect(isBackupDue(config)).toBe(false);
		});

		it('returns true when enabled and never run', () => {
			const config = {
				...baseConfig,
				enabled: true,
				webdavUrl: 'https://cloud.exemple.com/dav',
				webdavUsername: 'user',
				webdavPassword: 'pwd',
				frequency: 'daily' as const,
				retentionCount: 7,
				encryptionKey: generateBackupKey(),
				lastRunAt: null,
				lastRunStatus: null,
				lastRunError: null
			};
			expect(isBackupDue(config)).toBe(true);
		});

		it('returns false if daily run was recent (< 24h)', () => {
			const recentDate = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
			const config = {
				...baseConfig,
				enabled: true,
				webdavUrl: 'https://cloud.exemple.com/dav',
				webdavUsername: 'user',
				webdavPassword: 'pwd',
				frequency: 'daily' as const,
				retentionCount: 7,
				encryptionKey: generateBackupKey(),
				lastRunAt: recentDate,
				lastRunStatus: 'success' as const,
				lastRunError: null
			};
			expect(isBackupDue(config)).toBe(false);
		});

		it('returns true if daily run was > 24h ago', () => {
			const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
			const config = {
				...baseConfig,
				enabled: true,
				webdavUrl: 'https://cloud.exemple.com/dav',
				webdavUsername: 'user',
				webdavPassword: 'pwd',
				frequency: 'daily' as const,
				retentionCount: 7,
				encryptionKey: generateBackupKey(),
				lastRunAt: oldDate,
				lastRunStatus: 'success' as const,
				lastRunError: null
			};
			expect(isBackupDue(config)).toBe(true);
		});
	});

	describe('WebDAV test connection', () => {
		beforeEach(() => {
			vi.restoreAllMocks();
		});

		it('handles successful PROPFIND, PUT and DELETE', async () => {
			const fetchMock = vi.fn().mockImplementation((url, opts) => {
				if (opts?.method === 'PROPFIND') {
					return Promise.resolve({
						ok: true,
						status: 207,
						text: async () => ''
					});
				}
				return Promise.resolve({
					ok: true,
					status: 201,
					text: async () => ''
				});
			});
			global.fetch = fetchMock;

			const result = await testWebdavConnection(
				'https://cloud.exemple.com/dav',
				'testuser',
				'testpass'
			);

			expect(result.success).toBe(true);
			expect(result.message).toContain('Connexion WebDAV réussie');
		});

		it('detects when the remote folder does not exist (404)', async () => {
			const fetchMock = vi.fn().mockResolvedValue({
				ok: false,
				status: 404,
				statusText: 'Not Found',
				text: async () => 'File not found'
			});
			global.fetch = fetchMock;

			const result = await testWebdavConnection(
				'https://cloud.exemple.com/dav/dossier-inexistant/',
				'testuser',
				'testpass'
			);

			expect(result.success).toBe(false);
			expect(result.message).toContain('HTTP 404');
			expect(result.message).toContain("n'existe pas");
		});

		it('handles server authentication refusal gracefully (401)', async () => {
			const fetchMock = vi.fn().mockResolvedValue({
				ok: false,
				status: 401,
				statusText: 'Unauthorized',
				text: async () => 'Invalid credentials'
			});
			global.fetch = fetchMock;

			const result = await testWebdavConnection(
				'https://cloud.exemple.com/dav',
				'wronguser',
				'wrongpass'
			);

			expect(result.success).toBe(false);
			expect(result.message).toContain('401');
		});
	});
});
