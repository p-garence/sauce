import { json } from '@sveltejs/kit';
import { requireApiSession } from '$lib/server/auth';
import { getUserGroupMemberships, addGroupMember, removeGroupMember } from '$lib/server/groups';
import type { RequestHandler } from './$types';

// 1. Lire les groupes dans lesquels se trouve l'utilisateur ciblé
export const GET: RequestHandler = async ({ request, url }) => {
	const session = await requireApiSession(request);
	const targetId = url.searchParams.get('targetId');

	if (!targetId) return json({ error: 'Missing targetId' }, { status: 400 });

	const groupIds = await getUserGroupMemberships(session.user.id, targetId);
	return json(groupIds);
};

// 2. Ajouter l'utilisateur à un groupe
export const POST: RequestHandler = async ({ request }) => {
	const session = await requireApiSession(request);
	const { targetId, groupId } = await request.json();

	if (!targetId || !groupId) {
		return json({ error: 'Données manquantes' }, { status: 400 });
	}

	try {
		await addGroupMember(groupId, session.user.id, targetId);
		return json({ success: true });
	} catch (err) {
		const message = (err as Error).message || 'Non autorisé';
		return json({ error: message }, { status: 403 });
	}
};

// 3. Retirer l'utilisateur d'un groupe
export const DELETE: RequestHandler = async ({ request }) => {
	const session = await requireApiSession(request);
	const { targetId, groupId } = await request.json();

	if (!targetId || !groupId) {
		return json({ error: 'Données manquantes' }, { status: 400 });
	}

	try {
		await removeGroupMember(groupId, session.user.id, targetId);
		return json({ success: true });
	} catch (err) {
		const message = (err as Error).message || 'Non autorisé';
		return json({ error: message }, { status: 403 });
	}
};
