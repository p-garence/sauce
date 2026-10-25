import { describe, it, expect } from 'vitest';
import { mentionPermissions } from './mentionPermissions.svelte';

describe('mentionPermissions', () => {
	it('returns true by default when user is not yet in cache', () => {
		expect(mentionPermissions.isClickable('unknown_user_test')).toBe(true);
	});

	it('returns seeded permission correctly (case-insensitive)', () => {
		mentionPermissions.seed('Alice', true);
		mentionPermissions.seed('Bob', false);

		expect(mentionPermissions.isClickable('alice')).toBe(true);
		expect(mentionPermissions.isClickable('ALICE')).toBe(true);
		expect(mentionPermissions.isClickable('bob')).toBe(false);
		expect(mentionPermissions.isClickable('BOB')).toBe(false);
	});
});
