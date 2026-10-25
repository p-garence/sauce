import { describe, it, expect } from 'vitest';
import { encodeCursor, decodeCursor, type CursorData } from './cursor';

describe('CursorData with blend feed', () => {
	it('encodes and decodes blend cursor correctly', () => {
		const subCursorA: CursorData = {
			type: 'chrono',
			lastValue: '2026-10-13T00:00:00.000Z',
			lastId: 'post-1'
		};
		const subCursorB: CursorData = {
			type: 'score',
			lastValue: 4.5,
			lastId: 'post-2'
		};

		const blendCursor: CursorData = {
			type: 'blend',
			lastValue: JSON.stringify({
				cursorA: subCursorA,
				exhaustedA: false,
				cursorB: subCursorB,
				exhaustedB: false
			}),
			lastId: 'blend'
		};

		const encoded = encodeCursor(blendCursor);
		expect(encoded).toBeTruthy();

		const decoded = decodeCursor(encoded);
		expect(decoded).not.null;
		expect(decoded?.type).toBe('blend');
		expect(decoded?.lastId).toBe('blend');

		const parsedPayload = JSON.parse(decoded!.lastValue as string);
		expect(parsedPayload.cursorA.lastId).toBe('post-1');
		expect(parsedPayload.cursorB.lastValue).toBe(4.5);
		expect(parsedPayload.exhaustedA).toBe(false);
	});

	it('handles exhausted state in blend cursor', () => {
		const blendCursor: CursorData = {
			type: 'blend',
			lastValue: JSON.stringify({
				cursorA: null,
				exhaustedA: true,
				cursorB: { type: 'chrono', lastValue: '2026-10-12T00:00:00.000Z', lastId: 'post-9' },
				exhaustedB: false
			}),
			lastId: 'blend'
		};

		const encoded = encodeCursor(blendCursor);
		const decoded = decodeCursor(encoded);
		const parsed = JSON.parse(decoded!.lastValue as string);

		expect(parsed.exhaustedA).toBe(true);
		expect(parsed.cursorA).toBeNull();
		expect(parsed.exhaustedB).toBe(false);
		expect(parsed.cursorB.lastId).toBe('post-9');
	});

	it('encodes and decodes oldest cursor', () => {
		const cursor: CursorData = {
			type: 'oldest',
			lastValue: '2026-01-01T12:00:00.000Z',
			lastId: 'post-old-1'
		};
		const encoded = encodeCursor(cursor);
		const decoded = decodeCursor(encoded);
		expect(decoded?.type).toBe('oldest');
		expect(decoded?.lastValue).toBe('2026-01-01T12:00:00.000Z');
		expect(decoded?.lastId).toBe('post-old-1');
	});

	it('encodes and decodes discussed cursor', () => {
		const cursor: CursorData = {
			type: 'discussed',
			lastValue: 42,
			lastId: 'post-disc-1'
		};
		const encoded = encodeCursor(cursor);
		const decoded = decodeCursor(encoded);
		expect(decoded?.type).toBe('discussed');
		expect(decoded?.lastValue).toBe(42);
		expect(decoded?.lastId).toBe('post-disc-1');
	});

	it('encodes and decodes random cursor with seed and hash', () => {
		const cursor: CursorData = {
			type: 'random',
			lastValue: JSON.stringify({ seed: 'xyz123', lastHash: 'a1b2c3d4e5f6' }),
			lastId: 'post-rand-1'
		};
		const encoded = encodeCursor(cursor);
		const decoded = decodeCursor(encoded);
		expect(decoded?.type).toBe('random');
		const parsed = JSON.parse(decoded!.lastValue as string);
		expect(parsed.seed).toBe('xyz123');
		expect(parsed.lastHash).toBe('a1b2c3d4e5f6');
		expect(decoded?.lastId).toBe('post-rand-1');
	});
});

describe('Carousel child type filtering logic', () => {
	type CarouselSlide = { type: 'text' | 'image' | 'video'; content: string };

	function filterCarousel(
		postType: string,
		slides: CarouselSlide[],
		filterMode: 'all' | 'include' | 'exclude',
		childTypes: string[]
	): boolean {
		if (postType !== 'carousel') return true;
		if (filterMode === 'all' || childTypes.length === 0) return true;

		if (filterMode === 'include') {
			return slides.some((s) => childTypes.includes(s.type));
		}
		if (filterMode === 'exclude') {
			return !slides.some((s) => childTypes.includes(s.type));
		}
		return true;
	}

	it('non-carousel posts are always untouched by carousel child filters', () => {
		expect(filterCarousel('text', [], 'include', ['video'])).toBe(true);
		expect(filterCarousel('image', [], 'exclude', ['image'])).toBe(true);
	});

	it('includes carousel only if it contains at least one of the included types', () => {
		const videoCarousel: CarouselSlide[] = [
			{ type: 'video', content: '/v1.mp4' },
			{ type: 'text', content: 'Title' }
		];
		const imageCarousel: CarouselSlide[] = [
			{ type: 'image', content: '/i1.jpg' },
			{ type: 'text', content: 'Caption' }
		];

		// Include only video
		expect(filterCarousel('carousel', videoCarousel, 'include', ['video'])).toBe(true);
		expect(filterCarousel('carousel', imageCarousel, 'include', ['video'])).toBe(false);

		// Include image or video
		expect(filterCarousel('carousel', imageCarousel, 'include', ['image', 'video'])).toBe(true);
	});

	it('excludes carousel if it contains any of the excluded types', () => {
		const mixedCarousel: CarouselSlide[] = [
			{ type: 'image', content: '/i1.jpg' },
			{ type: 'video', content: '/v1.mp4' }
		];
		const pureImageCarousel: CarouselSlide[] = [
			{ type: 'image', content: '/i1.jpg' },
			{ type: 'image', content: '/i2.jpg' }
		];

		// Exclude video
		expect(filterCarousel('carousel', mixedCarousel, 'exclude', ['video'])).toBe(false);
		expect(filterCarousel('carousel', pureImageCarousel, 'exclude', ['video'])).toBe(true);
	});
});

describe('Tag filtering logic (homogenized)', () => {
	function filterPostByTags(
		postTags: string[],
		filterMode: 'all' | 'include' | 'exclude',
		filterTags: string[]
	): boolean {
		if (filterMode === 'all' || filterTags.length === 0) return true;
		const normalizedFilterTags = filterTags.map((t) => t.toLowerCase().trim());
		const hasMatchingTag = postTags.some((t) =>
			normalizedFilterTags.includes(t.toLowerCase().trim())
		);

		if (filterMode === 'include') {
			return hasMatchingTag;
		}
		if (filterMode === 'exclude') {
			return !hasMatchingTag;
		}
		return true;
	}

	it('returns true when filterMode is all or filterTags is empty', () => {
		expect(filterPostByTags(['sport'], 'all', ['gaming'])).toBe(true);
		expect(filterPostByTags(['sport'], 'include', [])).toBe(true);
		expect(filterPostByTags(['sport'], 'exclude', [])).toBe(true);
	});

	it('includes posts only if they match at least one included tag', () => {
		expect(filterPostByTags(['sport', 'tech'], 'include', ['tech'])).toBe(true);
		expect(filterPostByTags(['art'], 'include', ['tech', 'music'])).toBe(false);
	});

	it('excludes posts if they contain any of the excluded tags', () => {
		expect(filterPostByTags(['sport', 'nsfw'], 'exclude', ['nsfw'])).toBe(false);
		expect(filterPostByTags(['sport', 'art'], 'exclude', ['nsfw'])).toBe(true);
	});
});
