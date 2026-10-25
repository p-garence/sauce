import { describe, it, expect, beforeEach } from 'vitest';
import { globalFollowState } from './followState.svelte';

describe('globalFollowState', () => {
	beforeEach(() => {
		globalFollowState.clear();
	});

	it('should initialize and return undefined for unknown user without fallback', () => {
		expect(globalFollowState.get('user_unknown')).toBeUndefined();
		expect(globalFollowState.get('user_unknown', 'none')).toBe('none');
		expect(globalFollowState.has('user_unknown')).toBe(false);
	});

	it('should set and get follow status reactively', () => {
		globalFollowState.set('user_123', 'following');
		expect(globalFollowState.get('user_123')).toBe('following');
		expect(globalFollowState.has('user_123')).toBe(true);

		globalFollowState.set('user_123', 'none');
		expect(globalFollowState.get('user_123')).toBe('none');

		globalFollowState.set('user_123', 'pending');
		expect(globalFollowState.get('user_123')).toBe('pending');
	});

	it('should handle boolean and string in init()', () => {
		globalFollowState.init('user_bool_true', true);
		expect(globalFollowState.get('user_bool_true')).toBe('following');

		globalFollowState.init('user_bool_false', false);
		expect(globalFollowState.get('user_bool_false')).toBe('none');

		globalFollowState.init('user_str', 'pending');
		expect(globalFollowState.get('user_str')).toBe('pending');

		// Subsequent init should not overwrite existing value
		globalFollowState.init('user_str', 'following');
		expect(globalFollowState.get('user_str')).toBe('pending');
	});

	it('should clear specific user or all users', () => {
		globalFollowState.set('user_a', 'following');
		globalFollowState.set('user_b', 'pending');

		globalFollowState.clear('user_a');
		expect(globalFollowState.has('user_a')).toBe(false);
		expect(globalFollowState.has('user_b')).toBe(true);

		globalFollowState.clear();
		expect(globalFollowState.has('user_b')).toBe(false);
	});
});
