import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { toggleInstanceDefaultEmojiSetForUser } from '$lib/server/emojis';

export const POST: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		throw error(401, 'Non authentifié');
	}

	try {
		const res = await toggleInstanceDefaultEmojiSetForUser(locals.user.id, params.id);
		return json({ success: true, ...res });
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : 'Erreur lors de la mise à jour';
		return json({ error: msg }, { status: 400 });
	}
};
