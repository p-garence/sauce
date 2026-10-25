import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { publishIconSet } from '$lib/server/icons';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Non authentifié' }, { status: 401 });
	}

	try {
		const body = await request.json().catch(() => ({}));
		const result = await publishIconSet(locals.user.id, params.id, body.content);
		return json(result, { status: 201 });
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Erreur lors de la publication';
		return json({ error: message }, { status: 400 });
	}
};
