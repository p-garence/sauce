import { json } from '@sveltejs/kit';
import { requireApiSession } from '$lib/server/auth';
import { manageFollowRequest } from '$lib/server/follows';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const session = await requireApiSession(request);
	const { followerId, action } = await request.json();
	const currentUserId = session.user.id;

	if (!followerId || !['accept', 'refuse'].includes(action)) {
		return json({ error: 'Requête invalide' }, { status: 400 });
	}

	try {
		const result = await manageFollowRequest(currentUserId, followerId, action);
		return json(result);
	} catch (error) {
		console.error('Erreur manage follow:', error);
		return json({ error: 'Erreur interne' }, { status: 500 });
	}
};
