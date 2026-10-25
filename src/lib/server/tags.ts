import { db } from '$lib/server/db';
import { tags, postTags, posts } from '$lib/server/db/schema';
import {
	eq,
	inArray,
	notInArray,
	and,
	desc,
	asc,
	sql,
	gte,
	exists,
	or,
	lt,
	gt,
	type SQL
} from 'drizzle-orm';
import { queryPosts, canSeePost, notHidden } from '$lib/server/posts';
import { POSTS_PER_GRID, TRENDING_TAGS_LIMIT } from '$lib/constants';
import type { PostData, PostSortMode } from '$lib/types';
import type { CursorData } from '$lib/server/cursor';
import { getOrSetCached, invalidateCachePrefix } from '$lib/server/cache';

/**
 * Normalise un nom de tag (minuscule, sans '#', max 50 caractères).
 */
export function normalizeTagName(tag: string): string {
	return tag.trim().toLowerCase().replace(/^#+/, '').slice(0, 50);
}

/**
 * Extrait automatiquement les tags d'un texte (supporte les lettres accentuées et chiffres).
 */
export function extractTags(text: string): string[] {
	if (!text) return [];
	const matches = text.match(/#([a-zA-Z0-9_\p{L}]+)/gu);
	if (!matches) return [];
	const cleaned = matches
		.map((t) => normalizeTagName(t))
		.filter((t) => t.length > 0 && t.length <= 50);
	return Array.from(new Set(cleaned));
}

/**
 * Associe des tags à un post (crée les tags s'ils n'existent pas encore).
 */
export function attachTagsToPost(postId: string, tagNames: string[]): Promise<void>;
export async function attachTagsToPost(postId: string, tagNames: string[]): Promise<void> {
	const normalized = Array.from(
		new Set(tagNames.map(normalizeTagName).filter((t) => t.length > 0))
	);
	if (normalized.length === 0) return;

	// 1. Insérer les tags manquants dans la table 'tags'
	await db
		.insert(tags)
		.values(normalized.map((name) => ({ name })))
		.onConflictDoNothing();

	// 2. Récupérer les identifiants de ces tags
	const dbTags = await db
		.select({ id: tags.id, name: tags.name })
		.from(tags)
		.where(inArray(tags.name, normalized));

	if (dbTags.length === 0) return;

	// 3. Lier les tags au post dans 'post_tags'
	await db
		.insert(postTags)
		.values(dbTags.map((t) => ({ postId, tagId: t.id })))
		.onConflictDoNothing();

	invalidateCachePrefix('trending_tags_');
}

/**
 * Synchronise les tags d'un post lors d'une modification (ajoute les nouveaux, supprime les retirés).
 */
export async function syncPostTags(postId: string, tagNames: string[]): Promise<void> {
	const normalized = Array.from(
		new Set(tagNames.map(normalizeTagName).filter((t) => t.length > 0))
	);

	if (normalized.length === 0) {
		await db.delete(postTags).where(eq(postTags.postId, postId));
		invalidateCachePrefix('trending_tags_');
		return;
	}

	// 1. Insérer les nouveaux tags dans 'tags'
	await db
		.insert(tags)
		.values(normalized.map((name) => ({ name })))
		.onConflictDoNothing();

	// 2. Récupérer les identifiants
	const dbTags = await db
		.select({ id: tags.id, name: tags.name })
		.from(tags)
		.where(inArray(tags.name, normalized));

	const targetTagIds = dbTags.map((t) => t.id);

	// 3. Supprimer les associations obsolètes
	if (targetTagIds.length > 0) {
		await db
			.delete(postTags)
			.where(and(eq(postTags.postId, postId), notInArray(postTags.tagId, targetTagIds)));
	}

	// 4. Insérer les associations
	await db
		.insert(postTags)
		.values(dbTags.map((t) => ({ postId, tagId: t.id })))
		.onConflictDoNothing();

	invalidateCachePrefix('trending_tags_');
}

/**
 * Récupère en lot les tags associés à une liste d'identifiants de posts.
 */
export async function getTagsForPosts(postIds: string[]): Promise<Record<string, string[]>> {
	if (postIds.length === 0) return {};

	const rows = await db
		.select({
			postId: postTags.postId,
			name: tags.name
		})
		.from(postTags)
		.innerJoin(tags, eq(postTags.tagId, tags.id))
		.where(inArray(postTags.postId, postIds));

	const map: Record<string, string[]> = {};
	for (const row of rows) {
		if (!map[row.postId]) {
			map[row.postId] = [];
		}
		map[row.postId].push(row.name);
	}
	return map;
}

/**
 * Récupère les tags populaires de la semaine (ou les plus populaires globaux en repli).
 */
export async function getTrendingTags(
	limit = TRENDING_TAGS_LIMIT,
	days = 7,
	viewerId?: string | null
): Promise<{ name: string; count: number }[]> {
	const cacheKey = `trending_tags_${limit}_${days}_${viewerId || 'anon'}`;

	return getOrSetCached(cacheKey, 180, async () => {
		const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
		const visibilityFilter = viewerId
			? canSeePost(viewerId)
			: inArray(posts.visibility, ['public', 'network']);

		const trending = await db
			.select({
				name: tags.name,
				count: sql<number>`count(${postTags.postId})::int`
			})
			.from(tags)
			.innerJoin(postTags, eq(tags.id, postTags.tagId))
			.innerJoin(posts, eq(postTags.postId, posts.id))
			.where(and(gte(postTags.createdAt, since), visibilityFilter))
			.groupBy(tags.id, tags.name)
			.orderBy(desc(sql`count(${postTags.postId})`), asc(tags.name))
			.limit(limit);

		if (trending.length < limit) {
			const existingNames = trending.map((t) => t.name);
			const remaining = limit - trending.length;

			const fallback = await db
				.select({
					name: tags.name,
					count: sql<number>`count(${postTags.postId})::int`
				})
				.from(tags)
				.innerJoin(postTags, eq(tags.id, postTags.tagId))
				.innerJoin(posts, eq(postTags.postId, posts.id))
				.where(
					existingNames.length > 0
						? and(notInArray(tags.name, existingNames), visibilityFilter)
						: visibilityFilter
				)
				.groupBy(tags.id, tags.name)
				.orderBy(desc(sql`count(${postTags.postId})`), asc(tags.name))
				.limit(remaining);

			trending.push(...fallback);
		}

		return trending;
	});
}

/**
 * Récupère les posts associés à un tag spécifique, avec pagination et tri (récent, populaire, ancien).
 */
export async function getPostsByTag(
	tagName: string,
	viewerId?: string | null,
	limitCount: number = POSTS_PER_GRID,
	sortMode: PostSortMode = 'chrono',
	cursor?: CursorData | null
): Promise<{
	posts: PostData[];
	nextCursor: CursorData | null;
	tag: { name: string; postCount: number } | null;
}> {
	const normalized = normalizeTagName(tagName);

	const foundTag = await db.query.tags.findFirst({
		where: eq(tags.name, normalized)
	});

	if (!foundTag) {
		return { posts: [], nextCursor: null, tag: null };
	}

	// Compte total de publications visibles pour ce tag
	const [{ count }] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(postTags)
		.innerJoin(posts, eq(postTags.postId, posts.id))
		.where(and(eq(postTags.tagId, foundTag.id), canSeePost(viewerId)));

	const hasTag = exists(
		db
			.select({ id: postTags.postId })
			.from(postTags)
			.where(and(eq(postTags.postId, posts.id), eq(postTags.tagId, foundTag.id)))
	);

	const conditions: (SQL | undefined)[] = [hasTag, canSeePost(viewerId)];
	if (viewerId) {
		conditions.push(notHidden(viewerId));
	}

	// Gestion du curseur
	if (cursor && cursor.lastValue !== undefined) {
		if (sortMode === 'popular') {
			const lastLikes = Number(cursor.lastValue);
			if (!Number.isNaN(lastLikes)) {
				conditions.push(
					or(
						lt(posts.likesCount, lastLikes),
						and(eq(posts.likesCount, lastLikes), lt(posts.id, cursor.lastId))
					)
				);
			}
		} else if (sortMode === 'oldest') {
			const cursorDate = new Date(cursor.lastValue as string);
			if (!Number.isNaN(cursorDate.getTime())) {
				conditions.push(gt(posts.createdAt, cursorDate));
			}
		} else {
			const cursorDate = new Date(cursor.lastValue as string);
			if (!Number.isNaN(cursorDate.getTime())) {
				conditions.push(lt(posts.createdAt, cursorDate));
			}
		}
	}

	let orderByClause = [desc(posts.createdAt), desc(posts.id)];
	if (sortMode === 'oldest') {
		orderByClause = [asc(posts.createdAt), asc(posts.id)];
	} else if (sortMode === 'popular') {
		orderByClause = [desc(posts.likesCount), desc(posts.id)];
	}

	const fetchedPosts = await queryPosts({
		where: and(...conditions),
		limit: limitCount,
		viewerId: viewerId || '',
		orderBy: orderByClause
	});

	let nextCursor: CursorData | null = null;
	if (fetchedPosts.length === limitCount) {
		const lastPost = fetchedPosts[fetchedPosts.length - 1];
		let lastValue: string | number = lastPost.createdAt.toISOString();
		if (sortMode === 'popular') {
			lastValue = lastPost.likesCount;
		}

		nextCursor = {
			type: `tag_${sortMode}` as CursorData['type'],
			lastValue,
			lastId: lastPost.id
		};
	}

	return {
		posts: fetchedPosts,
		nextCursor,
		tag: {
			name: foundTag.name,
			postCount: count
		}
	};
}
