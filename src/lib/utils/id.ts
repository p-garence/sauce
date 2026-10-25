/**
 * @module utils/id
 * @description Génération d'identifiants uniques côté client et serveur.
 */

/**
 * Génère un identifiant unique (UUID v4 si disponible dans l'environnement, sinon fallback aléatoire).
 *
 * @returns Identifiant unique sous forme de chaîne
 */
export function generateId(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		try {
			return crypto.randomUUID();
		} catch {
			/* ignore and fallback */
		}
	}
	return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9);
}
