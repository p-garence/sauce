import { json } from '@sveltejs/kit';
import { requireApiSession } from '$lib/server/auth';
import { assertAdmin } from '$lib/server/admin';
import { updateInstanceTrust, deleteInstance } from '$lib/server/federation';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ request, params }) => {
	const session = await requireApiSession(request);
	assertAdmin(session.user);

	try {
		const { trustLevel } = await request.json();
		if (!trustLevel) return json({ error: 'Niveau de confiance manquant' }, { status: 400 });

		const updated = await updateInstanceTrust(params.id, trustLevel);
		return json(updated);
	} catch (error: unknown) {
		console.error('Erreur patch instance:', error);
		const message = error instanceof Error ? error.message : 'Erreur serveur';
		return json({ error: message }, { status: 400 });
	}
};

export const DELETE: RequestHandler = async ({ request, params }) => {
	const session = await requireApiSession(request);
	assertAdmin(session.user);

	try {
		const result = await deleteInstance(params.id);
		return json(result);
	} catch (error: unknown) {
		console.error('Erreur delete instance:', error);
		const message = error instanceof Error ? error.message : 'Erreur serveur';
		return json({ error: message }, { status: 400 });
	}
};
