import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { toggleSaveIconSet } from '$lib/server/icons';

export const POST: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Non authentifié' }, { status: 401 });
	}

	try {
		const result = await toggleSaveIconSet(locals.user.id, params.id);
		return json(result);
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Erreur';
		return json({ error: message }, { status: 400 });
	}
};
