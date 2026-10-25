import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractMentions, notifyMentions } from './mentions';
import { db } from '$lib/server/db';
import { sendNotification } from '$lib/server/notifications';

vi.mock('$lib/server/db', () => ({
	db: {
		query: {
			user: {
				findMany: vi.fn()
			}
		}
	}
}));

vi.mock('$lib/server/notifications', () => ({
	sendNotification: vi.fn()
}));

describe('extractMentions', () => {
	it('returns empty array when text is empty, null, or undefined', () => {
		expect(extractMentions('')).toEqual([]);
		expect(extractMentions(null)).toEqual([]);
		expect(extractMentions(undefined)).toEqual([]);
	});

	it('extracts single mention', () => {
		expect(extractMentions('Bonjour @alice !')).toEqual(['alice']);
	});

	it('extracts multiple unique mentions and normalizes to lowercase', () => {
		expect(extractMentions('Hello @Alice et @BOB et @alice')).toEqual(['alice', 'bob']);
	});

	it('supports dots and underscores in usernames', () => {
		expect(extractMentions('Check @john_doe and @jane.smith')).toEqual(['john_doe', 'jane.smith']);
	});

	it('ignores emails without space or preceding at symbol', () => {
		expect(extractMentions('Mon email est test@example.com')).toEqual([]);
	});

	it('handles mentions at start of line', () => {
		expect(extractMentions('@charlie salut')).toEqual(['charlie']);
	});
});

describe('notifyMentions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('does not notify user if allowMentions is false', async () => {
		vi.mocked(db.query.user.findMany).mockResolvedValue([
			{
				id: 'user_1',
				username: 'alice',
				name: 'Alice',
				image: null,
				profileVisibility: { allowMentions: false }
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
			} as any
		]);

		const notified = await notifyMentions({
			actorId: 'sender_id',
			text: 'Hello @alice',
			entityId: 'post_1',
			context: 'post'
		});

		expect(notified).toEqual([]);
		expect(sendNotification).not.toHaveBeenCalled();
	});

	it('notifies user if allowMentions is true or undefined', async () => {
		vi.mocked(db.query.user.findMany).mockResolvedValue([
			{
				id: 'user_2',
				username: 'bob',
				name: 'Bob',
				image: null,
				profileVisibility: { allowMentions: true }
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
			} as any
		]);

		const notified = await notifyMentions({
			actorId: 'sender_id',
			text: 'Hello @bob',
			entityId: 'post_2',
			context: 'post'
		});

		expect(notified).toEqual(['user_2']);
		expect(sendNotification).toHaveBeenCalledTimes(1);
	});

	it('does not self-notify', async () => {
		vi.mocked(db.query.user.findMany).mockResolvedValue([
			{
				id: 'sender_id',
				username: 'me',
				name: 'Me',
				image: null,
				profileVisibility: { allowMentions: true }
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
			} as any
		]);

		const notified = await notifyMentions({
			actorId: 'sender_id',
			text: 'Hello @me',
			entityId: 'post_3',
			context: 'post'
		});

		expect(notified).toEqual([]);
		expect(sendNotification).not.toHaveBeenCalled();
	});
});
