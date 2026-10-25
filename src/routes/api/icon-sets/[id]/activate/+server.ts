import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { setActiveIconSet } from '$lib/server/icons';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Non authentifié' }, { status: 401 });
	}

	try {
		const body = await request.json().catch(() => ({ activate: true }));
		const shouldActivate = body.activate !== false;
		const result = await setActiveIconSet(locals.user.id, shouldActivate ? params.id : null);
		return json(result);
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : "Erreur lors de l'activation";
		return json({ error: message }, { status: 400 });
	}
};
