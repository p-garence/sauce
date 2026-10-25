import { describe, it, expect } from 'vitest';
import { formatBytes, diffRemovedMedia, extractMediaFilenames } from './media';
import type { CarouselItem } from '$lib/types';

describe('formatBytes', () => {
	it('formats 0 bytes correctly', () => {
		expect(formatBytes(0)).toBe('0 o');
	});

	it('formats bytes in Ko', () => {
		expect(formatBytes(1024)).toBe('1 Ko');
		expect(formatBytes(2048)).toBe('2 Ko');
	});

	it('formats bytes in Mo', () => {
		expect(formatBytes(1024 * 1024)).toBe('1 Mo');
		expect(formatBytes(5.5 * 1024 * 1024)).toBe('5.5 Mo');
	});

	it('formats bytes in Go', () => {
		expect(formatBytes(2 * 1024 * 1024 * 1024)).toBe('2 Go');
	});
});

describe('diffRemovedMedia', () => {
	it('detects media that was removed from old items', () => {
		const oldItems: CarouselItem[] = [
			{ type: 'image', content: '/media/img1.webp' },
			{ type: 'image', content: '/media/img2.webp' },
			{ type: 'text', content: 'hello' }
		];

		const newItems: CarouselItem[] = [
			{ type: 'image', content: '/media/img1.webp' },
			{ type: 'text', content: 'updated hello' }
		];

		const removed = diffRemovedMedia(oldItems, newItems);
		expect(removed).toHaveLength(1);
		expect(removed[0]).toEqual({ type: 'image', content: '/media/img2.webp' });
	});

	it('returns empty array when no media was removed', () => {
		const oldItems: CarouselItem[] = [{ type: 'image', content: '/media/img1.webp' }];
		const newItems: CarouselItem[] = [
			{ type: 'image', content: '/media/img1.webp' },
			{ type: 'image', content: '/media/img2.webp' }
		];

		const removed = diffRemovedMedia(oldItems, newItems);
		expect(removed).toHaveLength(0);
	});
});

describe('extractMediaFilenames', () => {
	it('returns empty array for empty or null strings', () => {
		expect(extractMediaFilenames('')).toEqual([]);
		expect(extractMediaFilenames(null)).toEqual([]);
		expect(extractMediaFilenames(undefined)).toEqual([]);
	});

	it('extracts filename from standard /media/ url', () => {
		expect(extractMediaFilenames('/media/abc-123.webp')).toEqual(['abc-123.webp']);
	});

	it('extracts filename ignoring query parameters or hashes', () => {
		expect(extractMediaFilenames('/media/video-789.mp4?autoplay=1#track')).toEqual([
			'video-789.mp4'
		]);
	});

	it('extracts story reply media from chat message content', () => {
		const chatContent =
			'[story:{"id":"1","mediaUrl":"/media/story-uuid.webp","mediaType":"image"}]\nSuper story !';
		const extracted = extractMediaFilenames(chatContent);
		expect(extracted).toContain('story-uuid.webp');
	});

	it('extracts multiple media URLs from markdown or complex text', () => {
		const text = 'Voici une photo ![p1](/media/pic1.webp) et une autre `/media/pic2.mp4`';
		const extracted = extractMediaFilenames(text);
		expect(extracted).toContain('pic1.webp');
		expect(extracted).toContain('pic2.mp4');
		expect(extracted).toHaveLength(2);
	});

	it('extracts direct media filenames with standard extensions', () => {
		expect(extractMediaFilenames('my-avatar.webp')).toContain('my-avatar.webp');
	});

	it('extracts generic chat file attachments (pdf, zip, documents)', () => {
		expect(extractMediaFilenames('/media/doc-123.pdf')).toEqual(['doc-123.pdf']);
		expect(extractMediaFilenames('/media/archive-456.zip')).toEqual(['archive-456.zip']);
		expect(extractMediaFilenames('document.pdf')).toEqual(['document.pdf']);
	});
});
