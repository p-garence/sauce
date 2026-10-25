import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user as userTable } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { getMutualFollows } from '$lib/server/follows';
import { isBlockedBidirectional, sanitizeUserForViewer } from '$lib/server/permissions';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, parent }) => {
	const { sessionUser } = await parent();

	const targetUser = await db.query.user.findFirst({
		where: eq(userTable.username, params.username)
	});

	if (!targetUser) throw error(404, 'Profil introuvable');
	if (sessionUser.id === targetUser.id)
		throw error(400, 'Impossible de voir les amis en commun avec vous-même');

	if (await isBlockedBidirectional(sessionUser.id, targetUser.id)) {
		throw error(404, 'Profil introuvable');
	}

	if (targetUser.profileVisibility && targetUser.profileVisibility.showFollowers === false) {
		throw error(403, 'Cette liste est privée.');
	}

	const users = await getMutualFollows(sessionUser.id, targetUser.id);

	return {
		profile: sanitizeUserForViewer(targetUser, sessionUser.id),
		users,
		currentUserId: sessionUser.id
	};
};
