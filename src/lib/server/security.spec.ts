import { describe, it, expect } from 'vitest';
import { extractMediaFilenames } from '$lib/server/media';
import { canSeePost } from '$lib/server/posts';
import { publishPost } from '$lib/server/posts/publish';
import { createUserGroup, updateUserGroup } from '$lib/server/groups';

describe('Security & Authorization Validation', () => {
	describe('Media & Filename Sanitization', () => {
		it('extracts clean filenames from various text formats', () => {
			const text =
				'Regarde cette image : /media/sample_123.webp et cette vidéo /media/clip-456.mp4?v=2#test';
			const extracted = extractMediaFilenames(text);
			expect(extracted).toContain('sample_123.webp');
			expect(extracted).toContain('clip-456.mp4');
		});

		it('safely handles empty, null or undefined input', () => {
			expect(extractMediaFilenames(null)).toEqual([]);
			expect(extractMediaFilenames(undefined)).toEqual([]);
			expect(extractMediaFilenames('')).toEqual([]);
		});

		it('strips directory traversal patterns in direct paths', () => {
			const extracted = extractMediaFilenames('../../../etc/passwd.webp');
			expect(extracted).toEqual(['passwd.webp']);
		});
	});

	describe('Post Creation & Visibility Security Constraints', () => {
		it('rejects post creation with invalid visibility value', async () => {
			await expect(
				publishPost({
					authorId: '00000000-0000-0000-0000-000000000001',
					caption: 'Tentative invalide',
					visibility: 'unauthorized_visibility' as any,
					layout: [{ type: 'text', text: 'Hello' }],
					files: []
				})
			).rejects.toThrow('Problème avec la visibilité');
		});

		it('rejects group visibility if groupId is omitted', async () => {
			await expect(
				publishPost({
					authorId: '00000000-0000-0000-0000-000000000001',
					caption: 'Post sans groupe',
					visibility: 'group',
					groupId: null,
					layout: [{ type: 'text', text: 'Hello' }],
					files: []
				})
			).rejects.toThrow('Veuillez spécifier un groupe valide');
		});

		it('rejects empty layout', async () => {
			await expect(
				publishPost({
					authorId: '00000000-0000-0000-0000-000000000001',
					caption: null,
					visibility: 'public',
					layout: [],
					files: []
				})
			).rejects.toThrow('Le post ne peut pas être vide.');
		});
	});

	describe('Group Ownership & Validation Rules', () => {
		it('rejects empty group names during creation', async () => {
			await expect(
				createUserGroup({
					ownerId: '00000000-0000-0000-0000-000000000001',
					name: '   '
				})
			).rejects.toThrow('Le nom du groupe est requis');
		});

		it('rejects names exceeding 50 characters', async () => {
			await expect(
				createUserGroup({
					ownerId: '00000000-0000-0000-0000-000000000001',
					name: 'a'.repeat(51)
				})
			).rejects.toThrow('Nom trop long');
		});

		it('rejects update with empty name', async () => {
			await expect(
				updateUserGroup({
					groupId: 'group-1',
					ownerId: '00000000-0000-0000-0000-000000000001',
					name: ''
				})
			).rejects.toThrow('Le nom du groupe est requis');
		});
	});

	describe('SQL Visibility Query Generator', () => {
		it('generates SQL clause safely for guest viewer (null / undefined)', () => {
			const guestSql = canSeePost(null);
			expect(guestSql).toBeDefined();

			const undefSql = canSeePost(undefined);
			expect(undefSql).toBeDefined();
		});

		it('generates SQL clause safely for logged-in viewer ID', () => {
			const userSql = canSeePost('00000000-0000-0000-0000-000000000001');
			expect(userSql).toBeDefined();
		});
	});
});
