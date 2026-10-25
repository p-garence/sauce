import { json, isHttpError } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { hiddenPosts } from '$lib/server/db/schema';
import { requireApiSession } from '$lib/server/auth';
import { assertCanSeePost } from '$lib/server/permissions';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const session = await requireApiSession(request);

	const { postId, action } = await request.json();
	const userId = session.user.id;

	if (!postId || !['hide', 'unhide'].includes(action)) {
		return json({ error: 'Requête invalide' }, { status: 400 });
	}

	try {
		if (action === 'hide') {
			await assertCanSeePost(userId, postId);
			await db.insert(hiddenPosts).values({ userId, postId }).onConflictDoNothing();
		} else {
			await db
				.delete(hiddenPosts)
				.where(and(eq(hiddenPosts.userId, userId), eq(hiddenPosts.postId, postId)));
		}

		return json({ success: true });
	} catch (err) {
		if (isHttpError(err)) throw err;
		console.error('Erreur toggle hide post:', err);
		return json({ error: 'Erreur serveur' }, { status: 500 });
	}
};
