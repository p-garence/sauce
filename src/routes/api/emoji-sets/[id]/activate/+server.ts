import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { toggleActiveEmojiSet } from '$lib/server/emojis';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Non authentifié' }, { status: 401 });
	}

	try {
		const body = await request.json().catch(() => ({}));
		const shouldActivate = typeof body.activate === 'boolean' ? body.activate : undefined;
		const result = await toggleActiveEmojiSet(locals.user.id, params.id, shouldActivate);
		return json(result);
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : "Erreur lors de l'activation";
		return json({ error: message }, { status: 400 });
	}
};
