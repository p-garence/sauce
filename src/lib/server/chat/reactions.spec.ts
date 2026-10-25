import { describe, it, expect } from 'vitest';
import { formatMessageReactions, type RawReactionWithUser } from './reactions';

describe('formatMessageReactions', () => {
	it('renvoie une liste vide quand aucune réaction n’est fournie', () => {
		expect(formatMessageReactions([])).toEqual([]);
	});

	it('groupe correctement plusieurs réactions par emojiId et détecte hasReacted', () => {
		const raw: RawReactionWithUser[] = [
			{
				id: 'r1',
				messageId: 'm1',
				userId: 'u1',
				emojiId: 'fire',
				emojiName: 'Flamme',
				emojiUrl: '/media/fire.webp',
				user: { id: 'u1', name: 'Alice', username: 'alice' }
			},
			{
				id: 'r2',
				messageId: 'm1',
				userId: 'u2',
				emojiId: 'fire',
				emojiName: 'Flamme',
				emojiUrl: '/media/fire.webp',
				user: { id: 'u2', name: 'Bob', username: 'bob' }
			},
			{
				id: 'r3',
				messageId: 'm1',
				userId: 'u3',
				emojiId: 'heart',
				emojiName: 'Cœur',
				emojiUrl: '/media/heart.webp',
				user: { id: 'u3', name: 'Charlie', username: 'charlie' }
			}
		];

		const groupsForU1 = formatMessageReactions(raw, 'u1');

		expect(groupsForU1).toHaveLength(2);

		const fireGroup = groupsForU1.find((g) => g.emojiId === 'fire');
		expect(fireGroup).toBeDefined();
		expect(fireGroup?.count).toBe(2);
		expect(fireGroup?.hasReacted).toBe(true);
		expect(fireGroup?.users).toEqual([
			{ id: 'u1', name: 'Alice', username: 'alice', image: null },
			{ id: 'u2', name: 'Bob', username: 'bob', image: null }
		]);

		const heartGroup = groupsForU1.find((g) => g.emojiId === 'heart');
		expect(heartGroup).toBeDefined();
		expect(heartGroup?.count).toBe(1);
		expect(heartGroup?.hasReacted).toBe(false);

		const groupsForU3 = formatMessageReactions(raw, 'u3');
		const heartForU3 = groupsForU3.find((g) => g.emojiId === 'heart');
		expect(heartForU3?.hasReacted).toBe(true);
		const fireForU3 = groupsForU3.find((g) => g.emojiId === 'fire');
		expect(fireForU3?.hasReacted).toBe(false);
	});
});
