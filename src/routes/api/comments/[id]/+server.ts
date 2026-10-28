import { json, isHttpError } from '@sveltejs/kit';
import { requireApiSession } from '$lib/server/auth';
import { updateComment, deleteComment } from '$lib/server/comments';
import { getInstanceSettings } from '$lib/server/instanceSettings';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ params, request }) => {
	const session = await requireApiSession(request);
	const commentId = params.id;

	if (!commentId) {
		return json({ error: 'ID de commentaire manquant' }, { status: 400 });
	}

	try {
		const body = await request.json();
		const content = body?.content;

		if (!content || typeof content !== 'string' || content.trim() === '') {
			return json({ error: 'Le contenu du commentaire ne peut pas être vide' }, { status: 400 });
		}

		const settings = await getInstanceSettings();
		if (content.trim().length > settings.performanceSettings.maxCommentLength) {
			return json(
				{
					error: `Le commentaire ne peut pas dépasser ${settings.performanceSettings.maxCommentLength} caractères.`
				},
				{ status: 400 }
			);
		}

		const updatedComment = await updateComment({
			commentId,
			userId: session.user.id,
			content
		});

		return json({ success: true, comment: updatedComment });
	} catch (err: unknown) {
		if (isHttpError(err)) throw err;
		console.error('Erreur PATCH /api/comments/[id]:', err);
		return json({ error: 'Erreur lors de la mise à jour du commentaire' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, request }) => {
	const session = await requireApiSession(request);
	const commentId = params.id;

	if (!commentId) {
		return json({ error: 'ID de commentaire manquant' }, { status: 400 });
	}

	try {
		const result = await deleteComment({
			commentId,
			userId: session.user.id,
			isAdmin: session.user.role === 'admin'
		});

		return json(result);
	} catch (err: unknown) {
		if (isHttpError(err)) throw err;
		console.error('Erreur DELETE /api/comments/[id]:', err);
		return json({ error: 'Erreur lors de la suppression du commentaire' }, { status: 500 });
	}
};
