import { json, isHttpError } from '@sveltejs/kit';
import { requireApiSession, getOptionalSession } from '$lib/server/auth';
import { getComments, createComment } from '$lib/server/comments';
import { getInstanceSettings } from '$lib/server/instanceSettings';
import { clampLimit } from '$lib/constants';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, url }) => {
	const session = await getOptionalSession(request);
	const settings = await getInstanceSettings();

	const postId = url.searchParams.get('postId');
	if (!postId) return json({ error: 'Post ID manquant' }, { status: 400 });

	const parentId = url.searchParams.get('parentId');
	const sort = url.searchParams.get('sort') || 'newest';
	const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
	const limit = clampLimit(
		url.searchParams.get('limit'),
		settings.performanceSettings.commentsPerLoad,
		settings.performanceSettings.maxCommentsPerRequest
	);

	try {
		const fetchedComments = await getComments({
			postId,
			viewerId: session?.user?.id ?? null,
			parentId,
			sort,
			page,
			limit
		});
		return json(fetchedComments);
	} catch (err) {
		if (isHttpError(err)) throw err;
		console.error('Erreur fetch comments:', err);
		return json({ error: 'Erreur serveur' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	const session = await requireApiSession(request);
	const { postId, content, parentId } = await request.json();

	if (!postId || typeof content !== 'string' || content.trim() === '') {
		return json({ error: 'Données invalides' }, { status: 400 });
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

	try {
		const newComment = await createComment({
			postId,
			authorId: session.user.id,
			content,
			parentId
		});
		return json(newComment);
	} catch (err) {
		if (isHttpError(err)) throw err;
		console.error('Erreur post comment:', err);
		return json({ error: 'Erreur serveur' }, { status: 500 });
	}
};
