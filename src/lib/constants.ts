/**
 * @module lib/constants
 * @description Constantes et énumérations techniques immuables de l'application.
 *
 * NOTE : Les constantes dynamiques configurables par l'instance (performances, pagination,
 * quotas de stockage, visibilités par défaut, configurations de flux) sont désormais
 * gérées dans les paramètres d'instance ($lib/server/instanceSettings et page.data.instanceSettings).
 */

export function clampLimit(
	raw: string | number | null | undefined,
	defaultLimit: number,
	maxLimit: number
): number {
	const parsed = typeof raw === 'number' ? raw : parseInt(String(raw ?? ''), 10);
	if (Number.isNaN(parsed) || parsed < 1) return defaultLimit;
	return Math.min(parsed, maxLimit);
}

export interface EditorFont {
	id: string;
	label: string;
	family: string;
	weight: string;
}

export const EDITOR_FONTS: EditorFont[] = [
	{
		id: 'modern',
		label: 'Moderne',
		family:
			'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
		weight: '700'
	},
	{
		id: 'elegant',
		label: 'Élégant',
		family: 'ui-serif, Georgia, "Times New Roman", Times, serif',
		weight: '700'
	},
	{
		id: 'impact',
		label: 'Impact',
		family: 'Impact, "Arial Black", Haettenschweiler, sans-serif',
		weight: '900'
	},
	{
		id: 'script',
		label: 'Script',
		family: '"Caveat", "Brush Script MT", "Comic Sans MS", cursive',
		weight: '600'
	},
	{
		id: 'mono',
		label: 'Mono',
		family: 'ui-monospace, "SF Mono", "Courier New", Courier, monospace',
		weight: '700'
	},
	{ id: 'classic', label: 'Classique', family: 'Arial, Helvetica, sans-serif', weight: '600' }
];

export const EDITOR_COLORS: string[] = [
	'#ffffff',
	'#000000',
	'#facc15',
	'#ef4444',
	'#3b82f6',
	'#22c55e',
	'#ec4899',
	'#a855f7',
	'#f97316'
];

export const VALID_POST_VISIBILITIES = [
	'public',
	'followers',
	'group',
	'private',
	'network'
] as const;

export const VALID_FEED_SORT_MODES = [
	'chrono',
	'trending',
	'oldest',
	'discussed',
	'random'
] as const;

export const VALID_FEED_TIME_WINDOWS = ['24h', '7d', '30d', 'all'] as const;

export const VALID_FEED_SOURCES = ['public', 'following', 'groups', 'blend'] as const;
