import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireApiSession } from '$lib/server/auth';
import { blockUserGlobal, unblockUserGlobal, getBlockedUsersList } from '$lib/server/permissions';

export const GET: RequestHandler = async ({ request }) => {
	const session = await requireApiSession(request);
	const blockedUsers = await getBlockedUsersList(session.user.id);
	return json({ blockedUsers });
};

export const POST: RequestHandler = async ({ request }) => {
	const session = await requireApiSession(request);
	const { targetUserId, action } = await request.json();

	if (!targetUserId || (action !== 'block' && action !== 'unblock')) {
		throw error(400, 'Paramètres invalides.');
	}

	if (targetUserId === session.user.id) {
		throw error(400, 'Vous ne pouvez pas vous bloquer vous-même.');
	}

	if (action === 'block') {
		await blockUserGlobal(session.user.id, targetUserId);
	} else {
		await unblockUserGlobal(session.user.id, targetUserId);
	}

	return json({ success: true, action });
};
