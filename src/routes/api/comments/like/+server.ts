import { json, isHttpError } from '@sveltejs/kit';
import { requireApiSession } from '$lib/server/auth';
import { toggleCommentLike } from '$lib/server/comments';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const session = await requireApiSession(request);
	const { commentId, action } = await request.json();

	if (!commentId || (action !== 'like' && action !== 'unlike')) {
		return json({ error: 'Données invalides' }, { status: 400 });
	}

	try {
		await toggleCommentLike(session.user.id, commentId, action);
		return json({ success: true });
	} catch (error) {
		if (isHttpError(error)) throw error;
		console.error('Erreur toggle like comment:', error);
		return json({ error: 'Erreur serveur' }, { status: 500 });
	}
};
