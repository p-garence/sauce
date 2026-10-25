import { describe, it, expect } from 'vitest';
import { isValidUuid, parseTagsInput, UUID_REGEX } from './validation';

describe('validation utils', () => {
	it('validates UUID correctly', () => {
		expect(isValidUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
		expect(isValidUuid('not-a-uuid')).toBe(false);
		expect(isValidUuid(null)).toBe(false);
		expect(isValidUuid(undefined)).toBe(false);
		expect(isValidUuid(12345)).toBe(false);
	});

	it('parses tags from json array string, comma separated string, and arrays', () => {
		expect(parseTagsInput('["tag1", "#tag2", "tag3 "]')).toEqual(['tag1', 'tag2', 'tag3']);
		expect(parseTagsInput('tag1, #tag2, tag3')).toEqual(['tag1', 'tag2', 'tag3']);
		expect(parseTagsInput(['tag1', '#tag2', ''])).toEqual(['tag1', 'tag2']);
		expect(parseTagsInput(null)).toEqual([]);
		expect(parseTagsInput('')).toEqual([]);
	});
});
