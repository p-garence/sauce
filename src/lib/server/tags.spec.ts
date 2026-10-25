import { describe, it, expect } from 'vitest';
import { normalizeTagName, extractTags } from './tags';

describe('normalizeTagName', () => {
	it('converts tag to lowercase', () => {
		expect(normalizeTagName('DIY')).toBe('diy');
		expect(normalizeTagName('#Nature')).toBe('nature');
	});

	it('strips leading hashes and trims whitespace', () => {
		expect(normalizeTagName('  ##social  ')).toBe('social');
		expect(normalizeTagName('#food')).toBe('food');
	});

	it('truncates tags longer than 50 characters', () => {
		const longTag = 'a'.repeat(60);
		expect(normalizeTagName(longTag)).toBe('a'.repeat(50));
	});
});

describe('extractTags', () => {
	it('extracts tags from simple text', () => {
		const text = 'Voici un post avec #diy et #ff pour le weekend !';
		expect(extractTags(text)).toEqual(['diy', 'ff']);
	});

	it('extracts tags with accents and numbers', () => {
		const text = 'Super #fête_2026 à Paris #santé #123';
		expect(extractTags(text)).toEqual(['fête_2026', 'santé', '123']);
	});

	it('deduplicates tags and normalizes case', () => {
		const text = 'Re-bonjour #Diy et encore #diy';
		expect(extractTags(text)).toEqual(['diy']);
	});

	it('ignores lone hash symbols and extracts valid tag', () => {
		const text = 'Prix # 5€ et #tag valide';
		expect(extractTags(text)).toEqual(['tag']);
	});

	it('returns empty array when text is empty or has no tags', () => {
		expect(extractTags('')).toEqual([]);
		expect(extractTags('Juste du texte sans aucun tag.')).toEqual([]);
	});
});
