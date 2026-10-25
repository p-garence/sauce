/**
 * @module server/posts/blend
 * @description Calcul et entrelacement proportionnel (interleaving) de flux multiples pour les flux composites (blend).
 */

import { userFeeds } from '$lib/server/db/schema';
import type { PostData } from '$lib/types';
import type { CursorData } from '../cursor';
import { getFilteredPosts } from './feed';

/**
 * Calcule et intercale les posts provenant de deux flux configurés (Feed A et Feed B)
 * selon un ratio pondéré (ex: 70/30) avec déduplication et gestion de curseur composite.
 *
 * @param userId - ID de l'utilisateur demandeur
 * @param feedConfig - Configuration du flux composite
 * @param limitCount - Nombre de posts à retourner
 * @param cursor - Curseur de pagination composite
 * @param depth - Profondeur de récursion maximale pour éviter les boucles infinies de blend
 * @param forceRefresh - Force le rafraîchissement des sous-flux
 */
export async function getBlendedFeedPosts(
	userId: string,
	feedConfig: typeof userFeeds.$inferSelect,
	limitCount: number,
	cursor?: CursorData | null,
	depth = 1,
	forceRefresh = false
): Promise<{ posts: PostData[]; nextCursor: CursorData | null }> {
	const feedAId = feedConfig.blendFeedAId;
	const feedBId = feedConfig.blendFeedBId;
	const ratio = Math.max(5, Math.min(95, feedConfig.blendRatio ?? 50));
	const hideSeen = feedConfig.hideSeen;

	// Repli de sécurité si un ou les deux flux n'existent pas
	if (!feedAId && !feedBId) {
		return getFilteredPosts(userId, null, limitCount, cursor, depth, hideSeen, forceRefresh);
	}
	if (!feedAId && feedBId) {
		return getFilteredPosts(userId, feedBId, limitCount, cursor, depth, hideSeen, forceRefresh);
	}
	if (feedAId && !feedBId) {
		return getFilteredPosts(userId, feedAId, limitCount, cursor, depth, hideSeen, forceRefresh);
	}

	// Décodage du sous-curseur composite { cursorA, cursorB, exhaustedA, exhaustedB }
	let cursorA: CursorData | null = null;
	let cursorB: CursorData | null = null;
	let exhaustedA = false;
	let exhaustedB = false;

	if (cursor && cursor.type === 'blend' && cursor.lastValue) {
		try {
			const parsed =
				typeof cursor.lastValue === 'string' ? JSON.parse(cursor.lastValue) : cursor.lastValue;
			cursorA = parsed.cursorA || null;
			cursorB = parsed.cursorB || null;
			exhaustedA = Boolean(parsed.exhaustedA);
			exhaustedB = Boolean(parsed.exhaustedB);
		} catch (e) {
			console.error('Erreur décodage curseur blend:', e);
		}
	}

	if (exhaustedA && exhaustedB) {
		return { posts: [], nextCursor: null };
	}

	// Calcul des quotas pour A et B selon le ratio
	let countA = Math.round((limitCount * ratio) / 100);
	let countB = limitCount - countA;
	if (countA <= 0) countA = 1;
	if (countB <= 0) countB = 1;

	if (exhaustedA) {
		countA = 0;
		countB = limitCount;
	} else if (exhaustedB) {
		countB = 0;
		countA = limitCount;
	}

	const [resA, resB] = await Promise.all([
		countA > 0 && feedAId
			? getFilteredPosts(userId, feedAId, countA, cursorA, depth, hideSeen, forceRefresh)
			: Promise.resolve({ posts: [] as PostData[], nextCursor: null as CursorData | null }),
		countB > 0 && feedBId
			? getFilteredPosts(userId, feedBId, countB, cursorB, depth, hideSeen, forceRefresh)
			: Promise.resolve({ posts: [] as PostData[], nextCursor: null as CursorData | null })
	]);

	// Marquer l'épuisement si le sous-flux n'a plus de pages
	if (countA > 0 && !resA.nextCursor) {
		exhaustedA = true;
	}
	if (countB > 0 && !resB.nextCursor) {
		exhaustedB = true;
	}

	// Interleaving proportionnel avec déduplication
	const combined: PostData[] = [];
	const seenIds = new Set<string>();

	let idxA = 0;
	let idxB = 0;
	const postsA = resA.posts;
	const postsB = resB.posts;

	let stepA = 0;
	let stepB = 0;

	while (idxA < postsA.length || idxB < postsB.length) {
		const canPickA = idxA < postsA.length;
		const canPickB = idxB < postsB.length;

		const pickA =
			canPickA && !canPickB
				? true
				: !canPickA && canPickB
					? false
					: (stepA + 1) * (100 - ratio) <= (stepB + 1) * ratio;

		if (pickA) {
			const post = postsA[idxA++];
			stepA++;
			if (!seenIds.has(post.id)) {
				seenIds.add(post.id);
				combined.push(post);
			}
		} else {
			const post = postsB[idxB++];
			stepB++;
			if (!seenIds.has(post.id)) {
				seenIds.add(post.id);
				combined.push(post);
			}
		}
	}

	let nextCursor: CursorData | null = null;
	if (!exhaustedA || !exhaustedB) {
		nextCursor = {
			type: 'blend',
			lastValue: JSON.stringify({
				cursorA: resA.nextCursor,
				exhaustedA,
				cursorB: resB.nextCursor,
				exhaustedB
			}),
			lastId: 'blend'
		};
	}

	return { posts: combined, nextCursor };
}
