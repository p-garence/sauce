import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { getLikedPosts } from '$lib/server/posts';
import { encodeCursor } from '$lib/server/cursor';
import { POSTS_PER_SCROLL } from '$lib/constants';
import type { PageServerLoad } from './$types';
import type { PostSortMode } from '$lib/types';

export const load: PageServerLoad = async ({ params, parent, url }) => {
	const { sessionUser } = await parent();

	const targetUser = await db.query.user.findFirst({
		where: eq(user.username, params.username)
	});

	if (!targetUser) throw error(404, 'Utilisateur introuvable');
	if (sessionUser.id !== targetUser.id) {
		throw error(403, 'Accès refusé : les publications aimées sont privées.');
	}

	const result = await getLikedPosts(sessionUser.id, targetUser.id, POSTS_PER_SCROLL);

	const sortMode = (url.searchParams.get('sort') as PostSortMode) || 'chrono';

	return {
		profile: {
			id: targetUser.id,
			username: targetUser.username,
			name: targetUser.name,
			image: targetUser.image
		},
		sortMode,
		initialPosts: result.posts,
		initialCursor: encodeCursor(result.nextCursor)
	};
};
