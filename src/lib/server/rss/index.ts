import crypto from 'node:crypto';
import { fetchRssXml } from './fetcher';
import { parseRssOrAtomXml, type ParsedRssFeed, type ParsedRssItem } from './parser';
import { getOrSetCached, deleteCached } from '$lib/server/cache';
import type { CursorData } from '$lib/server/cursor';
import type { PostData, UserFeed } from '$lib/types';

/**
 * Extrait un nom de domaine propre à partir d'une URL.
 */
export function extractDomain(urlStr: string): string {
	try {
		const parsed = new URL(urlStr);
		return parsed.hostname.replace(/^www\./, '');
	} catch {
		return 'rss';
	}
}

/**
 * Génère une URL de favicon fiable pour un domaine donné.
 */
export function getFaviconForDomain(domainOrUrl: string): string {
	const domain = extractDomain(domainOrUrl.startsWith('http') ? domainOrUrl : `https://${domainOrUrl}`);
	return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
}

/**
 * Récupère et parse un flux RSS ou Atom avec mise en cache mémoire (10 minutes).
 * Si forceRefresh est activé, contourne et rafraîchit le cache.
 */
export async function fetchAndParseRssFeed(
	url: string,
	forceRefresh = false
): Promise<ParsedRssFeed | null> {
	const trimmedUrl = url.trim();
	if (!trimmedUrl) return null;

	const cacheKey = `rss_feed_${crypto.createHash('sha256').update(trimmedUrl).digest('hex')}`;

	if (forceRefresh) {
		deleteCached(cacheKey);
	}

	return getOrSetCached(cacheKey, 600, async () => {
		try {
			const { xml, status } = await fetchRssXml(trimmedUrl);
			if (status === 304 || !xml) {
				return null;
			}
			return parseRssOrAtomXml(xml, trimmedUrl);
		} catch (error) {
			console.warn(`[RSS] Échec de récupération pour ${trimmedUrl}:`, (error as Error).message);
			return null;
		}
	});
}

type CombinedRssItem = ParsedRssItem & {
	feedTitle: string;
	feedSiteUrl: string;
	feedDomain: string;
	feedFavicon: string;
};

/**
 * Récupère les publications d'un flux dont la source est 'rss', en agrégeant
 * toutes les URLs configurées, en les triant chronologiquement et en les paginant.
 */
export async function getRssFeedPosts(
	userId: string,
	feedConfig: UserFeed,
	limitCount: number,
	cursor?: CursorData | null,
	forceRefresh = false
): Promise<{ posts: PostData[]; nextCursor: CursorData | null }> {
	const rssUrls = (feedConfig.rssUrls || []).filter((u) => typeof u === 'string' && u.trim().length > 0);

	if (rssUrls.length === 0) {
		return { posts: [], nextCursor: null };
	}

	// Récupérer en parallèle tous les flux configurés
	const results = await Promise.allSettled(
		rssUrls.map((url) => fetchAndParseRssFeed(url, forceRefresh))
	);

	const allItems: CombinedRssItem[] = [];

	for (let i = 0; i < results.length; i++) {
		const res = results[i];
		const originalUrl = rssUrls[i];
		if (res.status === 'fulfilled' && res.value) {
			const feed = res.value;
			const domain = extractDomain(feed.siteUrl || originalUrl);
			const favicon = getFaviconForDomain(domain);

			for (const item of feed.items) {
				allItems.push({
					...item,
					feedTitle: feed.title || domain,
					feedSiteUrl: feed.siteUrl || originalUrl,
					feedDomain: domain,
					feedFavicon: favicon
				});
			}
		}
	}

	// Tri chronologique décroissant (articles les plus récents en premier)
	allItems.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

	// Pagination par curseur
	let filteredItems = allItems;
	if (cursor && cursor.lastValue) {
		const cursorDate = new Date(cursor.lastValue as string);
		if (!Number.isNaN(cursorDate.getTime())) {
			filteredItems = allItems.filter((item) => {
				const itemTime = item.publishedAt.getTime();
				const cursorTime = cursorDate.getTime();
				if (itemTime < cursorTime) return true;
				if (itemTime === cursorTime && cursor.lastId) {
					return item.guid < cursor.lastId;
				}
				return false;
			});
		}
	}

	// Découpage selon la limite demandée
	const pageItems = filteredItems.slice(0, limitCount);

	let nextCursor: CursorData | null = null;
	if (filteredItems.length > limitCount) {
		const lastItem = pageItems[pageItems.length - 1];
		nextCursor = {
			type: 'chrono',
			lastValue: lastItem.publishedAt.toISOString(),
			lastId: lastItem.guid
		};
	}

	// Transformation en PostData compatible avec InfiniteFeed et Post.svelte
	const posts: PostData[] = pageItems.map((item) => {
		const postId = `rss_${crypto.createHash('md5').update(item.guid || item.link).digest('hex').slice(0, 16)}`;

		return {
			id: postId,
			author: {
				id: 'rss',
				name: item.feedTitle,
				username: item.feedDomain,
				avatar: item.feedFavicon,
				isFollowing: false
			},
			groupId: null,
			content: null,
			postType: 'rss',
			mediaUrls: item.imageUrl ? [{ type: 'image', content: item.imageUrl }] : null,
			likesCount: 0,
			commentsCount: 0,
			createdAt: item.publishedAt,
			isLiked: false,
			isHidden: false,
			visibility: 'public',
			rssItem: {
				title: item.title,
				url: item.link,
				siteName: item.feedTitle,
				siteUrl: item.feedSiteUrl,
				faviconUrl: item.feedFavicon,
				summary: item.summary,
				imageUrl: item.imageUrl,
				publishedAt: item.publishedAt
			}
		};
	});

	return {
		posts,
		nextCursor
	};
}
