import { requireApiSession } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { notifications } from '$lib/server/db/schema';
import { eq, and, lt } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, url }) => {
	const session = await requireApiSession(request);
	const userId = session.user.id;

	const specificId = url.searchParams.get('id');

	// 1. Marquer comme lu (par ID unique ou en totalité)
	if (specificId) {
		await db
			.update(notifications)
			.set({ isRead: true })
			.where(and(eq(notifications.id, specificId), eq(notifications.recipientId, userId)));
	} else {
		await db
			.update(notifications)
			.set({ isRead: true })
			.where(eq(notifications.recipientId, userId));
	}

	// 2. Nettoyage
	const oneWeekAgo = new Date();
	oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

	db.delete(notifications)
		.where(
			and(
				eq(notifications.recipientId, userId),
				eq(notifications.isRead, true),
				lt(notifications.createdAt, oneWeekAgo)
			)
		)
		.catch((e) => console.error('Erreur nettoyage notifs:', e));

	return new Response('OK');
};
