export const POSTS_PER_SCROLL = 8;
export const POSTS_PER_GRID = 6;
export const TRENDING_TAGS_LIMIT = 10;

export const MESSAGES_PER_CHAT = 10;
export const NOTIFICATIONS_PER_LOAD = 10;
export const COMMENTS_PER_LOAD = 5;

export const USERS_PER_PAGE = 5;

export const MAX_POSTS_PER_REQUEST = 48;
export const MAX_COMMENTS_PER_REQUEST = 50;
export const MAX_COMMENT_LENGTH = 2000;
export const ADMIN_ITEMS_PER_PAGE = 20;
export const MAX_ADMIN_ITEMS_PER_REQUEST = 100;
export const MAX_USERS_SEARCH_LIMIT = 20;

export function clampLimit(
	raw: string | number | null | undefined,
	defaultLimit: number,
	maxLimit: number
): number {
	const parsed = typeof raw === 'number' ? raw : parseInt(String(raw ?? ''), 10);
	if (Number.isNaN(parsed) || parsed < 1) return defaultLimit;
	return Math.min(parsed, maxLimit);
}

export const DEFAULT_FEED_CONFIG = {
	name: 'Chronologique',
	source: 'public' as const,
	groupIds: [] as string[],
	excludedGroupIds: [] as string[],
	contentTypeFilterMode: 'all' as const,
	contentTypes: [] as string[],
	carouselContentTypeFilterMode: 'all' as const,
	carouselContentTypes: [] as string[],
	tagFilterMode: 'all' as const,
	includeTags: [] as string[],
	sortMode: 'chrono' as const,
	timeWindow: '7d' as const,
	hideSeen: false,
	showStories: true,
	blendFeedAId: null as string | null,
	blendFeedBId: null as string | null,
	blendRatio: 50
};

export const DEFAULT_GROUP_CONFIG = (id: string) => {
	return {
		ownerId: id,
		name: 'Amis proches',
		color: '#10b981' // Vert
	};
};

export const MAX_MEDIA_SIZE_MB = 1000;
export const MAX_MEDIA_SIZE_BYTES = MAX_MEDIA_SIZE_MB * 1024 * 1024;

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

export const DEFAULT_STORAGE_QUOTA_BYTES = 2 * 1024 * 1024 * 1024; // 2 Go
export const DEFAULT_MAX_INVITES = 10;
