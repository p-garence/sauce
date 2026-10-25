import { json } from '@sveltejs/kit';
import { requireApiSession } from '$lib/server/auth';
import { assertAdmin, getAdminUsers } from '$lib/server/admin';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request }) => {
	const session = await requireApiSession(request);
	assertAdmin(session.user);

	try {
		const users = await getAdminUsers();
		return json(users);
	} catch (error) {
		console.error('Erreur get admin users:', error);
		return json({ error: 'Erreur serveur' }, { status: 500 });
	}
};
