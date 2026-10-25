// src/lib/client/feedMemory.svelte.ts
import type { PostData } from '$lib/types';

export type MainFeedCacheData = {
	feedId: string;
	posts: PostData[];
	nextCursor: string | null;
	scrollY: number;
	timestamp: number;
};

// Limite le nombre de flux en mémoire
const MAX_FEED_ENTRIES = 5;

export const mainFeedMemory = $state<Record<string, MainFeedCacheData>>({});

/**
 * Sauvegarde l'état complet d'un flux principal (posts, curseur, scroll)
 */
export function saveMainFeedState(
	feedId: string,
	posts: PostData[],
	nextCursor: string | null,
	scrollY: number = 0
) {
	const key = feedId || 'default';

	mainFeedMemory[key] = {
		feedId: key,
		posts,
		nextCursor,
		scrollY,
		timestamp: Date.now()
	};

	// Nettoyage LRU si dépassement
	const keys = Object.keys(mainFeedMemory);
	if (keys.length > MAX_FEED_ENTRIES) {
		let oldestKey = keys[0];
		let oldestTime = mainFeedMemory[oldestKey].timestamp;

		for (const k of keys) {
			if (mainFeedMemory[k].timestamp < oldestTime) {
				oldestTime = mainFeedMemory[k].timestamp;
				oldestKey = k;
			}
		}
		delete mainFeedMemory[oldestKey];
	}
}

/**
 * Récupère l'état sauvegardé d'un flux principal
 */
export function getMainFeedState(feedId: string): MainFeedCacheData | null {
	const key = feedId || 'default';
	return mainFeedMemory[key] || null;
}

/**
 * Met à jour uniquement la position de scroll enregistrée
 */
export function updateMainFeedScroll(feedId: string, scrollY: number) {
	const key = feedId || 'default';
	if (mainFeedMemory[key]) {
		mainFeedMemory[key].scrollY = scrollY;
	}
}

/**
 * Supprime un post de tous les flux en cache
 */
export function removePostFromMainFeedMemory(postId: string) {
	for (const key of Object.keys(mainFeedMemory)) {
		if (mainFeedMemory[key]) {
			mainFeedMemory[key].posts = mainFeedMemory[key].posts.filter((p) => p.id !== postId);
		}
	}
}

/**
 * Réinitialise la mémoire d'un flux spécifique ou de tous les flux
 */
export function clearMainFeedState(feedId?: string) {
	if (feedId !== undefined) {
		const key = feedId || 'default';
		delete mainFeedMemory[key];
	} else {
		for (const k of Object.keys(mainFeedMemory)) {
			delete mainFeedMemory[k];
		}
	}
}

/**
 * Invalide le cache des flux pour forcer la synchronisation avec le serveur
 * lors du prochain affichage du flux (publication, suppression, mise à jour des réglages).
 */
export function invalidateFeedMemory(feedId?: string) {
	clearMainFeedState(feedId);
}
