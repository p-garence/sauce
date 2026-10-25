import { json } from '@sveltejs/kit';
import { requireApiSession } from '$lib/server/auth';
import { getProfilePosts, getLikedPosts } from '$lib/server/posts';
import { decodeCursor, encodeCursor } from '$lib/server/cursor';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import type { PostSortMode } from '$lib/types';
import { POSTS_PER_GRID, MAX_POSTS_PER_REQUEST, clampLimit } from '$lib/constants';

export const GET: RequestHandler = async ({ request, url }) => {
	const session = await requireApiSession(request);

	let authorId = url.searchParams.get('authorId');
	const username = url.searchParams.get('username'); // PostGrid utilise parfois username
	const type = url.searchParams.get('type') || 'posts';
	const sort = (url.searchParams.get('sort') as PostSortMode) || 'chrono';
	const numberOfPost = clampLimit(
		url.searchParams.get('numberOfPost'),
		POSTS_PER_GRID,
		MAX_POSTS_PER_REQUEST
	);

	// Décodage du curseur
	const cursorStr = url.searchParams.get('cursor');
	const cursorData = decodeCursor(cursorStr);

	// Si on a reçu un username mais pas d'ID, on cherche l'ID
	if (!authorId && username) {
		const [u] = await db.select({ id: user.id }).from(user).where(eq(user.username, username));
		if (u) authorId = u.id;
	}

	if (!authorId) return json({ error: 'Auteur manquant' }, { status: 400 });

	if (type === 'likes' && session.user.id !== authorId) {
		return json({ error: 'Accès refusé : les publications aimées sont privées.' }, { status: 403 });
	}

	try {
		let result;
		if (type === 'likes') {
			result = await getLikedPosts(session.user.id, authorId, numberOfPost, cursorData);
		} else {
			result = await getProfilePosts(session.user.id, authorId, numberOfPost, cursorData, sort);
		}

		return json({
			posts: result.posts,
			nextCursor: encodeCursor(result.nextCursor)
		});
	} catch (error) {
		console.error('Erreur infinite scroll:', error);
		return json({ error: 'Erreur serveur' }, { status: 500 });
	}
};
