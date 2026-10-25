import { json, isHttpError } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { postLikes, posts } from '$lib/server/db/schema';
import { requireApiSession } from '$lib/server/auth';
import { assertCanSeePost } from '$lib/server/permissions';
import { eq, and, sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import {
	sendNotification,
	removeUnreadNotification,
	type NotificationPayload
} from '$lib/server/notifications';

export const POST: RequestHandler = async ({ request }) => {
	const session = await requireApiSession(request);

	const { postId, action } = await request.json();
	const userId = session.user.id;

	if (!postId || !['like', 'unlike'].includes(action)) {
		return json({ error: 'Requête invalide' }, { status: 400 });
	}

	try {
		if (action === 'like') {
			await assertCanSeePost(userId, postId);
		}

		// La transaction garantit que les deux requêtes (liaison + compteur) s'exécutent proprement
		await db.transaction(async (tx) => {
			if (action === 'like') {
				// 1. On insère le like (returning nous permet de vérifier qu'il a bien été inséré)
				const inserted = await tx
					.insert(postLikes)
					.values({ userId, postId })
					.onConflictDoNothing()
					.returning({ postId: postLikes.postId });

				// 2. Si l'insertion a eu lieu (le like n'existait pas déjà), on incrémente le post
				if (inserted.length > 0) {
					const updatedPosts = await tx
						.update(posts)
						.set({ likesCount: sql`${posts.likesCount} + 1` })
						.where(eq(posts.id, postId))
						.returning({ authorId: posts.authorId });

					if (updatedPosts.length > 0) {
						const authorId = updatedPosts[0].authorId;
						const notif: NotificationPayload = {
							recipientId: authorId,
							entityId: postId,
							type: 'like',
							actorId: userId
						};
						sendNotification(notif);
					}
				}
			} else {
				// 1. On supprime le like
				const deleted = await tx
					.delete(postLikes)
					.where(and(eq(postLikes.userId, userId), eq(postLikes.postId, postId)))
					.returning({ postId: postLikes.postId });

				// 2. Si la suppression a bien eu lieu, on décrémente
				if (deleted.length > 0) {
					await tx
						.update(posts)
						.set({ likesCount: sql`GREATEST(0, ${posts.likesCount} - 1)` })
						.where(eq(posts.id, postId));

					await removeUnreadNotification({
						actorId: userId,
						entityId: postId,
						type: 'like'
					});
				}
			}
		});

		return json({ success: true });
	} catch (err) {
		if (isHttpError(err)) throw err;
		console.error('Erreur toggle like:', err);
		return json({ error: 'Erreur serveur' }, { status: 500 });
	}
};
