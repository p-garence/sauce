import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user as userTable } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { getLikedPosts, getProfilePosts } from '$lib/server/posts';
import {
	checkFollowStatus,
	getMutualFollowsCount,
	getPendingFollowCount
} from '$lib/server/follows';
import { encodeCursor } from '$lib/server/cursor';
import { getUserStoryBundle } from '$lib/server/stories';
import { isBlockedBidirectional, sanitizeUserForViewer } from '$lib/server/permissions';
import { ensureSystemUser } from '$lib/server/admin';
import type { PageServerLoad } from './$types';
import type { PostData } from '$lib/types';
import type { CursorData } from '$lib/server/cursor';
import { POSTS_PER_GRID } from '$lib/constants';
import type { PostSortMode } from '$lib/types';

export const load: PageServerLoad = async ({ params, url, parent }) => {
	// 1. On récupère la session depuis le layout
	const { sessionUser } = await parent();
	const currentUser = sessionUser;
	const targetUsername = params.username;
	const sortMode = (url.searchParams.get('sort') as PostSortMode) || 'chrono';

	if (targetUsername === 'serveur') {
		await ensureSystemUser();
	}

	const profileUser = await db.query.user.findFirst({
		where: eq(userTable.username, targetUsername)
	});

	if (!profileUser) throw error(404, 'Profil introuvable');

	const isOwnProfile = currentUser.id === profileUser.id;
	if (!isOwnProfile && (await isBlockedBidirectional(currentUser.id, profileUser.id))) {
		throw error(404, 'Profil introuvable');
	}

	let isFollowing = false;

	if (!isOwnProfile) {
		const status = await checkFollowStatus(currentUser.id, profileUser.id);
		isFollowing = status.isFollowing;
	}

	const getMutuals = async () => {
		if (isOwnProfile) return 0;
		return getMutualFollowsCount(currentUser.id, profileUser.id);
	};

	const sanitizedProfile = sanitizeUserForViewer(profileUser, currentUser.id);

	// 2. On récupère les publications classiques
	const postsResult = await getProfilePosts(
		currentUser.id,
		profileUser.id,
		POSTS_PER_GRID,
		null,
		sortMode
	);

	// 3. On récupère les favoris uniquement si c'est son propre profil
	let likedPostsResult: { posts: PostData[]; nextCursor: CursorData | null } = {
		posts: [],
		nextCursor: null
	};

	if (isOwnProfile) {
		likedPostsResult = await getLikedPosts(currentUser.id, profileUser.id, POSTS_PER_GRID);
	}

	let pendingCount = 0;
	if (isOwnProfile) {
		pendingCount = await getPendingFollowCount(profileUser.id);
	}

	const storyBundle = await getUserStoryBundle(profileUser.id, currentUser.id);

	return {
		profile: {
			...sanitizedProfile,
			id: profileUser.id,
			username: profileUser.username,
			name: profileUser.name,
			createdAt: profileUser.createdAt,
			genre: sanitizedProfile.genre ?? null,
			age: sanitizedProfile.age ?? null,
			bio: sanitizedProfile.bio ?? null,
			contactEmail: sanitizedProfile.contactEmail ?? null,
			site: sanitizedProfile.site ?? null
		},
		stats: {
			followers: profileUser.followersCount,
			following: profileUser.followingCount
		},
		isOwnProfile,
		isFollowing,
		lazy: {
			mutuals: getMutuals()
		},
		pendingCount,
		storyBundle,
		sessionUser: currentUser,
		posts: postsResult.posts,
		sortMode,
		likedPosts: likedPostsResult.posts,
		postsCursor: encodeCursor(postsResult.nextCursor),
		likesCursor: encodeCursor(likedPostsResult.nextCursor)
	};
};
