// src/lib/client/profileMemory.svelte.ts
import type { PostData } from '$lib/types';

export type ProfileCacheData = {
	posts: PostData[];
	nextCursor: string | null;
	sortMode: string;
	timestamp: number;
};

// 8 entrées = 4 profils * 2 onglets (posts / likes)
const MAX_CACHE_ENTRIES = 8;

export const profileMemory = $state<Record<string, ProfileCacheData>>({});

export function saveProfileState(
	username: string,
	tab: 'posts' | 'likes',
	posts: PostData[],
	nextCursor: string | null,
	sortMode: string
) {
	const key = `${username}_${tab}`;

	profileMemory[key] = {
		posts,
		nextCursor,
		sortMode,
		timestamp: Date.now()
	};

	// Nettoyage LRU (Supprime le plus ancien si on dépasse la limite)
	const keys = Object.keys(profileMemory);
	if (keys.length > MAX_CACHE_ENTRIES) {
		let oldestKey = keys[0];
		let oldestTime = profileMemory[oldestKey].timestamp;

		for (const k of keys) {
			if (profileMemory[k].timestamp < oldestTime) {
				oldestTime = profileMemory[k].timestamp;
				oldestKey = k;
			}
		}
		delete profileMemory[oldestKey];
	}
}

export function getProfileState(username: string, tab: 'posts' | 'likes'): ProfileCacheData | null {
	const key = `${username}_${tab}`;
	return profileMemory[key] || null;
}

export function clearProfileState(username: string, tab: 'posts' | 'likes') {
	const key = `${username}_${tab}`;

	if (profileMemory[username] && profileMemory[key]) {
		delete profileMemory[key];
	}
}
