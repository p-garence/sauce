import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserActiveEmojiData } from '$lib/server/emojis';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'Non authentifié' }, { status: 401 });
	}

	try {
		const data = await getUserActiveEmojiData(locals.user.id);
		return json(data);
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Erreur interne';
		return json({ error: message }, { status: 500 });
	}
};
