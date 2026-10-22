import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	checkEmailRateLimit,
	resetRateLimits,
	buildResetPasswordEmailTemplate,
	sendPasswordResetEmail,
	isSmtpConfigured
} from './email';

describe('Email Service', () => {
	beforeEach(() => {
		resetRateLimits();
		vi.restoreAllMocks();
	});

	describe('Rate Limiter', () => {
		it('allows up to maxAttempts within windowMs', () => {
			const email = 'user@example.com';
			expect(checkEmailRateLimit(email, 3, 1000)).toBe(true);
			expect(checkEmailRateLimit(email, 3, 1000)).toBe(true);
			expect(checkEmailRateLimit(email, 3, 1000)).toBe(true);
			expect(checkEmailRateLimit(email, 3, 1000)).toBe(false);
		});

		it('normalizes email addresses (case and whitespace insensitive)', () => {
			expect(checkEmailRateLimit('  USER@EXAMPLE.COM  ', 2, 1000)).toBe(true);
			expect(checkEmailRateLimit('user@example.com', 2, 1000)).toBe(true);
			expect(checkEmailRateLimit('user@example.com', 2, 1000)).toBe(false);
		});

		it('tracks different emails independently', () => {
			expect(checkEmailRateLimit('alice@example.com', 1, 1000)).toBe(true);
			expect(checkEmailRateLimit('alice@example.com', 1, 1000)).toBe(false);
			expect(checkEmailRateLimit('bob@example.com', 1, 1000)).toBe(true);
		});
	});

	describe('Email Template', () => {
		it('generates HTML and text with the reset URL and greeting', () => {
			const { text, html } = buildResetPasswordEmailTemplate(
				'Thomas',
				'http://localhost:5173/reinitialiser-mot-de-passe?token=abc-123'
			);

			expect(text).toContain('Bonjour Thomas');
			expect(text).toContain('http://localhost:5173/reinitialiser-mot-de-passe?token=abc-123');
			expect(text).toContain('15 minutes');

			expect(html).toContain('Bonjour Thomas');
			expect(html).toContain('http://localhost:5173/reinitialiser-mot-de-passe?token=abc-123');
			expect(html).toContain('Réinitialiser mon mot de passe');
		});

		it('falls back to generic greeting when name is omitted', () => {
			const { text, html } = buildResetPasswordEmailTemplate(
				undefined,
				'http://localhost:5173/reinitialiser-mot-de-passe?token=xyz'
			);
			expect(text).toContain('Bonjour,');
			expect(html).toContain('Bonjour,');
		});
	});

	describe('Fallback Dev Mode', () => {
		it('logs reset link to console when SMTP is not configured', async () => {
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			const result = await sendPasswordResetEmail({
				to: 'dev@test.local',
				name: 'Dev User',
				resetUrl: 'http://localhost:5173/reinitialiser-mot-de-passe?token=test-token'
			});

			expect(result).toBe(true);
			expect(consoleSpy).toHaveBeenCalled();
			const calls = consoleSpy.mock.calls.map((c) => c.join(' ')).join('\n');
			expect(calls).toContain('EMAIL DEV / FALLBACK');
			expect(calls).toContain('dev@test.local');
			expect(calls).toContain('http://localhost:5173/reinitialiser-mot-de-passe?token=test-token');
		});
	});
});
