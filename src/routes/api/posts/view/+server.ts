import { json } from '@sveltejs/kit';
import { requireApiSession } from '$lib/server/auth';
import { canSeePostSql } from '$lib/server/permissions';
import { db } from '$lib/server/db';
import { postViews, posts } from '$lib/server/db/schema';
import { and, inArray } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const session = await requireApiSession(request);

	try {
		const { postIds } = await request.json();

		if (!Array.isArray(postIds) || postIds.length === 0) {
			return json({ success: true });
		}

		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		const safePostIds = postIds
			.filter((id): id is string => typeof id === 'string' && uuidRegex.test(id))
			.slice(0, 100);

		if (safePostIds.length === 0) {
			return json({ success: true });
		}

		// Filtrer uniquement les posts qui existent encore et sont visibles par l'utilisateur
		const existingPosts = await db
			.select({ id: posts.id })
			.from(posts)
			.where(and(inArray(posts.id, safePostIds), canSeePostSql(session.user.id)));

		if (existingPosts.length === 0) {
			return json({ success: true });
		}

		const values = existingPosts.map((p) => ({
			userId: session.user.id,
			postId: p.id
		}));

		await db.insert(postViews).values(values).onConflictDoNothing();

		return json({ success: true });
	} catch (error: unknown) {
		const errObj = error as { code?: string; cause?: { code?: string } } | null;
		const code = errObj?.code || errObj?.cause?.code;
		if (code === '23503') {
			// Le post a été supprimé en cours de route, on ignore silencieusement
			return json({ success: true, note: 'Post introuvable (déjà supprimé)' });
		}

		console.error('Erreur mark as seen:', error);
		return json({ error: 'Erreur serveur' }, { status: 500 });
	}
};
