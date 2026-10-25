import { json } from '@sveltejs/kit';
import { requireApiSession } from '$lib/server/auth';
import { isValidUuid } from '$lib/server/permissions';
import { db } from '$lib/server/db';
import { user as userTable, userFeeds } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const session = await requireApiSession(request);
	const { feedId } = await request.json();

	if (feedId && isValidUuid(feedId)) {
		const ownedFeed = await db.query.userFeeds.findFirst({
			where: and(eq(userFeeds.id, feedId), eq(userFeeds.userId, session.user.id)),
			columns: { id: true }
		});

		if (!ownedFeed) {
			return json({ error: 'Flux introuvable ou non autorisé' }, { status: 403 });
		}

		await db
			.update(userTable)
			.set({ activeFeedId: feedId })
			.where(eq(userTable.id, session.user.id));
	}

	return json({ success: true });
};
