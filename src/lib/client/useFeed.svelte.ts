import { saveProfileState, getProfileState } from './profileMemory.svelte';
import { saveMainFeedState, getMainFeedState } from './feedMemory.svelte';
import type { PostData, PostSortMode, SerializedPost } from '$lib/types';
import { SvelteDate } from 'svelte/reactivity';

type FeedOptions = {
	username?: string;
	profileId?: string;
	feedType: 'posts' | 'likes' | 'flux';
	feedId?: string;
	initialPosts: PostData[];
	initialCursor: string | null;
	initialSortMode?: string;
	loadNumber: number;
};

// This function acts as a reusable state container for any feed
export function useFeed(optionsParam: FeedOptions | (() => FeedOptions)) {
	const getOpts = typeof optionsParam === 'function' ? optionsParam : () => optionsParam;
	const initial = getOpts();

	// 1. Try to load from cache
	let cache: {
		posts: PostData[];
		nextCursor: string | null;
		sortMode?: string;
		scrollY?: number;
	} | null = null;
	if (initial.username && (initial.feedType === 'posts' || initial.feedType === 'likes')) {
		cache = getProfileState(initial.username, initial.feedType);
	} else if (initial.feedType === 'flux') {
		cache = getMainFeedState(initial.feedId || '');
	}

	console.log(
		`Init Feed for ${initial.username || initial.feedId || 'flux'} ${initial.feedType} from ${cache?.posts ? 'cache:' + cache?.posts.length : 'server:' + initial.initialPosts.length}`
	);

	// 2. Initialize state
	let posts = $state<PostData[]>(cache?.posts || initial.initialPosts);
	let nextCursor = $state<string | null>(
		cache?.nextCursor !== undefined ? cache.nextCursor : initial.initialCursor
	);
	let sortMode = $state<PostSortMode>(
		(cache?.sortMode || initial.initialSortMode || 'chrono') as PostSortMode
	);
	let isLoadingMore = $state(false);

	const hasMore = $derived(!!nextCursor);

	// 3. The universal loadMore function
	async function loadMore(activeFeedId?: string) {
		const opts = getOpts();
		// activeFeedId is for the flux
		if (isLoadingMore || !nextCursor) return;
		isLoadingMore = true;

		console.log(`Load More Feed for ${opts.username} ${opts.feedType}`);

		try {
			let url = '';

			if (opts.feedType === 'flux') {
				url = `/api/feed-posts?cursor=${nextCursor}&feedId=${activeFeedId || ''}&limit=${opts.loadNumber}`;
			} else {
				url = `/api/user-posts?numberOfPost=${opts.loadNumber}&authorId=${opts.profileId}&type=${opts.feedType}&sort=${sortMode}&cursor=${encodeURIComponent(nextCursor)}`;
			}

			const res = await fetch(url);

			if (res.ok) {
				const json = (await res.json()) as { posts: SerializedPost[]; nextCursor: string | null };
				const formattedPosts = json.posts.map((p) => ({
					...p,
					createdAt: new SvelteDate(p.createdAt)
				}));

				console.log(`Loaded ${formattedPosts.length}`);

				posts = [...posts, ...formattedPosts];
				nextCursor = json.nextCursor;

				// Save to cache
				if (opts.username && (opts.feedType === 'posts' || opts.feedType === 'likes')) {
					saveProfileState(opts.username, opts.feedType, posts, nextCursor, sortMode);
				} else if (opts.feedType === 'flux') {
					saveMainFeedState(
						opts.feedId || activeFeedId || '',
						posts,
						nextCursor,
						typeof window !== 'undefined' ? window.scrollY : 0
					);
				}
			}
		} catch (e) {
			console.error('Feed load error:', e);
		} finally {
			isLoadingMore = false;
		}
	}

	// A helper to manually reset the feed (useful when changing sort mode or refreshing)
	function reset(newPosts: PostData[], newCursor: string | null) {
		const opts = getOpts();
		console.log(`Reset Feed for ${opts.username || opts.feedId || 'flux'} ${opts.feedType}`);

		posts = newPosts;
		nextCursor = newCursor;
		if (opts.username && (opts.feedType === 'posts' || opts.feedType === 'likes')) {
			saveProfileState(opts.username, opts.feedType, posts, nextCursor, sortMode);
		} else if (opts.feedType === 'flux') {
			saveMainFeedState(opts.feedId || '', posts, nextCursor, 0);
		}
	}

	return {
		get posts() {
			return posts;
		},
		get nextCursor() {
			return nextCursor;
		},
		get sortMode() {
			return sortMode;
		},
		set sortMode(val) {
			sortMode = val;
		},
		get isLoadingMore() {
			return isLoadingMore;
		},
		get hasMore() {
			return hasMore;
		},
		loadMore,
		reset
	};
}
