import { json } from '@sveltejs/kit';
import { requireApiSession } from '$lib/server/auth';
import { recordStoryView } from '$lib/server/stories';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request }) => {
	const session = await requireApiSession(request);
	const storyId = params.id;

	if (!storyId) {
		return json({ success: false, message: 'ID de story manquant' }, { status: 400 });
	}

	try {
		const isNew = await recordStoryView(storyId, session.user.id);
		return json({ success: true, isNew });
	} catch (err) {
		console.error('Erreur POST /api/stories/[id]/view:', err);
		return json({ success: false }, { status: 500 });
	}
};
