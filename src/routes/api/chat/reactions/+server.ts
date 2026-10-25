import { json } from '@sveltejs/kit';
import { requireApiSession } from '$lib/server/auth';
import { toggleMessageReaction } from '$lib/server/chat';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const session = await requireApiSession(request);
	const body = await request.json().catch(() => null);

	if (!body || !body.messageId || !body.emoji) {
		return json({ error: 'Données invalides' }, { status: 400 });
	}

	try {
		const result = await toggleMessageReaction(body.messageId, session.user.id, body.emoji);
		return json({ success: true, ...result });
	} catch (err: unknown) {
		console.error('Erreur réaction message chat:', err);
		const message = err instanceof Error ? err.message : 'Erreur serveur';
		return json({ error: message }, { status: 400 });
	}
};
