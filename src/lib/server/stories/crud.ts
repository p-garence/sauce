/**
 * @module server/stories/crud
 * @description Création, mise à jour, suppression et nettoyage automatique des stories.
 */

import { db } from '$lib/server/db';
import { stories } from '$lib/server/db/schema';
import { and, eq, lt } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import {
	saveUploadedFile,
	deleteMediaFiles,
	getUserMediaUsage,
	formatBytes
} from '$lib/server/media';
import { assertGroupOwner } from '$lib/server/permissions';
import type { StoryItem, PostVisibility } from '$lib/types';

/**
 * Crée et enregistre une nouvelle story avec expiration paramétrable (24h, 48h, personnalisée, jamais).
 *
 * @param params Paramètres de création de la story
 * @returns La story créée
 */
export async function createStory(params: {
	authorId: string;
	file: File;
	caption?: string;
	visibility?: PostVisibility;
	groupId?: string;
	duration?: '24h' | '48h' | 'custom' | 'never';
	customHours?: number;
	isArchived?: boolean;
}): Promise<StoryItem> {
	const {
		authorId,
		file,
		caption,
		visibility = 'public',
		groupId,
		duration = '24h',
		customHours = 72,
		isArchived = true
	} = params;

	if (visibility === 'group' && groupId) {
		await assertGroupOwner(authorId, groupId);
	}

	const usage = await getUserMediaUsage(authorId);
	if (usage.totalBytes + (file.size || 0) > usage.quotaBytes) {
		const remaining = Math.max(0, usage.quotaBytes - usage.totalBytes);
		throw error(413, `Quota de stockage dépassé. Espace restant : ${formatBytes(remaining)}.`);
	}

	const saved = await saveUploadedFile(file);

	let expiresAt: Date;
	if (duration === 'never') {
		// Année 9999 pour marquer une story permanente qui n'expire jamais
		expiresAt = new Date('9999-12-31T23:59:59.999Z');
	} else if (duration === '48h') {
		expiresAt = new Date(Date.now() + 48 * 3600 * 1000);
	} else if (duration === 'custom') {
		const hours = Math.max(1, customHours || 72);
		expiresAt = new Date(Date.now() + hours * 3600 * 1000);
	} else {
		// Par défaut 24h
		expiresAt = new Date(Date.now() + 24 * 3600 * 1000);
	}

	const [created] = await db
		.insert(stories)
		.values({
			authorId,
			mediaUrl: saved.content,
			mediaType: saved.type === 'video' ? 'video' : 'image',
			caption: caption || null,
			visibility,
			groupId: visibility === 'group' ? groupId || null : null,
			isArchived,
			expiresAt
		})
		.returning();

	return {
		id: created.id,
		authorId: created.authorId,
		mediaUrl: created.mediaUrl,
		mediaType: created.mediaType as 'image' | 'video',
		caption: created.caption,
		visibility: created.visibility,
		groupId: created.groupId,
		viewsCount: created.viewsCount,
		likesCount: 0,
		isArchived: created.isArchived ?? true,
		expiresAt: created.expiresAt.toISOString(),
		createdAt: created.createdAt.toISOString(),
		isViewed: true,
		isLiked: false
	};
}

/**
 * Supprime une story (par son auteur) et libère son fichier (et son poster vidéo) sur le disque.
 *
 * @param storyId Identifiant de la story
 * @param userId Identifiant de l'auteur
 * @returns `true` si la story a été supprimée, `false` sinon
 */
export async function deleteStory(storyId: string, userId: string): Promise<boolean> {
	const existing = await db.query.stories.findFirst({
		where: eq(stories.id, storyId)
	});
	if (!existing) return false;
	if (existing.authorId !== userId) return false;

	await db.delete(stories).where(eq(stories.id, storyId));

	if (existing.mediaUrl) {
		await deleteMediaFiles([
			{
				type: existing.mediaType === 'video' ? 'video' : 'image',
				content: existing.mediaUrl
			}
		]);
	}

	return true;
}

/**
 * Nettoyage des stories expirées qui NE SONT PAS archivées.
 * Les stories avec isArchived = true sont conservées dans les médias de l'utilisateur.
 *
 * @returns Nombre de stories supprimées
 */
export async function cleanupExpiredStories(): Promise<number> {
	const now = new Date();
	try {
		const deleted = await db
			.delete(stories)
			.where(and(lt(stories.expiresAt, now), eq(stories.isArchived, false)))
			.returning({
				id: stories.id,
				mediaUrl: stories.mediaUrl,
				mediaType: stories.mediaType
			});

		if (deleted.length > 0) {
			await deleteMediaFiles(
				deleted
					.filter((s) => Boolean(s.mediaUrl))
					.map((s) => ({
						type: s.mediaType === 'video' ? ('video' as const) : ('image' as const),
						content: s.mediaUrl
					}))
			);
		}

		return deleted.length;
	} catch (e) {
		console.warn('Erreur cleanupExpiredStories:', e);
		return 0;
	}
}

/**
 * Modifie les paramètres d'une story (visibilité, groupe, archivage, durée d'affichage/expiration).
 *
 * @param storyId Identifiant de la story
 * @param authorId Identifiant de l'auteur
 * @param updates Champs à mettre à jour
 */
export async function updateStory(
	storyId: string,
	authorId: string,
	updates: {
		visibility?: PostVisibility;
		groupId?: string | null;
		isArchived?: boolean;
		duration?: '24h' | '48h' | 'custom' | 'never' | 'keep';
		customHours?: number;
		expiresAt?: Date | string;
	}
): Promise<{ success: boolean; story?: typeof stories.$inferSelect; message?: string }> {
	try {
		const [existing] = await db
			.select()
			.from(stories)
			.where(and(eq(stories.id, storyId), eq(stories.authorId, authorId)));

		if (!existing) {
			return { success: false, message: 'Story introuvable ou non autorisée' };
		}

		const setPayload: Partial<typeof stories.$inferInsert> = {};

		if (updates.visibility !== undefined) {
			setPayload.visibility = updates.visibility;
			if (updates.visibility === 'group') {
				if (updates.groupId) {
					await assertGroupOwner(authorId, updates.groupId);
				}
				setPayload.groupId = updates.groupId || null;
			} else {
				setPayload.groupId = null;
			}
		}

		if (updates.isArchived !== undefined) {
			setPayload.isArchived = updates.isArchived;
		}

		if (updates.duration && updates.duration !== 'keep') {
			if (updates.duration === 'never') {
				setPayload.expiresAt = new Date('9999-12-31T23:59:59.999Z');
			} else if (updates.duration === '48h') {
				setPayload.expiresAt = new Date(Date.now() + 48 * 3600 * 1000);
			} else if (updates.duration === 'custom') {
				const hours = Math.max(1, updates.customHours || 72);
				setPayload.expiresAt = new Date(Date.now() + hours * 3600 * 1000);
			} else if (updates.duration === '24h') {
				setPayload.expiresAt = new Date(Date.now() + 24 * 3600 * 1000);
			}
		} else if (updates.expiresAt) {
			setPayload.expiresAt = new Date(updates.expiresAt);
		}

		const [updated] = await db
			.update(stories)
			.set(setPayload)
			.where(eq(stories.id, storyId))
			.returning();

		return { success: true, story: updated };
	} catch (e) {
		console.error('Erreur updateStory:', e);
		return { success: false, message: 'Erreur interne lors de la mise à jour' };
	}
}
