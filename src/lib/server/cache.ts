/**
 * Micro-cache In-Memory léger pour Node.js.
 *
 * - Latence 0.001 ms (accès direct RAM).
 * - Zéro dépendance externe / zéro infrastructure requise.
 * - Conçu avec une interface standard (get, set, delete) qui permet
 *   une transition transparente vers Redis si l'application évolue un jour
 *   vers un cluster multi-serveurs.
 */

interface CacheEntry<T> {
	value: T;
	expiresAt: number;
}

const MAX_CACHE_ENTRIES = 1000;
const memoryCache = new Map<string, CacheEntry<unknown>>();

/**
 * Récupère une valeur du cache si elle existe et n'est pas expirée.
 */
export function getCached<T>(key: string): T | undefined {
	const entry = memoryCache.get(key);
	if (!entry) return undefined;

	if (Date.now() > entry.expiresAt) {
		memoryCache.delete(key);
		return undefined;
	}

	return entry.value as T;
}

/**
 * Enregistre une valeur dans le cache pour une durée donnée en secondes.
 */
export function setCached<T>(key: string, value: T, ttlSeconds: number): void {
	if (!memoryCache.has(key) && memoryCache.size >= MAX_CACHE_ENTRIES) {
		const now = Date.now();
		for (const [k, entry] of memoryCache.entries()) {
			if (now > entry.expiresAt) {
				memoryCache.delete(k);
			}
		}
		if (memoryCache.size >= MAX_CACHE_ENTRIES) {
			const oldestKey = memoryCache.keys().next().value;
			if (oldestKey !== undefined) {
				memoryCache.delete(oldestKey);
			}
		}
	}

	memoryCache.set(key, {
		value,
		expiresAt: Date.now() + ttlSeconds * 1000
	});
}

/**
 * Supprime une clé spécifique du cache.
 */
export function deleteCached(key: string): void {
	memoryCache.delete(key);
}

/**
 * Invalide toutes les clés commençant par un préfixe donné (ex: 'trending_tags_').
 */
export function invalidateCachePrefix(prefix: string): void {
	for (const key of memoryCache.keys()) {
		if (key.startsWith(prefix)) {
			memoryCache.delete(key);
		}
	}
}

/**
 * Helper d'exécution mémoïsée : renvoie la valeur en cache ou exécute le factory et met en cache.
 */
export async function getOrSetCached<T>(
	key: string,
	ttlSeconds: number,
	factory: () => Promise<T>
): Promise<T> {
	const cached = getCached<T>(key);
	if (cached !== undefined) {
		return cached;
	}

	const fresh = await factory();
	setCached(key, fresh, ttlSeconds);
	return fresh;
}
