import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user as userTable } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { getFollowers } from '$lib/server/follows';
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

	// Sécurité : Vérification de la vie privée
	if (!isOwnProfile && visibility && visibility.showFollowers === false) {
		throw error(403, "Cette liste d'abonnés est privée.");
	}

	const followersList = await getFollowers(targetUser.id);

	return {
		profile: sanitizeUserForViewer(targetUser, sessionUser.id),
		users: followersList,
		currentUserId: sessionUser.id
	};
};
