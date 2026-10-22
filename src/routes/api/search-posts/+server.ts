import { json } from '@sveltejs/kit';
import { requireApiSession } from '$lib/server/auth';
import type { RequestHandler } from './$types';
import { searchPosts } from '$lib/server/posts';
import { decodeCursor, encodeCursor } from '$lib/server/cursor';
import { POSTS_PER_GRID, MAX_POSTS_PER_REQUEST, clampLimit } from '$lib/constants';

export const GET: RequestHandler = async ({ request, url }) => {
	const session = await requireApiSession(request);
	const viewerId = session.user.id;

	const q = url.searchParams.get('q') || '';
	const sort = (url.searchParams.get('sort') as 'chrono' | 'popular' | 'popular_week') || 'chrono';

	const cursorStr = url.searchParams.get('cursor');
	const cursor = decodeCursor(cursorStr);

	const limit = clampLimit(url.searchParams.get('limit'), POSTS_PER_GRID, MAX_POSTS_PER_REQUEST);

	try {
		const { posts, nextCursor } = await searchPosts(viewerId, q, sort, limit, cursor);

		return json({
			posts,
			nextCursor: encodeCursor(nextCursor)
		});
	} catch (error) {
		console.error('Erreur search-posts:', error);
		return json({ error: 'Erreur recherche posts' }, { status: 500 });
	}
};
