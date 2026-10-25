import { db } from '$lib/server/db';
import { follows, user as userTable, notifications } from '$lib/server/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { sendNotification } from '$lib/server/notifications';
import { isBlockedBidirectional } from '$lib/server/permissions';
import type { NotificationPayload } from '$lib/types';

export interface FollowRelationshipStatus {
	isFollowing: boolean;
	isPending: boolean;
}

export interface UserSummary {
	id: string;
	username: string | null;
	name: string | null;
	image: string | null;
}

/**
 * Check follow status between two users.
 */
export async function checkFollowStatus(
	followerId: string,
	followingId: string
): Promise<FollowRelationshipStatus> {
	const [followCheck] = await db
		.select()
		.from(follows)
		.where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)));

	return {
		isFollowing: followCheck?.status === 'accepted',
		isPending: followCheck?.status === 'pending'
	};
}

/**
 * Handle follow / unfollow / cancel request with transaction and atomic count update.
 */
export async function toggleFollow(
	currentUserId: string,
	targetId: string,
	action: 'follow' | 'unfollow' | 'cancel'
): Promise<{ success: boolean; status: 'accepted' | 'pending' | 'none' }> {
	if (!targetId || currentUserId === targetId) {
		throw new Error('Action de suivi non autorisée sur soi-même');
	}

	if (action === 'follow' && (await isBlockedBidirectional(currentUserId, targetId))) {
		throw new Error('Impossible de suivre cet utilisateur');
	}

	let resultingStatus: 'accepted' | 'pending' | 'none' = 'none';

	await db.transaction(async (tx) => {
		if (action === 'follow') {
			// A. Vérification de la configuration de confidentialité de la cible
			const [targetUser] = await tx
				.select({ profileVisibility: userTable.profileVisibility })
				.from(userTable)
				.where(eq(userTable.id, targetId));

			const requiresRequest = targetUser?.profileVisibility?.requireFollowRequest;
			const newStatus = requiresRequest ? 'pending' : 'accepted';

			// B. Insérer le follow (ou demande)
			const inserted = await tx
				.insert(follows)
				.values({
					followerId: currentUserId,
					followingId: targetId,
					status: newStatus
				})
				.onConflictDoNothing()
				.returning();

			if (inserted.length > 0) {
				resultingStatus = newStatus;

				// C. Incrémenter les compteurs UNIQUEMENT si c'est accepté
				if (newStatus === 'accepted') {
					await tx
						.update(userTable)
						.set({ followingCount: sql`${userTable.followingCount} + 1` })
						.where(eq(userTable.id, currentUserId));

					await tx
						.update(userTable)
						.set({ followersCount: sql`${userTable.followersCount} + 1` })
						.where(eq(userTable.id, targetId));
				}

				// D. Notification
				const notif: NotificationPayload = {
					recipientId: targetId,
					type: 'follow',
					actorId: currentUserId,
					content: requiresRequest ? 'a demandé à vous suivre.' : 'vous suit !',
					actionState: requiresRequest ? 'pending' : null
				};
				sendNotification(notif);
			} else {
				// Déjà existant
				const [existing] = await tx
					.select()
					.from(follows)
					.where(and(eq(follows.followerId, currentUserId), eq(follows.followingId, targetId)));
				if (existing) resultingStatus = existing.status as 'accepted' | 'pending';
			}
		} else if (action === 'unfollow' || action === 'cancel') {
			// Supprimer la relation et décrémenter
			const deleted = await tx
				.delete(follows)
				.where(and(eq(follows.followerId, currentUserId), eq(follows.followingId, targetId)))
				.returning();

			if (deleted.length > 0) {
				const previousStatus = deleted[0].status;

				if (previousStatus === 'accepted') {
					await tx
						.update(userTable)
						.set({ followingCount: sql`GREATEST(${userTable.followingCount} - 1, 0)` })
						.where(eq(userTable.id, currentUserId));

					await tx
						.update(userTable)
						.set({ followersCount: sql`GREATEST(${userTable.followersCount} - 1, 0)` })
						.where(eq(userTable.id, targetId));
				}
			}

			resultingStatus = 'none';
		}
	});

	return { success: true, status: resultingStatus };
}

/**
 * Manage incoming follow request (accept or refuse).
 */
export async function manageFollowRequest(
	currentUserId: string,
	followerId: string,
	action: 'accept' | 'refuse'
): Promise<{ success: boolean }> {
	await db.transaction(async (tx) => {
		// Modifier la notification
		await tx
			.update(notifications)
			.set({ actionState: action === 'accept' ? 'accepted' : 'refused' })
			.where(
				and(
					eq(notifications.recipientId, currentUserId),
					eq(notifications.actorId, followerId),
					eq(notifications.type, 'follow')
				)
			);

		if (action === 'accept') {
			const updated = await tx
				.update(follows)
				.set({ status: 'accepted' })
				.where(
					and(
						eq(follows.followerId, followerId),
						eq(follows.followingId, currentUserId),
						eq(follows.status, 'pending')
					)
				)
				.returning();

			if (updated.length > 0) {
				await tx
					.update(userTable)
					.set({ followingCount: sql`${userTable.followingCount} + 1` })
					.where(eq(userTable.id, followerId));

				await tx
					.update(userTable)
					.set({ followersCount: sql`${userTable.followersCount} + 1` })
					.where(eq(userTable.id, currentUserId));

				sendNotification({
					recipientId: followerId,
					type: 'follow',
					actorId: currentUserId,
					content: "a accepté votre demande d'abonnement."
				});
			}
		} else if (action === 'refuse') {
			await tx
				.delete(follows)
				.where(
					and(
						eq(follows.followerId, followerId),
						eq(follows.followingId, currentUserId),
						eq(follows.status, 'pending')
					)
				);
		}
	});

	return { success: true };
}

/**
 * Get users followed by a user.
 */
export async function getFollowing(userId: string): Promise<UserSummary[]> {
	return db
		.select({
			id: userTable.id,
			username: userTable.username,
			name: userTable.name,
			image: userTable.image
		})
		.from(follows)
		.innerJoin(userTable, eq(follows.followingId, userTable.id))
		.where(and(eq(follows.followerId, userId), eq(follows.status, 'accepted')));
}

/**
 * Get users following a user.
 */
export async function getFollowers(userId: string): Promise<UserSummary[]> {
	return db
		.select({
			id: userTable.id,
			username: userTable.username,
			name: userTable.name,
			image: userTable.image
		})
		.from(follows)
		.innerJoin(userTable, eq(follows.followerId, userTable.id))
		.where(and(eq(follows.followingId, userId), eq(follows.status, 'accepted')));
}

/**
 * Get pending follow requests for a user (with request timestamp).
 */
export async function getPendingFollowRequests(
	userId: string
): Promise<(UserSummary & { createdAt: Date })[]> {
	return db
		.select({
			id: userTable.id,
			username: userTable.username,
			name: userTable.name,
			image: userTable.image,
			createdAt: follows.createdAt
		})
		.from(follows)
		.innerJoin(userTable, eq(follows.followerId, userTable.id))
		.where(and(eq(follows.followingId, userId), eq(follows.status, 'pending')));
}

/**
 * Get count of pending follow requests for a user.
 */
export async function getPendingFollowCount(userId: string): Promise<number> {
	const result = await db.execute(sql`
		SELECT count(*) 
		FROM ${follows}
		WHERE following_id = ${userId} AND status = 'pending'
	`);
	return Number(result[0]?.count || 0);
}

/**
 * Get mutual follow count between two users.
 */
export async function getMutualFollowsCount(userId1: string, userId2: string): Promise<number> {
	if (userId1 === userId2) return 0;
	const mutualsResult = await db.execute(sql`
		SELECT count(*) 
		FROM ${follows} f1
		INNER JOIN ${follows} f2 ON f1.following_id = f2.follower_id
		WHERE f1.follower_id = ${userId1} 
		AND f2.following_id = ${userId2}
		AND f1.status = 'accepted'
		AND f2.status = 'accepted'
	`);
	return Number(mutualsResult[0]?.count || 0);
}

/**
 * Get mutual follow user list between two users.
 */
export async function getMutualFollows(userId1: string, userId2: string): Promise<UserSummary[]> {
	if (userId1 === userId2) return [];
	const mutualsResult = await db.execute(sql`
		SELECT u.id, u.username, u.name, u.image
		FROM ${userTable} u
		INNER JOIN ${follows} f1 ON f1.following_id = u.id
		INNER JOIN ${follows} f2 ON f2.follower_id = u.id
		WHERE f1.follower_id = ${userId1} 
		AND f2.following_id = ${userId2}
		AND f1.status = 'accepted'
		AND f2.status = 'accepted'
	`);

	return mutualsResult.map((row) => ({
		id: String(row.id),
		username: row.username ? String(row.username) : null,
		name: row.name ? String(row.name) : null,
		image: row.image ? String(row.image) : null
	}));
}
