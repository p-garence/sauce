/**
 * @module server/customPacks/common
 * @description Utilitaires et validations partagés pour les collections personnalisées (emojis, icônes).
 */

/**
 * Valide si une URL fournie est une URL de ressource média valide (locale sécurisée ou distante HTTP/HTTPS).
 *
 * @param url Valeur à tester
 * @returns `true` si l'URL est conforme et sécurisée
 */
export function isValidAssetUrl(url: unknown): url is string {
	if (typeof url !== 'string' || url.length === 0 || url.length > 250000) return false;
	if (/["'<>\\\s]/.test(url)) return false;
	return (
		/^(?:\/[a-zA-Z0-9_-]+)*\/media\/[a-zA-Z0-9._-]+(\?[a-zA-Z0-9._~%&=-]*)?$/.test(url) ||
		/^https?:\/\/[^\s"'<>]+$/.test(url) ||
		/^data:image\/(png|jpeg|webp|gif);base64,[a-zA-Z0-9+/=]+$/i.test(url)
	);
}

/**
 * Nettoie et valide le nom d'un pack personnalisé.
 *
 * @param name Nom brut fourni
 * @param requiredMessage Message d'erreur si le nom est manquant
 * @param maxLength Longueur maximale autorisée (défaut 50)
 * @returns Le nom tronqué et nettoyé
 */
export function sanitizePackName(
	name: string | undefined | null,
	requiredMessage: string,
	maxLength = 50
): string {
	const trimmed = name?.trim();
	if (!trimmed) {
		throw new Error(requiredMessage);
	}
	return trimmed.slice(0, maxLength);
}
