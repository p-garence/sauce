/**
 * @module utils/validation
 * @description Fonctions universelles de validation et de normalisation des entrées (UUID, tags).
 */

/**
 * Expression régulière validant le format standard d'un UUID (v1-v5).
 */
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Vérifie si la valeur fournie est un UUID valide.
 *
 * @param id Valeur à tester
 * @returns `true` si la chaîne est un UUID valide
 */
export function isValidUuid(id: unknown): id is string {
	return typeof id === 'string' && UUID_REGEX.test(id);
}

/**
 * Expression régulière validant un nom d'utilisateur (3 à 30 caractères alphanumériques ou underscore).
 */
export const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

/**
 * Vérifie si la valeur fournie respecte le format d'un nom d'utilisateur.
 */
export function isValidUsername(username: unknown): username is string {
	return typeof username === 'string' && USERNAME_REGEX.test(username);
}

/**
 * Parse et normalise une entrée de tags (tableau JSON ou liste séparée par des virgules/espaces).
 * Supprime les symboles `#` initiaux et les entrées vides.
 *
 * @param raw Entrée brute issue d'un FormData ou d'un payload JSON
 * @returns Liste de tags nettoyés
 */
export function parseTagsInput(raw: unknown): string[] {
	if (!raw) return [];
	if (Array.isArray(raw)) {
		return raw
			.map((t) => String(t).trim().replace(/^#+/, ''))
			.filter(Boolean);
	}
	if (typeof raw !== 'string') return [];
	const trimmed = raw.trim();
	if (!trimmed) return [];

	try {
		const parsed = JSON.parse(trimmed);
		if (Array.isArray(parsed)) {
			return parsed
				.map((t) => String(t).trim().replace(/^#+/, ''))
				.filter(Boolean);
		}
	} catch {
		// Fallback : chaîne séparée par des virgules ou espaces
	}

	return trimmed
		.split(/[\s,]+/)
		.map((t) => t.trim().replace(/^#+/, ''))
		.filter(Boolean);
}
