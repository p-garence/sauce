import { describe, it, expect } from 'vitest';
import { isValidAssetUrl, sanitizePackName } from './common';

describe('customPacks common utils', () => {
	it('validates asset URLs correctly', () => {
		expect(isValidAssetUrl('/media/abc-123_test.png')).toBe(true);
		expect(isValidAssetUrl('https://example.com/asset.png')).toBe(true);
		expect(isValidAssetUrl('http://example.com/asset.png')).toBe(true);
		expect(
			isValidAssetUrl(
				'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
			)
		).toBe(true);
		expect(isValidAssetUrl('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=')).toBe(false);
		expect(isValidAssetUrl('/media/invalid<tag>')).toBe(false);
		expect(isValidAssetUrl('javascript:alert(1)')).toBe(false);
		expect(isValidAssetUrl('')).toBe(false);
		expect(isValidAssetUrl(null)).toBe(false);
	});

	it('sanitizes pack names', () => {
		expect(sanitizePackName('  Mon Pack  ', 'Nom requis')).toBe('Mon Pack');
		expect(sanitizePackName('A'.repeat(60), 'Nom requis', 50)).toHaveLength(50);
		expect(() => sanitizePackName('', 'Nom requis')).toThrow('Nom requis');
		expect(() => sanitizePackName(null, 'Nom requis')).toThrow('Nom requis');
	});
});
