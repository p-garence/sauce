import { json } from '@sveltejs/kit';
import { requireApiSession } from '$lib/server/auth';
import { assertAdmin, getAdminStats } from '$lib/server/admin';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request }) => {
	const session = await requireApiSession(request);
	assertAdmin(session.user);

	try {
		const stats = await getAdminStats();
		return json(stats);
	} catch (error) {
		console.error('Erreur get admin stats:', error);
		return json({ error: 'Erreur serveur' }, { status: 500 });
	}
};
