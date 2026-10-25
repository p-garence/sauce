import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserIconLibrary, createIconSet } from '$lib/server/icons';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'Non authentifié' }, { status: 401 });
	}

	try {
		const library = await getUserIconLibrary(locals.user.id);
		return json(library);
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Erreur interne';
		return json({ error: message }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Non authentifié' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const created = await createIconSet(locals.user.id, body);
		return json(created, { status: 201 });
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Erreur lors de la création';
		return json({ error: message }, { status: 400 });
	}
};
