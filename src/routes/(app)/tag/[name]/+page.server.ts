import { redirect } from '@sveltejs/kit';
import { getPostsByTag } from '$lib/server/tags';
import { encodeCursor } from '$lib/server/cursor';
import { POSTS_PER_GRID } from '$lib/constants';
import type { PageServerLoad } from './$types';
import type { PostSortMode } from '$lib/types';

export const load: PageServerLoad = async ({ params, url, parent }) => {
	const { sessionUser } = await parent();
	if (!sessionUser) throw redirect(302, '/login');
	const tagName = decodeURIComponent(params.name);
	const sortMode = (url.searchParams.get('sort') as PostSortMode) || 'chrono';

	const result = await getPostsByTag(tagName, sessionUser.id, POSTS_PER_GRID, sortMode, null);

	return {
		tagName,
		tag: result.tag,
		posts: result.posts,
		sortMode,
		postsCursor: encodeCursor(result.nextCursor)
	};
};
