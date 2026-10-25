/**
 * @module server/posts/sorting
 * @description Construction des clauses SQL de tri, de pagination par curseur et de calcul de score pour les posts.
 */

import crypto from 'node:crypto';
import { sql, lt, gt, eq, or, and, desc, asc, type SQL } from 'drizzle-orm';
import { posts } from '$lib/server/db/schema';
import type { FeedSortMode, PostData } from '$lib/types';
import type { CursorData } from '../cursor';

/**
 * Expression SQL calculant le score de tendance dynamique (likes, commentaires, décroissance temporelle exponentielle).
 */
export const trendingScoreSql = sql<number>`((${posts.likesCount} * 1.0 + COALESCE(${posts.commentsCount}, 0) * 2.0 + 1.0) / POW(GREATEST(0.0, EXTRACT(EPOCH FROM (NOW() - ${posts.createdAt})) / 3600.0) + 2.0, 1.2))`;

/**
 * Génère l'expression SQL de hachage aléatoire pour un seed donné.
 *
 * @param randomSeed Graine pseudo-aléatoire
 */
export function randomHashSql(randomSeed: string): SQL<string> {
	return sql<string>`md5(${posts.id} || ':' || ${randomSeed})`;
}

/**
 * Construit les conditions SQL temporelles, les conditions de curseur et la clause ORDER BY.
 *
 * @param sortMode Mode de tri sélectionné ('chrono', 'trending', 'discussed', 'oldest', 'random')
 * @param cursor Curseur de pagination fourni par le client
 * @param timeWindow Fenêtre temporelle ('24h', '7d', '30d', 'all')
 * @returns Conditions à ajouter au WHERE, la clause ORDER BY et la graine aléatoire éventuelle
 */
export function buildSortStrategy(
	sortMode: FeedSortMode,
	cursor?: CursorData | null,
	timeWindow = '7d'
): {
	conditions: SQL[];
	orderByClause: SQL[];
	randomSeed: string;
} {
	const conditions: SQL[] = [];

	// 1. Fenêtre temporelle pour les modes non-chrono
	if (sortMode !== 'chrono') {
		if (timeWindow === '24h') {
			conditions.push(sql`${posts.createdAt} >= NOW() - INTERVAL '24 HOURS'`);
		} else if (timeWindow === '30d') {
			conditions.push(sql`${posts.createdAt} >= NOW() - INTERVAL '30 DAYS'`);
		} else if (timeWindow !== 'all') {
			conditions.push(sql`${posts.createdAt} >= NOW() - INTERVAL '7 DAYS'`);
		}
	}

	let orderByClause: SQL[] = [desc(posts.createdAt), desc(posts.id)];
	let randomSeed = Math.random().toString(36).substring(2, 10);

	if (sortMode === 'trending') {
		if (cursor && (cursor.type === 'score' || cursor.type === 'trending')) {
			const lastScore = Number(cursor.lastValue);
			if (!Number.isNaN(lastScore)) {
				conditions.push(
					or(
						lt(trendingScoreSql, lastScore),
						and(
							sql`ABS(${trendingScoreSql} - ${lastScore}) < 0.000001`,
							lt(posts.id, cursor.lastId)
						)
					)!
				);
			}
		}
		orderByClause = [desc(trendingScoreSql), desc(posts.id)];
	} else if (sortMode === 'oldest') {
		if (cursor && (cursor.type === 'oldest' || cursor.type === 'chrono')) {
			const cursorDate = new Date(cursor.lastValue as string);
			if (!Number.isNaN(cursorDate.getTime())) {
				conditions.push(
					or(
						gt(posts.createdAt, cursorDate),
						and(eq(posts.createdAt, cursorDate), gt(posts.id, cursor.lastId))
					)!
				);
			}
		}
		orderByClause = [asc(posts.createdAt), asc(posts.id)];
	} else if (sortMode === 'discussed') {
		if (cursor && (cursor.type === 'discussed' || cursor.type === 'score')) {
			const lastComments = Number(cursor.lastValue);
			if (!Number.isNaN(lastComments)) {
				conditions.push(
					or(
						lt(posts.commentsCount, lastComments),
						and(eq(posts.commentsCount, lastComments), lt(posts.id, cursor.lastId))
					)!
				);
			}
		}
		orderByClause = [desc(posts.commentsCount), desc(posts.id)];
	} else if (sortMode === 'random') {
		let lastHash: string | null = null;
		if (cursor && cursor.type === 'random' && cursor.lastValue) {
			try {
				const parsed =
					typeof cursor.lastValue === 'string' ? JSON.parse(cursor.lastValue) : cursor.lastValue;
				if (parsed.seed) randomSeed = parsed.seed;
				if (parsed.lastHash) lastHash = parsed.lastHash;
			} catch {
				randomSeed = String(cursor.lastValue);
			}
		}

		const hashSql = randomHashSql(randomSeed);
		if (lastHash) {
			conditions.push(
				or(gt(hashSql, lastHash), and(eq(hashSql, lastHash), gt(posts.id, cursor?.lastId || '')))!
			);
		}
		orderByClause = [asc(hashSql), asc(posts.id)];
	} else {
		// Par défaut : chrono descendant
		if (cursor && cursor.type === 'chrono') {
			const cursorDate = new Date(cursor.lastValue as string);
			if (!Number.isNaN(cursorDate.getTime())) {
				conditions.push(
					or(
						lt(posts.createdAt, cursorDate),
						and(eq(posts.createdAt, cursorDate), lt(posts.id, cursor.lastId))
					)!
				);
			}
		}
	}

	return { conditions, orderByClause, randomSeed };
}

/**
 * Construit le curseur suivant à partir du dernier post retourné.
 *
 * @param lastPost Dernier élément retourné de la page actuelle
 * @param sortMode Mode de tri appliqué
 * @param randomSeed Graine aléatoire active (pour le tri random)
 */
export function buildNextCursor(
	lastPost: PostData,
	sortMode: FeedSortMode,
	randomSeed: string
): CursorData {
	if (sortMode === 'trending') {
		const hoursAge = Math.max(
			0,
			(Date.now() - new Date(lastPost.createdAt).getTime()) / (1000 * 3600)
		);
		const score =
			(lastPost.likesCount * 1.0 + (lastPost.commentsCount || 0) * 2.0 + 1.0) /
			Math.pow(hoursAge + 2.0, 1.2);
		return {
			type: 'score',
			lastValue: score,
			lastId: lastPost.id
		};
	}

	if (sortMode === 'oldest') {
		return {
			type: 'oldest',
			lastValue: lastPost.createdAt.toISOString(),
			lastId: lastPost.id
		};
	}

	if (sortMode === 'discussed') {
		return {
			type: 'discussed',
			lastValue: lastPost.commentsCount || 0,
			lastId: lastPost.id
		};
	}

	if (sortMode === 'random') {
		const postHash = crypto.createHash('md5').update(`${lastPost.id}:${randomSeed}`).digest('hex');
		return {
			type: 'random',
			lastValue: JSON.stringify({ seed: randomSeed, lastHash: postHash }),
			lastId: lastPost.id
		};
	}

	return {
		type: 'chrono',
		lastValue: lastPost.createdAt.toISOString(),
		lastId: lastPost.id
	};
}
