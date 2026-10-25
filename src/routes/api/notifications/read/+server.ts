import { requireApiSession } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { notifications } from '$lib/server/db/schema';
import { eq, and, lt } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const session = await requireApiSession(request);
	const userId = session.user.id;

	// 1. Tout marquer comme lu (plus d'exclusion)
	await db.update(notifications).set({ isRead: true }).where(eq(notifications.recipientId, userId));

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
