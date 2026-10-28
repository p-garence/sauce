import { json } from '@sveltejs/kit';
import { requireApiSession } from '$lib/server/auth';
import { getFilteredPosts } from '$lib/server/posts';
import { decodeCursor, encodeCursor } from '$lib/server/cursor';
import type { RequestHandler } from './$types';
import { getInstanceSettings } from '$lib/server/instanceSettings';
import { clampLimit } from '$lib/constants';

export const GET: RequestHandler = async ({ request, url }) => {
	const session = await requireApiSession(request);
	const settings = await getInstanceSettings();

	// Le front nous envoie un Base64 Opaque, on le décode
	const cursorStr = url.searchParams.get('cursor');
	const cursorData = decodeCursor(cursorStr);

	const feedId = url.searchParams.get('feedId');
	const limit = clampLimit(
		url.searchParams.get('limit'),
		settings.performanceSettings.postsPerScroll,
		settings.performanceSettings.maxPostsPerRequest
	);
	const forceRefresh = url.searchParams.get('refresh') === 'true';

	try {
		const result = await getFilteredPosts(
			session.user.id,
			feedId,
			limit,
			cursorData,
			0,
			false,
			forceRefresh
		);

		// On renvoie les posts et le NOUVEAU curseur encodé en Base64
		return json({
			posts: result.posts,
			nextCursor: encodeCursor(result.nextCursor)
		});
	} catch (error) {
		console.error('Erreur infinite scroll:', error);
		return json({ error: 'Erreur serveur' }, { status: 500 });
	}
};
