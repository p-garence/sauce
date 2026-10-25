import { json } from '@sveltejs/kit';
import { getOptionalSession } from '$lib/server/auth';
import { isBlockedBidirectional, sanitizeUserForViewer } from '$lib/server/permissions';
import { db } from '$lib/server/db';
import { user as userTable } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, request }) => {
	const session = await getOptionalSession(request);
	const targetUsername = params.username;

	try {
		const targetUser = await db.query.user.findFirst({
			where: eq(userTable.username, targetUsername)
		});

		if (!targetUser) {
			return json({ error: 'Utilisateur introuvable' }, { status: 404 });
		}

		if (session?.user?.id && session.user.id !== targetUser.id) {
			const blocked = await isBlockedBidirectional(session.user.id, targetUser.id);
			if (blocked) {
				return json({ error: 'Utilisateur introuvable' }, { status: 404 });
			}
		}

		const sanitized = sanitizeUserForViewer(targetUser, session?.user?.id);
		const vis = sanitized.profileVisibility as Record<string, boolean> | undefined;
		const isOwnProfile = session?.user?.id === targetUser.id;

		return json({
			user: {
				id: targetUser.id,
				username: targetUser.username,
				name: targetUser.name,
				image: targetUser.image,
				createdAt: targetUser.createdAt,
				bio: sanitized.bio ?? null,
				site: sanitized.site ?? null,
				age: sanitized.age ?? null,
				genre: sanitized.genre ?? null,
				contactEmail: sanitized.contactEmail ?? null,
				followersCount:
					isOwnProfile || vis?.showFollowers !== false ? targetUser.followersCount : null,
				followingCount:
					isOwnProfile || vis?.showFollowing !== false ? targetUser.followingCount : null
			}
		});
	} catch (error) {
		console.error('Erreur get user by username:', error);
		return json({ error: 'Erreur interne' }, { status: 500 });
	}
};
