import { json } from '@sveltejs/kit';
import { requireApiSession } from '$lib/server/auth';
import { checkFollowStatus, toggleFollow } from '$lib/server/follows';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, url }) => {
	const session = await requireApiSession(request);
	const targetId = url.searchParams.get('targetId');
	const currentUserId = session.user.id;

	if (!targetId) return json({ error: 'Requête invalide' }, { status: 400 });

	try {
		const status = await checkFollowStatus(currentUserId, targetId);
		return json(status);
	} catch (error) {
		console.error('Erreur check follow:', error);
		return json({ error: 'Erreur interne' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	const session = await requireApiSession(request);
	const { targetId, action } = await request.json();
	const currentUserId = session.user.id;

	if (
		!targetId ||
		currentUserId === targetId ||
		!['follow', 'unfollow', 'cancel'].includes(action)
	) {
		return json({ error: 'Requête invalide' }, { status: 400 });
	}

	try {
		const result = await toggleFollow(currentUserId, targetId, action);
		return json(result);
	} catch (error) {
		console.error('Erreur lors du toggle follow:', error);
		return json({ error: 'Erreur interne' }, { status: 500 });
	}
};
