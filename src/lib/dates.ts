/**
 * Utilitaires pour le formatage des dates en français (relatives et complètes).
 */

export interface FormatRelativeDateOptions {
	/** Mode compact pour les espaces réduits (ex: '2 h', '5 j', 'hier', '12 oct.') */
	compact?: boolean;
	/** Seuil en jours à partir duquel basculer vers une date absolue (par défaut : 90 jours / ~3 mois) */
	thresholdDays?: number;
	/** Inclure l'heure dans la date absolue si dépassé le seuil (ex: '15 juillet 2025 à 14:30') */
	includeTimeForAbsolute?: boolean;
	/** Heure de référence (par défaut : maintenant) */
	now?: number | Date;
}

const MONTH_NAMES_FR = [
	'janvier',
	'février',
	'mars',
	'avril',
	'mai',
	'juin',
	'juillet',
	'août',
	'septembre',
	'octobre',
	'novembre',
	'décembre'
];

const SHORT_MONTH_NAMES_FR = [
	'janv.',
	'févr.',
	'mars',
	'avr.',
	'mai',
	'juin',
	'juil.',
	'août',
	'sept.',
	'oct.',
	'nov.',
	'déc.'
];

/**
 * Convertit un input de date (Date, string, timestamp) en objet Date valide ou null.
 */
export function parseDate(date: Date | string | number | null | undefined): Date | null {
	if (date == null) return null;
	const d = date instanceof Date ? date : new Date(date);
	return isNaN(d.getTime()) ? null : d;
}

/**
 * Retourne la date au format ISO-8601 pour l'attribut datetime des balises <time>.
 */
export function formatDateISO(date: Date | string | number | null | undefined): string {
	const d = parseDate(date);
	return d ? d.toISOString() : '';
}

/**
 * Formate une date complète en français (ex: 'mardi 20 octobre 2026 à 23:42' ou '20 octobre 2026').
 */
export function formatFullDate(
	date: Date | string | number | null | undefined,
	options: { withTime?: boolean; withWeekday?: boolean } = {}
): string {
	const d = parseDate(date);
	if (!d) return '';

	const day = d.getDate();
	const month = MONTH_NAMES_FR[d.getMonth()];
	const year = d.getFullYear();

	let result = `${day} ${month} ${year}`;

	if (options.withWeekday) {
		const weekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' }).format(d);
		result = `${weekday} ${result}`;
	}

	if (options.withTime) {
		const hours = String(d.getHours()).padStart(2, '0');
		const minutes = String(d.getMinutes()).padStart(2, '0');
		result = `${result} à ${hours}:${minutes}`;
	}

	return result;
}

/**
 * Formate une date en relatif pour les dates récentes (« hier », « il y a 10 jours », « il y a 2 heures »)
 * et en date absolue française complète au-delà d'un seuil (par défaut 90 jours / ~3 mois).
 */
export function formatRelativeDate(
	date: Date | string | number | null | undefined,
	options: FormatRelativeDateOptions = {}
): string {
	const target = parseDate(date);
	if (!target) return '';

	const {
		compact = false,
		thresholdDays = 90,
		includeTimeForAbsolute = false,
		now: customNow
	} = options;

	const now = customNow ? parseDate(customNow) || new Date() : new Date();
	const diffMs = now.getTime() - target.getTime();
	const diffSec = Math.floor(diffMs / 1000);

	// Date dans le futur proche (décalage d'horloge serveur/client)
	if (diffSec < 5) {
		return "à l'instant";
	}

	// Calcul des jours calendaires
	const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
	const startOfTarget = new Date(
		target.getFullYear(),
		target.getMonth(),
		target.getDate()
	).getTime();
	const calendarDaysDiff = Math.round((startOfToday - startOfTarget) / (1000 * 60 * 60 * 24));

	// Dépassement du seuil (ex: 3 mois / 90 jours) -> Date complète française (pas format américain MM/DD/YYYY)
	if (calendarDaysDiff >= thresholdDays || diffMs >= thresholdDays * 86400 * 1000) {
		if (compact) {
			const isSameYear = now.getFullYear() === target.getFullYear();
			const day = target.getDate();
			const shortMonth = SHORT_MONTH_NAMES_FR[target.getMonth()];
			return isSameYear ? `${day} ${shortMonth}` : `${day} ${shortMonth} ${target.getFullYear()}`;
		}
		return formatFullDate(target, { withTime: includeTimeForAbsolute });
	}

	// 1. Moins d'une minute
	if (diffSec < 60) {
		return compact ? "à l'instant" : 'il y a quelques secondes';
	}

	// 2. Moins d'une heure
	if (diffSec < 3600) {
		const minutes = Math.floor(diffSec / 60);
		if (compact) return `${minutes} min`;
		return minutes <= 1 ? 'il y a 1 minute' : `il y a ${minutes} minutes`;
	}

	// 3. Aujourd'hui (moins de 24h et même jour calendaire)
	if (calendarDaysDiff === 0 && diffSec < 86400) {
		const hours = Math.floor(diffSec / 3600);
		if (compact) return `${hours} h`;
		return hours <= 1 ? 'il y a 1 heure' : `il y a ${hours} heures`;
	}

	// 4. Hier
	if (calendarDaysDiff === 1) {
		return 'hier';
	}

	// 5. Avant-hier
	if (calendarDaysDiff === 2) {
		return compact ? '2 j' : 'avant-hier';
	}

	// 6. Moins d'un mois (3 à 29 jours) : « il y a 10 jours », etc.
	if (calendarDaysDiff < 30) {
		if (compact) return `${calendarDaysDiff} j`;
		return `il y a ${calendarDaysDiff} jours`;
	}

	// 7. Entre 1 mois et le seuil (ex: 90 jours / 3 mois)
	const months = Math.max(1, Math.floor(calendarDaysDiff / 30));
	if (compact) return `${months} mois`;
	return months <= 1 ? 'il y a 1 mois' : `il y a ${months} mois`;
}
