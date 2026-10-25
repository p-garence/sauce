import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user as userTable } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { getFollowing } from '$lib/server/follows';
import { isBlockedBidirectional, sanitizeUserForViewer } from '$lib/server/permissions';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, parent }) => {
	const { sessionUser } = await parent();

	const targetUser = await db.query.user.findFirst({
		where: eq(userTable.username, params.username)
	});

	if (!targetUser) throw error(404, 'Profil introuvable');

	const isOwnProfile = sessionUser.id === targetUser.id;
	if (!isOwnProfile && (await isBlockedBidirectional(sessionUser.id, targetUser.id))) {
		throw error(404, 'Profil introuvable');
	}

	const visibility = targetUser.profileVisibility;

	// Vérification : A-t-il caché ses abonnements ?
	if (!isOwnProfile && visibility && visibility.showFollowing === false) {
		throw error(403, "Cette liste d'abonnements est privée.");
	}

	const followingList = await getFollowing(targetUser.id);

	return {
		profile: sanitizeUserForViewer(targetUser, sessionUser.id),
		users: followingList,
		currentUserId: sessionUser.id
	};
};
