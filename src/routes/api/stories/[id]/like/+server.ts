import { json } from '@sveltejs/kit';
import { requireApiSession } from '$lib/server/auth';
import { toggleStoryLike } from '$lib/server/stories';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request }) => {
	const session = await requireApiSession(request);
	const storyId = params.id;

	if (!storyId) {
		return json({ success: false, message: 'ID de story manquant' }, { status: 400 });
	}

	let action: 'like' | 'unlike' | undefined;
	try {
		const body = await request.json();
		if (body.action === 'like' || body.action === 'unlike') {
			action = body.action;
		}
	} catch {
		// Body optionnel si on fait un toggle simple
	}

	try {
		const result = await toggleStoryLike(storyId, session.user.id, action);
		return json(result);
	} catch (err: unknown) {
		console.error('Erreur POST /api/stories/[id]/like:', err);
		const message = err instanceof Error ? err.message : 'Erreur interne';
		return json({ success: false, message }, { status: 500 });
	}
};
