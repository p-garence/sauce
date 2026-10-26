import { error, redirect } from '@sveltejs/kit';
import { getPendingFollowRequests } from '$lib/server/follows';
import { db } from '$lib/server/db';
import { notifications } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, params }) => {
	const { sessionUser } = await parent();
	if (!sessionUser) throw redirect(302, '/login');

	// Sécurité : Seul le propriétaire peut voir cette page
	if (sessionUser.username !== params.username) {
		throw error(403, 'Accès refusé');
	}

	const pendingRequests = await getPendingFollowRequests(sessionUser.id);

	db.update(notifications)
		.set({ isRead: true })
		.where(
			and(
				eq(notifications.recipientId, sessionUser.id),
				eq(notifications.type, 'follow'),
				eq(notifications.isRead, false)
			)
		)
		.catch((e) => console.error('[InvitesRead] Erreur notifications follow lues:', e));

	return {
		pendingRequests,
		profile: sessionUser
	};
};
