import { redirect } from '@sveltejs/kit';
import { getFilteredPosts } from '$lib/server/posts';
import { getUserFeeds } from '$lib/server/flux';
import { POSTS_PER_SCROLL } from '$lib/constants';
import { encodeCursor } from '$lib/server/cursor';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	// 1. On récupère la sessionUser directement depuis le Layout (app)
	const { sessionUser } = await parent();
	if (!sessionUser) throw redirect(302, '/login');
	const userId = sessionUser.id;

	// 2. Récupération des flux de l'utilisateur
	const { feeds: myFeeds, activeFeedId } = await getUserFeeds(
		userId,
		sessionUser.activeFeedId as string | null
	);

	// 3. Récupération des posts
	const result = await getFilteredPosts(userId, activeFeedId, POSTS_PER_SCROLL);

	return {
		myFeeds,
		activeFeedId,
		posts: result.posts,
		initialCursor: encodeCursor(result.nextCursor)
	};
};
