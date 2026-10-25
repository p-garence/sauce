import { json } from '@sveltejs/kit';
import { requireApiSession } from '$lib/server/auth';
import { getPostsByTag } from '$lib/server/tags';
import { decodeCursor, encodeCursor } from '$lib/server/cursor';
import type { RequestHandler } from './$types';
import type { PostSortMode } from '$lib/types';
import { POSTS_PER_GRID, MAX_POSTS_PER_REQUEST, clampLimit } from '$lib/constants';

export const GET: RequestHandler = async ({ request, url }) => {
	const session = await requireApiSession(request);

	const tag = url.searchParams.get('tag');
	if (!tag) {
		return json({ error: 'Tag manquant' }, { status: 400 });
	}

	const sort = (url.searchParams.get('sort') as PostSortMode) || 'chrono';
	const numberOfPost = clampLimit(
		url.searchParams.get('numberOfPost'),
		POSTS_PER_GRID,
		MAX_POSTS_PER_REQUEST
	);
	const cursorStr = url.searchParams.get('cursor');
	const cursorData = decodeCursor(cursorStr);

	try {
		const result = await getPostsByTag(tag, session.user.id, numberOfPost, sort, cursorData);

		return json({
			posts: result.posts,
			nextCursor: encodeCursor(result.nextCursor),
			tag: result.tag
		});
	} catch (error) {
		console.error('Erreur API tag-posts:', error);
		return json({ error: 'Erreur serveur' }, { status: 500 });
	}
};
