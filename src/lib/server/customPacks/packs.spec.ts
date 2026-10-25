import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '$lib/server/db';
import {
	user as userTable,
	emojiSets,
	iconSets,
	userSavedEmojiSets,
	userSavedIconSets,
	posts
} from '$lib/server/db/schema';
import { eq, inArray } from 'drizzle-orm';
import {
	createEmojiSet,
	getUserEmojiLibrary,
	updateEmojiSet,
	toggleActiveEmojiSet,
	toggleSaveEmojiSet,
	publishEmojiSet,
	deleteEmojiSet
} from '$lib/server/emojis';
import {
	createIconSet,
	getUserIconLibrary,
	updateIconSet,
	setActiveIconSet,
	toggleSaveIconSet,
	publishIconSet,
	deleteIconSet
} from '$lib/server/icons';

describe('Packs personnalisés (Emojis & Icônes) : Création, Sélection, Publication, Suppression', () => {
	const suffix = Date.now().toString();
	const creatorId = `test_pack_creator_${suffix}`;
	const consumerId = `test_pack_consumer_${suffix}`;

	beforeAll(async () => {
		const now = new Date();
		await db.insert(userTable).values([
			{
				id: creatorId,
				name: 'Créateur Packs',
				username: `creator_packs_${suffix}`,
				email: `creator_packs_${suffix}@test.local`,
				emailVerified: true,
				createdAt: now,
				updatedAt: now
			},
			{
				id: consumerId,
				name: 'Consommateur Packs',
				username: `consumer_packs_${suffix}`,
				email: `consumer_packs_${suffix}@test.local`,
				emailVerified: true,
				createdAt: now,
				updatedAt: now
			}
		]);
	});

	afterAll(async () => {
		await db.delete(posts).where(inArray(posts.authorId, [creatorId, consumerId]));
		await db
			.delete(userSavedEmojiSets)
			.where(inArray(userSavedEmojiSets.userId, [creatorId, consumerId]));
		await db
			.delete(userSavedIconSets)
			.where(inArray(userSavedIconSets.userId, [creatorId, consumerId]));
		await db.delete(emojiSets).where(inArray(emojiSets.ownerId, [creatorId, consumerId]));
		await db.delete(iconSets).where(inArray(iconSets.ownerId, [creatorId, consumerId]));
		await db.delete(userTable).where(inArray(userTable.id, [creatorId, consumerId]));
	});

	it('gère le cycle de vie complet d’une collection d’émojis (création, sélection, publication, sauvegarde tiers, suppression)', async () => {
		// 1. Création
		const created = await createEmojiSet(creatorId, {
			name: 'Pack Chats Test',
			description: 'Des émojis de chats',
			emojis: [
				{ id: 'em_cat_1', name: 'chat_content', url: '/media/test_cat_1.webp' },
				{ id: 'em_cat_2', name: 'chat_dort', url: '/media/test_cat_2.webp' }
			]
		});

		expect(created.id).toBeTruthy();
		expect(created.name).toBe('Pack Chats Test');
		expect(created.emojis).toHaveLength(2);
		expect(created.isPublished).toBe(false);

		// Vérifier la présence dans la bibliothèque du créateur
		const libAfterCreate = await getUserEmojiLibrary(creatorId);
		expect(libAfterCreate.owned.some((s) => s.id === created.id)).toBe(true);

		// 2. Modification
		const updated = await updateEmojiSet(creatorId, created.id, {
			name: 'Pack Chats Mis à Jour',
			emojis: [
				{ id: 'em_cat_1', name: 'chat_content', url: '/media/test_cat_1.webp' },
				{ id: 'em_cat_2', name: 'chat_dort', url: '/media/test_cat_2.webp' },
				{ id: 'em_cat_3', name: 'chat_joue', url: '/media/test_cat_3.webp' }
			]
		});
		expect(updated.name).toBe('Pack Chats Mis à Jour');
		expect(updated.emojis).toHaveLength(3);

		// 3. Sélection / Activation et Désactivation par le créateur
		const activated = await toggleActiveEmojiSet(creatorId, created.id, true);
		expect(activated.activeEmojiSetIds).toContain(created.id);

		const deactivated = await toggleActiveEmojiSet(creatorId, created.id, false);
		expect(deactivated.activeEmojiSetIds).not.toContain(created.id);

		// 4. Publication
		const published = await publishEmojiSet(creatorId, created.id, 'Découvrez mon pack de chats !');
		expect(published.emojiSet.isPublished).toBe(true);
		expect(published.post.id).toBeTruthy();

		const createdPost = await db.query.posts.findFirst({
			where: eq(posts.id, published.post.id)
		});
		expect(createdPost?.emojiSetId).toBe(created.id);

		// 5. Sauvegarde et sélection par un autre utilisateur
		const savedByConsumer = await toggleSaveEmojiSet(consumerId, created.id);
		expect(savedByConsumer.saved).toBe(true);
		expect(savedByConsumer.isActive).toBe(true);

		const consumerLib = await getUserEmojiLibrary(consumerId);
		expect(consumerLib.saved.some((s) => s.id === created.id)).toBe(true);
		expect(consumerLib.activeEmojiSetIds).toContain(created.id);

		// 6. Suppression par le créateur (soft-delete car référencé par consumer + post)
		const softDeleted = await deleteEmojiSet(creatorId, created.id);
		expect(softDeleted.isDeletedByOwner).toBe(true);

		const creatorLibAfterDelete = await getUserEmojiLibrary(creatorId);
		expect(creatorLibAfterDelete.owned.some((s) => s.id === created.id)).toBe(false);

		// Suppression directe d'un pack non référencé
		const ephemeral = await createEmojiSet(creatorId, {
			name: 'Pack Éphémère',
			emojis: [{ id: 'em_temp_1', name: 'temp', url: '/media/temp.webp' }]
		});
		await deleteEmojiSet(creatorId, ephemeral.id);
		const checkDeleted = await db.query.emojiSets.findFirst({
			where: eq(emojiSets.id, ephemeral.id)
		});
		expect(checkDeleted).toBeUndefined();
	});

	it('gère le cycle de vie complet d’un pack d’icônes (création, sélection, publication, sauvegarde tiers, suppression)', async () => {
		// 1. Création
		const created = await createIconSet(creatorId, {
			name: 'Pack Néo-Pixel',
			description: 'Icônes pixelisées',
			icons: {
				'nav.feed': '/media/icon_feed.webp',
				'action.like': '/media/icon_like.webp'
			},
			fallback: 'lucide'
		});

		expect(created.id).toBeTruthy();
		expect(created.name).toBe('Pack Néo-Pixel');
		expect(Object.keys(created.icons || {})).toHaveLength(2);
		expect(created.isPublished).toBe(false);

		// Vérifier la présence dans la bibliothèque du créateur
		const libAfterCreate = await getUserIconLibrary(creatorId);
		expect(libAfterCreate.owned.some((s) => s.id === created.id)).toBe(true);

		// 2. Modification
		const updated = await updateIconSet(creatorId, created.id, {
			name: 'Pack Néo-Pixel V2',
			icons: {
				'nav.feed': '/media/icon_feed.webp',
				'action.like': '/media/icon_like.webp',
				'nav.chat': '/media/icon_chat.webp'
			}
		});
		expect(updated.name).toBe('Pack Néo-Pixel V2');
		expect(Object.keys(updated.icons || {})).toHaveLength(3);

		// 3. Sélection / Activation et Désactivation
		const activated = await setActiveIconSet(creatorId, created.id);
		expect(activated.activeIconSetId).toBe(created.id);

		const deactivated = await setActiveIconSet(creatorId, null);
		expect(deactivated.activeIconSetId).toBeNull();

		// 4. Publication
		const published = await publishIconSet(creatorId, created.id, 'Mon pack Néo-Pixel !');
		expect(published.iconSet.isPublished).toBe(true);
		expect(published.post.id).toBeTruthy();

		const createdIconPost = await db.query.posts.findFirst({
			where: eq(posts.id, published.post.id)
		});
		expect(createdIconPost?.iconSetId).toBe(created.id);

		// 5. Sauvegarde et activation automatique par un autre utilisateur
		const savedByConsumer = await toggleSaveIconSet(consumerId, created.id);
		expect(savedByConsumer.saved).toBe(true);
		expect(savedByConsumer.isActive).toBe(true);

		const consumerLib = await getUserIconLibrary(consumerId);
		expect(consumerLib.saved.some((s) => s.id === created.id)).toBe(true);
		expect(consumerLib.activeIconSetId).toBe(created.id);

		// 6. Suppression par le créateur (soft-delete car référencé)
		const softDeleted = await deleteIconSet(creatorId, created.id);
		expect(softDeleted.isDeletedByOwner).toBe(true);

		const creatorLibAfterDelete = await getUserIconLibrary(creatorId);
		expect(creatorLibAfterDelete.owned.some((s) => s.id === created.id)).toBe(false);

		// Suppression directe d'un pack d'icônes non référencé
		const ephemeral = await createIconSet(creatorId, {
			name: 'Icônes Éphémères',
			icons: { 'nav.feed': '/media/temp_icon.webp' }
		});
		await deleteIconSet(creatorId, ephemeral.id);
		const checkDeleted = await db.query.iconSets.findFirst({
			where: eq(iconSets.id, ephemeral.id)
		});
		expect(checkDeleted).toBeUndefined();
	});
});
