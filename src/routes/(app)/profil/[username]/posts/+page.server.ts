import { error } from '@sveltejs/kit';
import { requireSession } from '$lib/server/auth';
import { isBlockedBidirectional } from '$lib/server/permissions';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { getProfilePosts } from '$lib/server/posts';
import { encodeCursor } from '$lib/server/cursor';
import { getInstanceSettings } from '$lib/server/instanceSettings';
import type { PageServerLoad } from './$types';
import type { PostSortMode } from '$lib/types';

export const load: PageServerLoad = async ({ request, params, url }) => {
	const session = await requireSession(request);

	const targetUser = await db.query.user.findFirst({
		where: eq(user.username, params.username)
	});

	if (!targetUser) throw error(404, 'Utilisateur introuvable');

	if (
		session.user.id !== targetUser.id &&
		(await isBlockedBidirectional(session.user.id, targetUser.id))
	) {
		throw error(404, 'Utilisateur introuvable');
	}

	const sortMode = (url.searchParams.get('sort') as PostSortMode) || 'chrono';

	const settings = await getInstanceSettings();
	const result = await getProfilePosts(
		session.user.id,
		targetUser.id,
		settings.performanceSettings.postsPerScroll,
		null,
		sortMode
	);

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
