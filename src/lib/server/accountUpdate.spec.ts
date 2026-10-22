import { describe, it, expect } from 'vitest';
import { isValidUsername } from '$lib/utils/validation';

describe('Account update validation', () => {
	describe('Username validation', () => {
		it('accepts standard usernames including generic words', () => {
			expect(isValidUsername('john_doe')).toBe(true);
			expect(isValidUsername('User123')).toBe(true);
			expect(isValidUsername('dev_pro_99')).toBe(true);
			expect(isValidUsername('login')).toBe(true);
			expect(isValidUsername('api')).toBe(true);
			expect(isValidUsername('flux')).toBe(true);
		});

		it('rejects invalid characters, spaces or bad length', () => {
			expect(isValidUsername('ab')).toBe(false); // < 3
			expect(isValidUsername('a'.repeat(31))).toBe(false); // > 30
			expect(isValidUsername('john doe')).toBe(false); // space
			expect(isValidUsername('john-doe')).toBe(false); // dash
			expect(isValidUsername('john@doe')).toBe(false); // special char
		});
	});

	describe('Email format validation', () => {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

		it('validates common email formats', () => {
			expect(emailRegex.test('user@domain.fr')).toBe(true);
			expect(emailRegex.test('first.last@company.co.uk')).toBe(true);
			expect(emailRegex.test('invalid-email')).toBe(false);
			expect(emailRegex.test('@no-local.com')).toBe(false);
			expect(emailRegex.test('no-domain@')).toBe(false);
		});
	});
});
