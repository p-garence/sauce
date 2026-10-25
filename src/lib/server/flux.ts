/**
 * @module server/flux
 * @description Gestion des flux personnalisés (CRUD, flux actif, parsing FormData).
 */

import { db } from '$lib/server/db';
import { userFeeds, user as userTable } from '$lib/server/db/schema';
import { eq, count, and } from 'drizzle-orm';
import { DEFAULT_FEED_CONFIG, VALID_FEED_SORT_MODES, VALID_FEED_TIME_WINDOWS } from '$lib/constants';
import type { FeedSortMode, FeedTimeWindow } from '$lib/types';
import { parseTagsInput } from '$lib/utils/validation';

export interface FeedConfigInput {
	name: string;
	source: 'public' | 'following' | 'groups' | 'blend' | 'rss';
	groupIds?: string[];
	excludedGroupIds?: string[];
	contentTypeFilterMode?: 'all' | 'include' | 'exclude';
	contentTypes?: string[];
	carouselContentTypeFilterMode?: 'all' | 'include' | 'exclude';
	carouselContentTypes?: string[];
	tagFilterMode?: 'all' | 'include' | 'exclude';
	includeTags?: string[];
	rssUrls?: string[];
	sortMode?: FeedSortMode;
	timeWindow?: FeedTimeWindow;
	hideSeen?: boolean;
	showStories?: boolean;
	blendFeedAId?: string | null;
	blendFeedBId?: string | null;
	blendRatio?: number;
}

/**
 * Extrait et valide les paramètres d'un flux utilisateur depuis un objet FormData.
 *
 * @param data Objet FormData reçu d'une requête d'action SvelteKit
 * @returns Données de configuration du flux prêtes à l'enregistrement
 */
export function parseFeedFormData(data: FormData): FeedConfigInput {
	const name = (data.get('name') as string)?.trim() || '';
	const source = ((data.get('source') as string) || 'public') as
		| 'public'
		| 'following'
		| 'groups'
		| 'blend'
		| 'rss';

	const groupIds = data
		.getAll('groupIds')
		.map((id) => String(id))
		.filter(Boolean);
	const excludedGroupIds = data
		.getAll('excludedGroupIds')
		.map((id) => String(id))
		.filter(Boolean);

	const contentTypeFilterMode = ((data.get('contentTypeFilterMode') as string) || 'all') as
		| 'all'
		| 'include'
		| 'exclude';
	const contentTypes = data
		.getAll('contentTypes')
		.map((t) => String(t))
		.filter(Boolean);

	const carouselContentTypeFilterMode = ((data.get('carouselContentTypeFilterMode') as string) ||
		'all') as 'all' | 'include' | 'exclude';
	const carouselContentTypes = data
		.getAll('carouselContentTypes')
		.map((t) => String(t))
		.filter(Boolean);

	const tagFilterMode = ((data.get('tagFilterMode') as string) || 'all') as
		| 'all'
		| 'include'
		| 'exclude';

	const includeTags = parseTagsInput(data.get('includeTags'));

	const rawSortMode = data.get('sortMode') as string;
	const sortMode: FeedSortMode = (
		(VALID_FEED_SORT_MODES as readonly string[]).includes(rawSortMode) ? rawSortMode : 'chrono'
	) as FeedSortMode;

	const rawTimeWindow = data.get('timeWindow') as string;
	const timeWindow: FeedTimeWindow = (
		(VALID_FEED_TIME_WINDOWS as readonly string[]).includes(rawTimeWindow) ? rawTimeWindow : '7d'
	) as FeedTimeWindow;

	const hideSeen = data.get('hideSeen') === 'true' || data.get('hideSeen') === 'on';
	const showStories = data.get('showStories') === 'true' || data.get('showStories') === 'on';

	const blendFeedAId = (data.get('blendFeedAId') as string) || null;
	const blendFeedBId = (data.get('blendFeedBId') as string) || null;
	const rawRatio = parseInt((data.get('blendRatio') as string) || '50', 10);
	const blendRatio = isNaN(rawRatio) ? 50 : Math.max(5, Math.min(95, rawRatio));

	const rssUrls = data
		.getAll('rssUrls')
		.map((u) => String(u).trim())
		.filter(Boolean);

	return {
		name,
		source,
		groupIds,
		excludedGroupIds,
		contentTypeFilterMode,
		contentTypes,
		carouselContentTypeFilterMode,
		carouselContentTypes,
		tagFilterMode,
		includeTags,
		rssUrls,
		sortMode,
		timeWindow,
		hideSeen,
		showStories,
		blendFeedAId,
		blendFeedBId,
		blendRatio
	};
}

export async function getUserFeeds(userId: string, currentActiveFeedId: string | null | undefined) {
	let feeds = await db.query.userFeeds.findMany({
		where: eq(userFeeds.userId, userId),
		orderBy: (f, { desc }) => [desc(f.createdAt)]
	});

	let activeFeedId = currentActiveFeedId || null;

	// 1. Si aucun flux, on crée le flux par défaut
	if (feeds.length === 0) {
		const [defaultFeed] = await db
			.insert(userFeeds)
			.values({
				userId,
				...DEFAULT_FEED_CONFIG
			})
			.returning();

		feeds = [defaultFeed];

		if (!activeFeedId) {
			await db
				.update(userTable)
				.set({ activeFeedId: defaultFeed.id })
				.where(eq(userTable.id, userId));
			activeFeedId = defaultFeed.id;
		}
	}

	// 2. Sécurité : si le flux actif demandé a été supprimé ou n'existe pas, on prend le premier
	if (!activeFeedId || !feeds.some((f) => f.id === activeFeedId)) {
		activeFeedId = feeds[0].id;
	}

	return { feeds, activeFeedId };
}

/**
 * Crée un nouveau flux utilisateur personnalisé.
 */
export async function createUserFeed(userId: string, input: FeedConfigInput) {
	const trimmedName = input.name?.trim();
	if (!trimmedName) {
		throw new Error('Le nom est requis.');
	}

	if (input.source === 'blend') {
		if (!input.blendFeedAId || !input.blendFeedBId) {
			throw new Error('Veuillez sélectionner deux flux distincts pour la fusion.');
		}
		if (input.blendFeedAId === input.blendFeedBId) {
			throw new Error('Les deux flux à fusionner doivent être différents.');
		}
	}

	if (input.source === 'rss') {
		const cleanUrls = (input.rssUrls || [])
			.map((u) => u.trim())
			.filter((u) => u.startsWith('http://') || u.startsWith('https://'));
		if (cleanUrls.length === 0) {
			throw new Error('Veuillez ajouter au moins une URL de flux RSS valide (http:// ou https://).');
		}
	}

	const rawRatio = input.blendRatio ?? 50;
	const blendRatio = Math.max(5, Math.min(95, rawRatio));
	const rssUrls = input.source === 'rss' ? (input.rssUrls || []).map((u) => u.trim()).filter(Boolean) : [];

	const [created] = await db
		.insert(userFeeds)
		.values({
			userId,
			name: trimmedName.substring(0, 50),
			source: input.source,
			groupIds: input.source === 'rss' ? [] : input.groupIds || [],
			excludedGroupIds: input.source === 'rss' ? [] : input.excludedGroupIds || [],
			contentTypeFilterMode: input.source === 'rss' ? 'all' : input.contentTypeFilterMode || 'all',
			contentTypes: input.source === 'rss' ? [] : input.contentTypes || [],
			carouselContentTypeFilterMode: input.source === 'rss' ? 'all' : input.carouselContentTypeFilterMode || 'all',
			carouselContentTypes: input.source === 'rss' ? [] : input.carouselContentTypes || [],
			tagFilterMode: input.source === 'rss' ? 'all' : input.tagFilterMode || 'all',
			includeTags: input.source === 'rss' ? [] : input.includeTags || [],
			rssUrls,
			sortMode: input.sortMode || 'chrono',
			timeWindow: input.timeWindow || '7d',
			hideSeen: input.source === 'rss' ? false : Boolean(input.hideSeen),
			showStories: input.source === 'rss' ? false : Boolean(input.showStories),
			blendFeedAId: input.source === 'blend' ? input.blendFeedAId : null,
			blendFeedBId: input.source === 'blend' ? input.blendFeedBId : null,
			blendRatio: input.source === 'blend' ? blendRatio : 50
		})
		.returning();

	return created;
}

/**
 * Met à jour les paramètres d'un flux utilisateur existant.
 */
export async function updateUserFeed(userId: string, feedId: string, input: FeedConfigInput) {
	const trimmedName = input.name?.trim();
	if (!feedId || !trimmedName) {
		throw new Error('Données manquantes.');
	}

	if (input.source === 'blend') {
		if (!input.blendFeedAId || !input.blendFeedBId) {
			throw new Error('Veuillez sélectionner deux flux distincts pour la fusion.');
		}
		if (input.blendFeedAId === input.blendFeedBId) {
			throw new Error('Les deux flux à fusionner doivent être différents.');
		}
		if (feedId === input.blendFeedAId || feedId === input.blendFeedBId) {
			throw new Error('Un flux ne peut pas être fusionné avec lui-même.');
		}
	}

	if (input.source === 'rss') {
		const cleanUrls = (input.rssUrls || [])
			.map((u) => u.trim())
			.filter((u) => u.startsWith('http://') || u.startsWith('https://'));
		if (cleanUrls.length === 0) {
			throw new Error('Veuillez ajouter au moins une URL de flux RSS valide (http:// ou https://).');
		}
	}

	const rawRatio = input.blendRatio ?? 50;
	const blendRatio = Math.max(5, Math.min(95, rawRatio));
	const rssUrls = input.source === 'rss' ? (input.rssUrls || []).map((u) => u.trim()).filter(Boolean) : [];

	const [updated] = await db
		.update(userFeeds)
		.set({
			name: trimmedName.substring(0, 50),
			source: input.source,
			groupIds: input.source === 'rss' ? [] : input.groupIds || [],
			excludedGroupIds: input.source === 'rss' ? [] : input.excludedGroupIds || [],
			contentTypeFilterMode: input.source === 'rss' ? 'all' : input.contentTypeFilterMode || 'all',
			contentTypes: input.source === 'rss' ? [] : input.contentTypes || [],
			carouselContentTypeFilterMode: input.source === 'rss' ? 'all' : input.carouselContentTypeFilterMode || 'all',
			carouselContentTypes: input.source === 'rss' ? [] : input.carouselContentTypes || [],
			tagFilterMode: input.source === 'rss' ? 'all' : input.tagFilterMode || 'all',
			includeTags: input.source === 'rss' ? [] : input.includeTags || [],
			rssUrls,
			sortMode: input.sortMode || 'chrono',
			timeWindow: input.timeWindow || '7d',
			hideSeen: input.source === 'rss' ? false : Boolean(input.hideSeen),
			showStories: input.source === 'rss' ? false : Boolean(input.showStories),
			blendFeedAId: input.source === 'blend' ? input.blendFeedAId : null,
			blendFeedBId: input.source === 'blend' ? input.blendFeedBId : null,
			blendRatio: input.source === 'blend' ? blendRatio : 50
		})
		.where(and(eq(userFeeds.id, feedId), eq(userFeeds.userId, userId)))
		.returning();

	if (!updated) {
		throw new Error('Flux introuvable ou non autorisé.');
	}

	return updated;
}

/**
 * Supprime un flux utilisateur (interdit s'il n'en reste qu'un).
 */
export async function deleteUserFeed(userId: string, feedId: string) {
	if (!feedId) throw new Error('ID manquant.');

	const [{ value: feedCount }] = await db
		.select({ value: count() })
		.from(userFeeds)
		.where(eq(userFeeds.userId, userId));

	if (feedCount <= 1) {
		throw new Error('Vous devez garder au moins un flux.');
	}

	const [deleted] = await db
		.delete(userFeeds)
		.where(and(eq(userFeeds.id, feedId), eq(userFeeds.userId, userId)))
		.returning();

	if (!deleted) {
		throw new Error('Flux introuvable ou non autorisé.');
	}

	const currentUser = await db.query.user.findFirst({
		where: eq(userTable.id, userId),
		columns: { activeFeedId: true }
	});

	if (currentUser?.activeFeedId === feedId) {
		const nextFeed = await db.query.userFeeds.findFirst({
			where: eq(userFeeds.userId, userId),
			orderBy: (feeds, { desc }) => [desc(feeds.createdAt)],
			columns: { id: true }
		});
		await db
			.update(userTable)
			.set({ activeFeedId: nextFeed?.id ?? null })
			.where(eq(userTable.id, userId));
	}

	return deleted;
}
