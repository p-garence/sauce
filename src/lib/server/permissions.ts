import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import {
	posts,
	stories,
	follows,
	userGroups,
	userGroupMembers,
	userBlocks,
	chats,
	chatParticipants,
	user as userTable
} from '$lib/server/db/schema';
import { and, eq, gt, isNull, isNotNull, not, exists, or, sql, type SQL } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';

import { UUID_REGEX, isValidUuid } from '$lib/utils/validation';

export { UUID_REGEX, isValidUuid };

// ==========================================
// 1. GESTION DU BLOCAGE GLOBAL (user_blocks)
// ==========================================

/**
 * Condition SQL vérifiant qu'aucun blocage n'existe (dans un sens ou dans l'autre)
 * entre `viewerId` et la colonne utilisateur `targetUserColumn`.
 */
export function notBlockedSql(viewerId: string, targetUserColumn: AnyPgColumn): SQL {
	return not(
		exists(
			db
				.select({ blockerId: userBlocks.blockerId })
				.from(userBlocks)
				.where(
					or(
						and(eq(userBlocks.blockerId, viewerId), eq(userBlocks.blockedId, targetUserColumn)),
						and(eq(userBlocks.blockerId, targetUserColumn), eq(userBlocks.blockedId, viewerId))
					)
				)
		)
	);
}

/**
 * Vérifie si un blocage existe dans un sens ou dans l'autre entre deux utilisateurs.
 */
export async function isBlockedBidirectional(
	userA?: string | null,
	userB?: string | null
): Promise<boolean> {
	if (!userA || !userB || userA === userB) return false;
	const row = await db.query.userBlocks.findFirst({
		where: or(
			and(eq(userBlocks.blockerId, userA), eq(userBlocks.blockedId, userB)),
			and(eq(userBlocks.blockerId, userB), eq(userBlocks.blockedId, userA))
		)
	});
	return Boolean(row);
}

/**
 * Vérifie si `blockerId` a bloqué `blockedId`.
 */
export async function hasBlockedUser(
	blockerId?: string | null,
	blockedId?: string | null
): Promise<boolean> {
	if (!blockerId || !blockedId || blockerId === blockedId) return false;
	const row = await db.query.userBlocks.findFirst({
		where: and(eq(userBlocks.blockerId, blockerId), eq(userBlocks.blockedId, blockedId))
	});
	return Boolean(row);
}

/**
 * Bloque globalement un utilisateur :
 * 1. Ajoute l'entrée dans `user_blocks`
 * 2. Supprime les abonnements mutuels dans `follows` et recalcule les compteurs
 * 3. Passe la discussion directe éventuelle en statut `'blocked'`
 */
export async function blockUserGlobal(blockerId: string, blockedId: string): Promise<void> {
	if (!blockerId || !blockedId || blockerId === blockedId) {
		throw error(400, 'Action de blocage invalide.');
	}

	await db.transaction(async (tx) => {
		await tx.insert(userBlocks).values({ blockerId, blockedId }).onConflictDoNothing();

		// Suppression des relations d'abonnement dans les deux sens
		await tx
			.delete(follows)
			.where(
				or(
					and(eq(follows.followerId, blockerId), eq(follows.followingId, blockedId)),
					and(eq(follows.followerId, blockedId), eq(follows.followingId, blockerId))
				)
			);

		// Recalcul exact des compteurs d'abonnés/abonnements pour les deux comptes
		for (const uid of [blockerId, blockedId]) {
			await tx.execute(sql`
				UPDATE "user"
				SET
					followers_count = (SELECT count(*)::int FROM follows WHERE following_id = ${uid} AND status = 'accepted'),
					following_count = (SELECT count(*)::int FROM follows WHERE follower_id = ${uid} AND status = 'accepted')
				WHERE id = ${uid}
			`);
		}

		// Si une conversation directe existe entre les deux, marquer la participation du bloqueur en 'blocked'
		const blockerChats = await tx
			.select({ chatId: chatParticipants.chatId })
			.from(chatParticipants)
			.innerJoin(chats, eq(chatParticipants.chatId, chats.id))
			.where(and(eq(chatParticipants.userId, blockerId), eq(chats.type, 'direct')));

		for (const { chatId } of blockerChats) {
			const otherInChat = await tx.query.chatParticipants.findFirst({
				where: and(eq(chatParticipants.chatId, chatId), eq(chatParticipants.userId, blockedId))
			});
			if (otherInChat) {
				await tx
					.update(chatParticipants)
					.set({ status: 'blocked' })
					.where(and(eq(chatParticipants.chatId, chatId), eq(chatParticipants.userId, blockerId)));
			}
		}
	});
}

/**
 * Débloque globalement un utilisateur et rétablit le statut du chat direct éventuel.
 */
export async function unblockUserGlobal(blockerId: string, blockedId: string): Promise<void> {
	if (!blockerId || !blockedId) return;

	await db.transaction(async (tx) => {
		await tx
			.delete(userBlocks)
			.where(and(eq(userBlocks.blockerId, blockerId), eq(userBlocks.blockedId, blockedId)));

		const blockerChats = await tx
			.select({ chatId: chatParticipants.chatId })
			.from(chatParticipants)
			.innerJoin(chats, eq(chatParticipants.chatId, chats.id))
			.where(
				and(
					eq(chatParticipants.userId, blockerId),
					eq(chatParticipants.status, 'blocked'),
					eq(chats.type, 'direct')
				)
			);

		for (const { chatId } of blockerChats) {
			const otherInChat = await tx.query.chatParticipants.findFirst({
				where: and(eq(chatParticipants.chatId, chatId), eq(chatParticipants.userId, blockedId))
			});
			if (otherInChat) {
				await tx
					.update(chatParticipants)
					.set({ status: 'accepted' })
					.where(and(eq(chatParticipants.chatId, chatId), eq(chatParticipants.userId, blockerId)));
			}
		}
	});
}

/**
 * Récupère la liste des utilisateurs bloqués par `blockerId`.
 */
export async function getBlockedUsersList(blockerId: string) {
	const rows = await db
		.select({
			id: userTable.id,
			username: userTable.username,
			name: userTable.name,
			image: userTable.image,
			blockedAt: userBlocks.createdAt
		})
		.from(userBlocks)
		.innerJoin(userTable, eq(userBlocks.blockedId, userTable.id))
		.where(eq(userBlocks.blockerId, blockerId))
		.orderBy(sql`${userBlocks.createdAt} DESC`);

	return rows;
}

// ==========================================
// 2. VISIBILITÉ DES PUBLICATIONS (posts)
// ==========================================

/**
 * Filtre SQL Drizzle déterminant si `viewerId` (ou un visiteur anonyme si `null`)
 * est autorisé à voir une publication.
 */
export function canSeePostSql(viewerId?: string | null): SQL {
	const notExpired = or(isNull(posts.expiresAt), gt(posts.expiresAt, sql`now()`))!;
	const isPublic = or(eq(posts.visibility, 'public'), eq(posts.isSystem, true))!;

	if (!viewerId) {
		return and(notExpired, isPublic)!;
	}

	const isAuthor = eq(posts.authorId, viewerId);
	const isNetwork = eq(posts.visibility, 'network');

	const isConnection = and(
		eq(posts.visibility, 'followers'),
		exists(
			db
				.select({ id: follows.followingId })
				.from(follows)
				.where(
					and(
						eq(follows.followerId, viewerId),
						eq(follows.followingId, posts.authorId),
						eq(follows.status, 'accepted')
					)
				)
		)
	);

	const isGroupAllowed = and(
		eq(posts.visibility, 'group'),
		isNotNull(posts.groupId),
		or(
			exists(
				db
					.select({ groupId: userGroupMembers.groupId })
					.from(userGroupMembers)
					.where(
						and(eq(userGroupMembers.userId, viewerId), eq(userGroupMembers.groupId, posts.groupId))
					)
			),
			exists(
				db
					.select({ id: userGroups.id })
					.from(userGroups)
					.where(and(eq(userGroups.id, posts.groupId), eq(userGroups.ownerId, viewerId)))
			)
		)
	);

	const visibilityMatch = or(isAuthor, isPublic, isNetwork, isConnection, isGroupAllowed)!;
	return and(notExpired, notBlockedSql(viewerId, posts.authorId), visibilityMatch)!;
}

/**
 * Vérifie qu'un utilisateur a le droit de voir un post donné, sinon lève une erreur 404/403.
 */
export async function assertCanSeePost(viewerId: string | null | undefined, postId: string) {
	if (!isValidUuid(postId)) {
		throw error(404, 'Publication introuvable.');
	}

	const post = await db.query.posts.findFirst({
		where: and(eq(posts.id, postId), canSeePostSql(viewerId))
	});

	if (!post) {
		throw error(404, "Publication introuvable ou vous n'avez pas les droits pour la voir.");
	}

	return post;
}

// ==========================================
// 3. VISIBILITÉ DES STORIES (stories)
// ==========================================

/**
 * Filtre SQL Drizzle déterminant si `viewerId` est autorisé à voir une story.
 * Par défaut, exige également que la story ne soit pas expirée (`expiresAt > now()`),
 * sauf si `options.ignoreExpiration` est activé ou si `options.allowAuthorExpired` est activé pour l'auteur lui-même.
 */
export function canSeeStorySql(
	viewerId?: string | null,
	options?: { allowAuthorExpired?: boolean; ignoreExpiration?: boolean }
): SQL {
	const now = new Date();
	const notExpired = options?.ignoreExpiration
		? undefined
		: options?.allowAuthorExpired && viewerId
			? or(eq(stories.authorId, viewerId), gt(stories.expiresAt, now))!
			: gt(stories.expiresAt, now);

	const isPublic = eq(stories.visibility, 'public');

	if (!viewerId) {
		return notExpired ? and(notExpired, isPublic)! : isPublic;
	}

	const isAuthor = eq(stories.authorId, viewerId);
	const isNetwork = eq(stories.visibility, 'network');

	const isConnection = and(
		eq(stories.visibility, 'followers'),
		exists(
			db
				.select({ id: follows.followingId })
				.from(follows)
				.where(
					and(
						eq(follows.followerId, viewerId),
						eq(follows.followingId, stories.authorId),
						eq(follows.status, 'accepted')
					)
				)
		)
	);

	const isGroupAllowed = and(
		eq(stories.visibility, 'group'),
		isNotNull(stories.groupId),
		or(
			exists(
				db
					.select({ groupId: userGroupMembers.groupId })
					.from(userGroupMembers)
					.where(
						and(
							eq(userGroupMembers.userId, viewerId),
							eq(userGroupMembers.groupId, stories.groupId)
						)
					)
			),
			exists(
				db
					.select({ id: userGroups.id })
					.from(userGroups)
					.where(and(eq(userGroups.id, stories.groupId), eq(userGroups.ownerId, viewerId)))
			)
		)
	);

	const visibilityMatch = or(isAuthor, isPublic, isNetwork, isConnection, isGroupAllowed)!;
	const conditions: SQL[] = [notBlockedSql(viewerId, stories.authorId), visibilityMatch];
	if (notExpired) {
		conditions.push(notExpired);
	}
	return and(...conditions)!;
}

/**
 * Vérifie qu'un utilisateur a le droit de voir/interagir avec une story, sinon lève une erreur 404/403.
 */
export async function assertCanSeeStory(
	viewerId: string | null | undefined,
	storyId: string,
	options?: { allowAuthorExpired?: boolean; ignoreExpiration?: boolean }
) {
	if (!isValidUuid(storyId)) {
		throw error(404, 'Story introuvable.');
	}

	const story = await db.query.stories.findFirst({
		where: and(eq(stories.id, storyId), canSeeStorySql(viewerId, options))
	});

	if (!story) {
		throw error(404, 'Story introuvable, expirée ou accès refusé.');
	}

	return story;
}

// ==========================================
// 4. PROPRIÉTÉ DES GROUPES & ACCÈS CHAT
// ==========================================

/**
 * Vérifie qu'un `groupId` existe et appartient bien à `userId`.
 */
export async function assertGroupOwner(
	userId: string,
	groupId: string | null | undefined
): Promise<string> {
	if (!isValidUuid(groupId)) {
		throw error(400, 'Identifiant de groupe invalide.');
	}

	const group = await db.query.userGroups.findFirst({
		where: and(eq(userGroups.id, groupId), eq(userGroups.ownerId, userId))
	});

	if (!group) {
		throw error(403, 'Ce groupe ne vous appartient pas ou est introuvable.');
	}

	return group.id;
}

/**
 * Vérifie que `userId` est participant autorisé du `chatId` et qu'aucun blocage n'empêche l'accès/l'envoi.
 */
export async function assertChatParticipant(
	userId: string,
	chatId: string,
	options?: { allowPendingOrRefusedRead?: boolean }
) {
	if (!isValidUuid(chatId)) {
		throw error(404, 'Conversation introuvable.');
	}

	const participation = await db.query.chatParticipants.findFirst({
		where: and(eq(chatParticipants.chatId, chatId), eq(chatParticipants.userId, userId)),
		with: {
			chat: {
				with: {
					participants: true
				}
			}
		}
	});

	if (!participation || !participation.chat) {
		throw error(403, 'Accès refusé : vous ne participez pas à cette conversation.');
	}

	if (!options?.allowPendingOrRefusedRead) {
		if (participation.status === 'blocked') {
			throw error(403, 'Cette discussion est bloquée.');
		}
		if (participation.status === 'refused') {
			throw error(403, 'Vous avez refusé cette discussion.');
		}
		if (participation.status === 'pending') {
			throw error(403, "Veuillez d'abord accepter l'invitation pour envoyer un message.");
		}
	}

	if (participation.chat.type === 'direct') {
		const other = participation.chat.participants.find((p) => p.userId !== userId);
		if (other && !options?.allowPendingOrRefusedRead) {
			if (other.status === 'blocked' || other.status === 'refused') {
				throw error(403, 'Impossible d’envoyer un message à cet utilisateur.');
			}
			const blocked = await isBlockedBidirectional(userId, other.userId);
			if (blocked) {
				throw error(403, 'Impossible d’envoyer un message : blocage actif.');
			}
		}
	}

	return participation;
}

// ==========================================
// 5. ASSAINISSEMENT DES DONNÉES PROFIL (RGPD / Privacy)
// ==========================================

/**
 * Nettoie un objet utilisateur issu de la BDD avant envoi au client afin de ne jamais
 * exposer l'email de connexion, les quotas ou les champs masqués par `profileVisibility`.
 */
export function sanitizeUserForViewer<T extends Record<string, unknown>>(
	target: T,
	viewerId?: string | null
): Partial<T> {
	const isSelf = Boolean(viewerId && target.id === viewerId);
	if (isSelf) {
		return target;
	}

	const vis = (target.profileVisibility as Record<string, boolean> | undefined) || {};
	return {
		id: target.id,
		username: target.username,
		name: target.name,
		image: target.image,
		createdAt: target.createdAt,
		role: target.role,
		followersCount: target.followersCount ?? 0,
		followingCount: target.followingCount ?? 0,
		bio: vis.bio !== false ? target.bio : null,
		site: vis.site ? target.site : null,
		age: vis.age ? target.age : null,
		genre: vis.genre ? target.genre : null,
		contactEmail: vis.contactEmail ? target.contactEmail : null,
		profileVisibility: {
			bio: Boolean(vis.bio !== false),
			site: Boolean(vis.site),
			age: Boolean(vis.age),
			genre: Boolean(vis.genre),
			contactEmail: Boolean(vis.contactEmail),
			requireFollowRequest: Boolean(vis.requireFollowRequest),
			requireMessageApproval: Boolean(vis.requireMessageApproval),
			showFollowers: vis.showFollowers !== false,
			showFollowing: vis.showFollowing !== false,
			allowMentions: vis.allowMentions !== false
		}
	} as unknown as Partial<T>;
}
