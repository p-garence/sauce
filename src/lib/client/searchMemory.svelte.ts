import type { PostData, UserSearchResult } from '$lib/types';

// Un dictionnaire qui stocke l'état de chaque composant de recherche par son "id"
type SearchCache = {
	query: string;
	results: (UserSearchResult | PostData)[];
	nextCursor: string | null;
	sortMode?: string;
};

export const searchMemory = $state<Record<string, SearchCache>>({});
