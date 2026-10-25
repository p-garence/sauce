import { describe, it, expect, beforeEach } from 'vitest';
import {
	saveMainFeedState,
	getMainFeedState,
	updateMainFeedScroll,
	removePostFromMainFeedMemory,
	clearMainFeedState
} from './feedMemory.svelte';
import type { PostData } from '$lib/types';

describe('feedMemory', () => {
	beforeEach(() => {
		clearMainFeedState();
	});

	it('saves and retrieves main feed state', () => {
		const mockPost = { id: 'p1', content: 'test', mediaUrls: [] } as unknown as PostData;
		saveMainFeedState('feed-1', [mockPost], 'cursor-abc', 450);

		const cached = getMainFeedState('feed-1');
		expect(cached).not.toBeNull();
		expect(cached?.posts).toHaveLength(1);
		expect(cached?.posts[0].id).toBe('p1');
		expect(cached?.nextCursor).toBe('cursor-abc');
		expect(cached?.scrollY).toBe(450);
	});

	it('updates scroll position', () => {
		const mockPost = { id: 'p1', content: 'test', mediaUrls: [] } as unknown as PostData;
		saveMainFeedState('feed-1', [mockPost], 'cursor-abc', 100);

		updateMainFeedScroll('feed-1', 980);
		const cached = getMainFeedState('feed-1');
		expect(cached?.scrollY).toBe(980);
	});

	it('removes post across all cached feeds', () => {
		const mockPost1 = { id: 'p1', content: 'post 1' } as unknown as PostData;
		const mockPost2 = { id: 'p2', content: 'post 2' } as unknown as PostData;

		saveMainFeedState('feed-1', [mockPost1, mockPost2], 'cursor-1', 0);
		saveMainFeedState('feed-2', [mockPost1], 'cursor-2', 0);

		removePostFromMainFeedMemory('p1');

		expect(getMainFeedState('feed-1')?.posts).toHaveLength(1);
		expect(getMainFeedState('feed-1')?.posts[0].id).toBe('p2');
		expect(getMainFeedState('feed-2')?.posts).toHaveLength(0);
	});

	it('clears specific feed or all feeds', () => {
		const mockPost = { id: 'p1', content: 'test' } as unknown as PostData;
		saveMainFeedState('feed-1', [mockPost], 'cursor-1', 0);
		saveMainFeedState('feed-2', [mockPost], 'cursor-2', 0);

		clearMainFeedState('feed-1');
		expect(getMainFeedState('feed-1')).toBeNull();
		expect(getMainFeedState('feed-2')).not.toBeNull();

		clearMainFeedState();
		expect(getMainFeedState('feed-2')).toBeNull();
	});
});
