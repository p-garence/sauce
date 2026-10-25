import { describe, it, expect } from 'vitest';
import { formatRelativeDate, formatFullDate, formatDateISO } from './dates';

describe('formatRelativeDate', () => {
	const baseNow = new Date('2026-10-20T12:00:00.000Z');

	it('returns empty string for null or undefined or invalid date', () => {
		expect(formatRelativeDate(null)).toBe('');
		expect(formatRelativeDate(undefined)).toBe('');
		expect(formatRelativeDate('invalid-date')).toBe('');
	});

	it('returns "à l\'instant" for very recent or future dates', () => {
		const justNow = new Date('2026-10-20T11:59:58.000Z');
		expect(formatRelativeDate(justNow, { now: baseNow })).toBe("à l'instant");
		const future = new Date('2026-10-20T12:00:02.000Z');
		expect(formatRelativeDate(future, { now: baseNow })).toBe("à l'instant");
	});

	it('returns "il y a quelques secondes" for under a minute', () => {
		const secondsAgo = new Date('2026-10-20T11:59:20.000Z');
		expect(formatRelativeDate(secondsAgo, { now: baseNow })).toBe('il y a quelques secondes');
		expect(formatRelativeDate(secondsAgo, { now: baseNow, compact: true })).toBe("à l'instant");
	});

	it('returns minutes accurately in French', () => {
		const oneMinAgo = new Date('2026-10-20T11:59:00.000Z');
		expect(formatRelativeDate(oneMinAgo, { now: baseNow })).toBe('il y a 1 minute');
		expect(formatRelativeDate(oneMinAgo, { now: baseNow, compact: true })).toBe('1 min');

		const fifteenMinAgo = new Date('2026-10-20T11:45:00.000Z');
		expect(formatRelativeDate(fifteenMinAgo, { now: baseNow })).toBe('il y a 15 minutes');
		expect(formatRelativeDate(fifteenMinAgo, { now: baseNow, compact: true })).toBe('15 min');
	});

	it('returns hours accurately in French ("il y a 2 heures")', () => {
		const twoHoursAgo = new Date('2026-10-20T10:00:00.000Z');
		expect(formatRelativeDate(twoHoursAgo, { now: baseNow })).toBe('il y a 2 heures');
		expect(formatRelativeDate(twoHoursAgo, { now: baseNow, compact: true })).toBe('2 h');

		const oneHourAgo = new Date('2026-10-20T11:00:00.000Z');
		expect(formatRelativeDate(oneHourAgo, { now: baseNow })).toBe('il y a 1 heure');
		expect(formatRelativeDate(oneHourAgo, { now: baseNow, compact: true })).toBe('1 h');
	});

	it('returns "hier" and "avant-hier"', () => {
		const yesterday = new Date('2026-10-19T15:00:00.000Z');
		expect(formatRelativeDate(yesterday, { now: baseNow })).toBe('hier');
		expect(formatRelativeDate(yesterday, { now: baseNow, compact: true })).toBe('hier');

		const twoDaysAgo = new Date('2026-10-18T12:00:00.000Z');
		expect(formatRelativeDate(twoDaysAgo, { now: baseNow })).toBe('avant-hier');
		expect(formatRelativeDate(twoDaysAgo, { now: baseNow, compact: true })).toBe('2 j');
	});

	it('returns days accurately ("il y a 10 jours")', () => {
		const tenDaysAgo = new Date('2026-10-10T12:00:00.000Z');
		expect(formatRelativeDate(tenDaysAgo, { now: baseNow })).toBe('il y a 10 jours');
		expect(formatRelativeDate(tenDaysAgo, { now: baseNow, compact: true })).toBe('10 j');
	});

	it('returns months accurately up to threshold ("il y a 1 mois", "il y a 2 mois")', () => {
		const oneMonthAgo = new Date('2026-09-15T12:00:00.000Z');
		expect(formatRelativeDate(oneMonthAgo, { now: baseNow })).toBe('il y a 1 mois');

		const twoMonthsAgo = new Date('2026-08-15T12:00:00.000Z');
		expect(formatRelativeDate(twoMonthsAgo, { now: baseNow })).toBe('il y a 2 mois');
	});

	it('returns full French date (never American format) beyond threshold (3 months / 90 days)', () => {
		const fourMonthsAgo = new Date('2026-06-15T12:00:00.000Z');
		// French format: '15 juin 2026' (not '06/15/2026' or 'June 15, 2026')
		expect(formatRelativeDate(fourMonthsAgo, { now: baseNow })).toBe('15 juin 2026');

		const lastYear = new Date('2025-03-04T08:30:00.000Z');
		expect(formatRelativeDate(lastYear, { now: baseNow })).toBe('4 mars 2025');
	});

	it('formats full date and ISO date correctly', () => {
		const date = new Date('2026-10-20T14:32:00.000Z');
		expect(formatDateISO(date)).toBe('2026-10-20T14:32:00.000Z');
		const full = formatFullDate(date, { withTime: true });
		expect(full).toContain('octobre 2026');
	});
});
