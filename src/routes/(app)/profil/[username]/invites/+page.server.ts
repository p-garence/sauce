import { error, redirect } from '@sveltejs/kit';
import { getPendingFollowRequests } from '$lib/server/follows';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, params }) => {
	const { sessionUser } = await parent();
	if (!sessionUser) throw redirect(302, '/login');

	// Sécurité : Seul le propriétaire peut voir cette page
	if (sessionUser.username !== params.username) {
		throw error(403, 'Accès refusé');
	}

	const pendingRequests = await getPendingFollowRequests(sessionUser.id);

	return {
		pendingRequests,
		profile: sessionUser
	};
};
