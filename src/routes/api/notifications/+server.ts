import { json } from '@sveltejs/kit';
import { requireApiSession } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { notifications } from '$lib/server/db/schema';
import { eq, desc, and, lt, sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { getInstanceSettings } from '$lib/server/instanceSettings';

export const GET: RequestHandler = async ({ request, url }) => {
	const session = await requireApiSession(request);
	const settings = await getInstanceSettings();
	const perLoad = settings.performanceSettings.notificationsPerLoad;
	const cursor = url.searchParams.get('cursor');
	const cursorDate = cursor ? new Date(cursor) : null;
	const validCursorDate = cursorDate && !Number.isNaN(cursorDate.getTime()) ? cursorDate : null;

	// 1. On compte TOUTES les notifications non lues (très rapide en SQL)
	let totalUnreadCount = 0;
	if (!validCursorDate) {
		// On ne le calcule que lors du premier chargement, pas au "Load More"
		const countResult = await db.execute(sql`
            SELECT COUNT(*) as count 
            FROM ${notifications} 
            WHERE recipient_id = ${session.user.id} AND is_read = false
        `);
		totalUnreadCount = Number(countResult[0]?.count || 0);
	}

	// 2. On charge les 10 dernières (Le reste de votre code est intact)
	const whereClause = validCursorDate
		? and(
				eq(notifications.recipientId, session.user.id),
				lt(notifications.createdAt, validCursorDate)
			)
		: eq(notifications.recipientId, session.user.id);

	const notifs = await db.query.notifications.findMany({
		where: whereClause,
		with: { actor: { columns: { username: true, name: true, image: true } } },
		orderBy: [desc(notifications.createdAt)],
		limit: perLoad + 1
	});

	const hasMore = notifs.length > perLoad;
	const results = hasMore ? notifs.slice(0, perLoad) : notifs;

	return json({
		notifications: results,
		hasMore,
		unreadCount: totalUnreadCount
	});
};
