/**
 * @module server/admin
 * @description Opérations d'administration (utilisateurs, bannissement, quotas, modération des posts/stories).
 */

import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import {
	user,
	posts,
	comments,
	instances,
	session,
	stories,
	messages
} from '$lib/server/db/schema';
import { eq, or, sql, count, lt, and, type SQL } from 'drizzle-orm';
import { deleteMediaFiles } from '$lib/server/media';
import { canSeePost } from '$lib/server/posts';
import { canSeeStory } from '$lib/server/stories';
import type { CursorData } from '$lib/server/cursor';
import type { CarouselItem } from '$lib/types';

export const SYSTEM_USER_ID = 'server-system-user';
export const SYSTEM_USER_USERNAME = 'serveur';

/**
 * Garantit l'existence de l'utilisateur système "Le serveur" en base de données.
 */
export async function ensureSystemUser() {
	const existing = await db.query.user.findFirst({
		where: or(eq(user.id, SYSTEM_USER_ID), eq(user.username, SYSTEM_USER_USERNAME))
	});
	let systemUser = existing;
	if (!systemUser) {
		const [created] = await db
			.insert(user)
			.values({
				id: SYSTEM_USER_ID,
				name: 'Le serveur',
				username: SYSTEM_USER_USERNAME,
				email: 'server@system.local',
				role: 'admin',
				bio: 'Compte officiel des annonces et informations système du serveur.'
			})
			.onConflictDoUpdate({
				target: user.id,
				set: {
					name: 'Le serveur',
					username: SYSTEM_USER_USERNAME
				}
			})
			.returning();
		systemUser = created;
	}

	// Aligner les posts système existants avec le compte serveur
	await db
		.update(posts)
		.set({ authorId: SYSTEM_USER_ID })
		.where(and(eq(posts.isSystem, true), sql`${posts.authorId} != ${SYSTEM_USER_ID}`))
		.catch(() => {});

	return systemUser;
}

/**
 * Ensure the requesting user has the admin role.
 */
export function assertAdmin(
	currentUser?: { id: string; role?: string | null } | null
): asserts currentUser is { id: string; role: 'admin' } {
	if (!currentUser || currentUser.role !== 'admin') {
		throw error(403, 'Accès interdit : privilèges administrateur requis.');
	}
}

/**
 * Fetch all users with their inviter details for the admin console.
 */
export async function getAdminUsers() {
	return db.query.user.findMany({
		with: {
			inviter: {
				columns: { username: true }
			}
		},
		orderBy: (users, { desc }) => [desc(users.createdAt)]
	});
}

/**
 * Toggle or set ban status of a user.
 */
export async function toggleUserBan(adminUserId: string, targetUserId: string, isBanned?: boolean) {
	if (adminUserId === targetUserId) {
		throw new Error('Impossible de modifier le statut de ban de son propre compte.');
	}

	const targetUser = await db.query.user.findFirst({
		where: eq(user.id, targetUserId)
	});

	if (!targetUser) throw new Error('Utilisateur introuvable.');

	const newBanStatus = typeof isBanned === 'boolean' ? isBanned : !targetUser.isBanned;

	await db.update(user).set({ isBanned: newBanStatus }).where(eq(user.id, targetUserId));

	// Si l'utilisateur est banni, on invalide toutes ses sessions actives
	if (newBanStatus) {
		await db.delete(session).where(eq(session.userId, targetUserId));
	}

	return { success: true, userId: targetUserId, isBanned: newBanStatus };
}

/**
 * Update user role (e.g. promote to admin).
 */
export async function updateUserRole(adminUserId: string, targetUserId: string, role: string) {
	if (role !== 'admin' && role !== 'user') {
		throw new Error('Rôle non valide.');
	}

	await db.update(user).set({ role }).where(eq(user.id, targetUserId));
	return { success: true, userId: targetUserId, role };
}

/**
 * Delete a user and cascade all their data including disk media.
 */
export async function deleteUserByAdmin(adminUserId: string, targetUserId: string) {
	if (adminUserId === targetUserId) {
		throw new Error('Impossible de supprimer son propre compte depuis le panneau admin.');
	}

	const mediaToDelete: Array<CarouselItem | { type: string; content: string }> = [];

	// 1. Collecte des fichiers médias du disque associés aux posts de l'utilisateur
	const userPosts = await db.query.posts.findMany({
		where: eq(posts.authorId, targetUserId),
		columns: { mediaUrls: true }
	});
	for (const p of userPosts) {
		const items = (p.mediaUrls as CarouselItem[] | null) || [];
		mediaToDelete.push(...items);
	}

	// 2. Collecte des fichiers médias des stories de l'utilisateur
	const userStories = await db.query.stories.findMany({
		where: eq(stories.authorId, targetUserId),
		columns: { mediaUrl: true, mediaType: true }
	});
	for (const s of userStories) {
		if (s.mediaUrl) {
			mediaToDelete.push({ type: s.mediaType as 'image' | 'video', content: s.mediaUrl });
		}
	}

	// 3. Collecte des fichiers médias des messages de l'utilisateur
	const userMessages = await db.query.messages.findMany({
		where: eq(messages.senderId, targetUserId),
		columns: { mediaUrl: true, mediaType: true }
	});
	for (const m of userMessages) {
		if (m.mediaUrl) {
			mediaToDelete.push({ type: m.mediaType || 'file', content: m.mediaUrl });
		}
	}

	// 4. Collecte de l'avatar si stocké localement
	const targetUser = await db.query.user.findFirst({
		where: eq(user.id, targetUserId),
		columns: { image: true }
	});
	if (targetUser?.image && targetUser.image.startsWith('/media/')) {
		mediaToDelete.push({ type: 'image', content: targetUser.image });
	}

	// 5. Suppression transactionnelle en base de données d'abord
	await db.transaction(async (tx) => {
		await tx.delete(posts).where(eq(posts.authorId, targetUserId));
		await tx.delete(user).where(eq(user.id, targetUserId));
	});

	// 6. Nettoyage physique sur le disque uniquement après validation de la transaction DB
	if (mediaToDelete.length > 0) {
		await deleteMediaFiles(mediaToDelete);
	}

	return { success: true, deletedUserId: targetUserId };
}

/**
 * Update user storage quota in bytes.
 */
export async function updateUserQuota(
	adminUserId: string,
	targetUserId: string,
	quotaBytes: number
) {
	if (quotaBytes < 0) {
		throw new Error('Le quota de stockage ne peut pas être négatif.');
	}

	await db.update(user).set({ storageQuotaBytes: quotaBytes }).where(eq(user.id, targetUserId));
	return { success: true, userId: targetUserId, storageQuotaBytes: quotaBytes };
}

/**
 * Update a user's display name.
 */
export async function updateUserNameByAdmin(
	adminUserId: string,
	targetUserId: string,
	newName: string
) {
	const cleanName = newName.trim();
	if (!cleanName) throw new Error('Le nom ne peut pas être vide.');

	await db.update(user).set({ name: cleanName }).where(eq(user.id, targetUserId));
	return { success: true, userId: targetUserId, name: cleanName };
}

/**
 * Add invitation keys quota to a user.
 */
export async function addInvitesToUser(
	adminUserId: string,
	targetUserId: string,
	amount: number = 5
) {
	await db
		.update(user)
		.set({ maxInvites: sql`${user.maxInvites} + ${amount}` })
		.where(eq(user.id, targetUserId));

	return { success: true, userId: targetUserId, added: amount };
}

/**
 * Retrieve global server statistics.
 */
export async function getAdminStats() {
	const [usersCount] = await db.select({ count: count() }).from(user);
	const [postsCount] = await db.select({ count: count() }).from(posts);
	const [commentsCount] = await db
		.select({ count: count() })
		.from(comments)
		.where(sql`${comments.content} != '[deleted]'`);
	const [instancesCount] = await db.select({ count: count() }).from(instances);
	const [storiesCount] = await db.select({ count: count() }).from(stories);

	return {
		totalUsers: Number(usersCount?.count || 0),
		totalPosts: Number(postsCount?.count || 0),
		totalComments: Number(commentsCount?.count || 0),
		totalInstances: Number(instancesCount?.count || 0),
		totalStories: Number(storiesCount?.count || 0)
	};
}

/**
 * Retrieve posts with cursor pagination and view permission check for admin view.
 */
export async function getAdminPosts(options?: {
	limit?: number;
	cursor?: CursorData | null;
	adminUserId?: string;
}) {
	const limit = options?.limit ?? 25;
	const conditions: (SQL | undefined)[] = [];

	if (options?.cursor && options.cursor.lastValue) {
		const cursorDate = new Date(options.cursor.lastValue as string);
		if (!Number.isNaN(cursorDate.getTime())) {
			conditions.push(lt(posts.createdAt, cursorDate));
		}
	}

	const adminId = options?.adminUserId;
	const where = conditions.length > 0 ? and(...conditions) : undefined;

	const dbPosts = await db.query.posts.findMany({
		where,
		with: {
			author: {
				columns: { id: true, username: true, name: true, image: true }
			}
		},
		extras: {
			canView: adminId
				? sql<boolean>`CASE WHEN (${canSeePost(adminId)}) THEN true ELSE false END`.as('can_view')
				: sql<boolean>`true`.as('can_view')
		},
		orderBy: (postsTable, { desc }) => [desc(postsTable.createdAt)],
		limit
	});

	let nextCursor: CursorData | null = null;
	if (dbPosts.length === limit) {
		const last = dbPosts[dbPosts.length - 1];
		nextCursor = {
			type: 'chrono',
			lastValue: last.createdAt.toISOString(),
			lastId: last.id
		};
	}

	return {
		posts: dbPosts.map((p) => {
			const canView = Boolean(p.canView);
			const basePost = {
				...p,
				content: canView ? p.content : null,
				mediaUrls: canView ? p.mediaUrls : []
			};
			if (p.isSystem) {
				return {
					...basePost,
					author: {
						id: p.author?.id ?? '',
						username: 'serveur',
						name: 'Le serveur',
						image: null
					}
				};
			}
			return basePost;
		}),
		nextCursor
	};
}

/**
 * Retrieve stories with cursor pagination and view permission check for admin view.
 */
export async function getAdminStories(options?: {
	limit?: number;
	cursor?: CursorData | null;
	adminUserId?: string;
}) {
	const limit = options?.limit ?? 25;
	const conditions: (SQL | undefined)[] = [];

	if (options?.cursor && options.cursor.lastValue) {
		const cursorDate = new Date(options.cursor.lastValue as string);
		if (!Number.isNaN(cursorDate.getTime())) {
			conditions.push(lt(stories.createdAt, cursorDate));
		}
	}

	const adminId = options?.adminUserId;
	const where = conditions.length > 0 ? and(...conditions) : undefined;

	const dbStories = await db.query.stories.findMany({
		where,
		with: {
			author: {
				columns: { id: true, username: true, name: true, image: true }
			}
		},
		extras: {
			canView: adminId
				? sql<boolean>`CASE 
					WHEN ${stories.authorId} = ${adminId} THEN true
					WHEN ${stories.expiresAt} <= NOW() THEN false
					WHEN (${canSeeStory(adminId)}) THEN true 
					ELSE false 
				END`.as('can_view')
				: sql<boolean>`false`.as('can_view')
		},
		orderBy: (storiesTable, { desc }) => [desc(storiesTable.createdAt)],
		limit
	});

	let nextCursor: CursorData | null = null;
	if (dbStories.length === limit) {
		const last = dbStories[dbStories.length - 1];
		nextCursor = {
			type: 'chrono',
			lastValue: last.createdAt.toISOString(),
			lastId: last.id
		};
	}

	return {
		stories: dbStories.map((s) => {
			const canView = Boolean(s.canView);
			return {
				...s,
				mediaUrl: canView ? s.mediaUrl : '',
				caption: canView ? s.caption : null
			};
		}),
		nextCursor
	};
}

/**
 * Delete a post by admin and clean up associated media on disk.
 */
export async function deletePostByAdmin(adminUserId: string, postId: string) {
	const targetPost = await db.query.posts.findFirst({
		where: eq(posts.id, postId)
	});

	if (!targetPost) {
		throw new Error('Publication introuvable.');
	}

	await db.delete(posts).where(eq(posts.id, postId));
	await deleteMediaFiles(targetPost.mediaUrls as CarouselItem[] | null);

	return { success: true, deletedPostId: postId };
}

/**
 * Delete a story by admin and clean up associated media on disk (including video posters).
 */
export async function deleteStoryByAdmin(adminUserId: string, storyId: string) {
	const existing = await db.query.stories.findFirst({
		where: eq(stories.id, storyId)
	});

	if (!existing) {
		throw new Error('Story introuvable.');
	}

	await db.delete(stories).where(eq(stories.id, storyId));

	if (existing.mediaUrl) {
		await deleteMediaFiles([
			{
				type: existing.mediaType === 'video' ? 'video' : 'image',
				content: existing.mediaUrl
			}
		]);
	}

	return { success: true, deletedStoryId: storyId };
}

export * from './admin/seeding';
