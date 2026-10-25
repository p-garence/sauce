import { json } from '@sveltejs/kit';
import { requireApiAdmin } from '$lib/server/auth';
import { getInstances, registerInstance } from '$lib/server/federation';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request }) => {
	await requireApiAdmin(request);
	try {
		const list = await getInstances();
		return json(list);
	} catch (error) {
		console.error('Erreur get instances:', error);
		return json({ error: 'Erreur serveur' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	await requireApiAdmin(request);

	try {
		const { domain, trustLevel } = await request.json();
		if (!domain) return json({ error: 'Domaine manquant' }, { status: 400 });

		const instance = await registerInstance(domain, trustLevel);
		return json(instance, { status: 201 });
	} catch (error: unknown) {
		console.error('Erreur register instance:', error);
		const message = error instanceof Error ? error.message : 'Erreur serveur';
		return json({ error: message }, { status: 400 });
	}
};
