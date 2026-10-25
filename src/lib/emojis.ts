/**
 * Nettoie un nom ou un identifiant d'emoji :
 * - Supprime les accents (é -> e, ç -> c)
 * - Convertit en minuscules
 * - Remplace les espaces et caractères spéciaux par '_'
 * - Retire les '_' au début et à la fin
 */
export function cleanEmojiToken(value: string, maxLength = 30): string {
	return (value || '')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9_]+/g, '_')
		.replace(/^_+|_+$/g, '')
		.slice(0, maxLength);
}

