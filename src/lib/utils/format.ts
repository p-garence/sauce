/**
 * @module utils/format
 * @description Fonctions utilitaires universelles (client & serveur) de formatage de données.
 */

/**
 * Formate un nombre d'octets en chaîne lisible (ex: "2.4 Mo", "512 Ko", "0 o").
 *
 * @param bytes Taille en octets à formater
 * @param decimals Nombre de décimales souhaitées (par défaut 1)
 * @returns Chaîne formatée avec l'unité adaptée
 */
export function formatBytes(bytes?: number | null, decimals: number = 1): string {
	if (!bytes || bytes <= 0) return '0 o';
	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ['o', 'Ko', 'Mo', 'Go', 'To'];
	const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
