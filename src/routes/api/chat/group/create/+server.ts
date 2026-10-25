import { json, isHttpError } from '@sveltejs/kit';
import { requireApiSession } from '$lib/server/auth';
import { createGroupChat } from '$lib/server/chat';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const session = await requireApiSession(request);
	const body = await request.json().catch(() => null);

	if (
		!body ||
		!body.name ||
		!body.usernames ||
		!Array.isArray(body.usernames) ||
		body.usernames.length === 0
	) {
		return json({ error: 'Données invalides' }, { status: 400 });
	}

	try {
		// On délègue toute la logique complexe au Hub !
		const chatId = await createGroupChat(session.user.id, body.name, body.usernames);
		return json({ chatId });
	} catch (err) {
		if (isHttpError(err)) {
			return json({ error: err.body.message }, { status: err.status });
		}
		return json({ error: 'Erreur serveur lors de la création du groupe' }, { status: 500 });
	}
};
