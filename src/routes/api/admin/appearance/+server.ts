import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { assertAdmin } from '$lib/server/admin';
import { getInstanceSettings } from '$lib/server/instanceSettings';
import { db } from '$lib/server/db';
import { iconSets, emojiSets } from '$lib/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const GET: RequestHandler = async ({ locals }) => {
	assertAdmin(locals.user);

	const [settings, publishedIconSets, publishedEmojiSets] = await Promise.all([
		getInstanceSettings(),
		db.query.iconSets.findMany({
			where: and(eq(iconSets.isPublished, true), eq(iconSets.isDeletedByOwner, false)),
			with: {
				owner: {
					columns: { id: true, username: true, name: true, image: true }
				}
			},
			orderBy: [desc(iconSets.createdAt)]
		}),
		db.query.emojiSets.findMany({
			where: and(eq(emojiSets.isPublished, true), eq(emojiSets.isDeletedByOwner, false)),
			with: {
				owner: {
					columns: { id: true, username: true, name: true, image: true }
				}
			},
			orderBy: [desc(emojiSets.createdAt)]
		})
	]);

	return json({
		settings,
		publishedIconSets,
		publishedEmojiSets
	});
};
