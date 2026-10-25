import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { assertAdmin } from '$lib/server/admin';
import { toggleInstanceDefaultEmojiSet } from '$lib/server/instanceSettings';

export const POST: RequestHandler = async ({ params, locals }) => {
	assertAdmin(locals.user);

	try {
		const updated = await toggleInstanceDefaultEmojiSet(params.id);
		return json({ success: true, emojiSet: updated });
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : 'Erreur lors de la modification';
		return json({ error: msg }, { status: 400 });
	}
};
