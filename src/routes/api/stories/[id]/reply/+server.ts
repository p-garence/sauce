import { json } from '@sveltejs/kit';
import { requireApiSession } from '$lib/server/auth';
import { replyToStory } from '$lib/server/stories';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request }) => {
	const session = await requireApiSession(request);
	const storyId = params.id;

	if (!storyId) {
		return json({ success: false, message: 'ID de story manquant' }, { status: 400 });
	}

	try {
		const { message } = await request.json();
		if (!message || typeof message !== 'string' || !message.trim()) {
			return json({ success: false, message: 'Message requis' }, { status: 400 });
		}

		const result = await replyToStory(storyId, session.user.id, message);
		return json(result);
	} catch (err: unknown) {
		console.error('Erreur POST /api/stories/[id]/reply:', err);
		const message = err instanceof Error ? err.message : 'Erreur interne';
		return json({ success: false, message }, { status: 500 });
	}
};
