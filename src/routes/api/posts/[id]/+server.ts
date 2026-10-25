import { json } from '@sveltejs/kit';
import { requireApiSession, getOptionalSession } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { posts } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { deleteMediaFiles } from '$lib/server/media';
import { getPostById } from '$lib/server/posts';
import type { RequestHandler } from './$types';
import type { CarouselItem } from '$lib/types';

export const GET: RequestHandler = async ({ params, request }) => {
	const session = await getOptionalSession(request);
	const postId = params.id;

	if (!postId) return json({ error: 'ID du post manquant' }, { status: 400 });

	try {
		const post = await getPostById(postId, session?.user?.id ?? null);
		if (!post) {
			return json({ error: 'Post introuvable ou non autorisé' }, { status: 404 });
		}
		return json({ post });
	} catch (error) {
		console.error('Erreur get post by id:', error);
		return json({ error: 'Erreur interne' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, request }) => {
	const session = await requireApiSession(request);
	const postId = params.id;

	if (!postId) return json({ error: 'ID du post manquant' }, { status: 400 });

	try {
		// 1. On récupère le post pour avoir les médias à supprimer du disque
		const targetPost = await db.query.posts.findFirst({
			where: eq(posts.id, postId)
		});

		if (!targetPost) {
			return json({ error: 'Post introuvable' }, { status: 404 });
		}

		const isOwner = targetPost.authorId === session.user.id;
		const isAdmin = session.user.role === 'admin';

		if (!isOwner && !isAdmin) {
			return json({ error: 'Action non autorisée' }, { status: 403 });
		}

		// 2. Suppression BDD (onDelete: cascade gère les likes, commentaires, vues)
		await db.delete(posts).where(eq(posts.id, postId));

		// 3. Nettoyage du disque (Images/Vidéos)
		await deleteMediaFiles(targetPost.mediaUrls as CarouselItem[] | null);

		return json({ success: true });
	} catch (error) {
		console.error('Erreur lors de la suppression du post:', error);
		return json({ error: 'Erreur interne' }, { status: 500 });
	}
};
