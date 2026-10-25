import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { emojiSets, userSavedEmojiSets } from '$lib/server/db/schema';
import { eq, or, inArray } from 'drizzle-orm';
import { getCached, setCached } from '$lib/server/cache';
import type { EmojiItem } from '$lib/types';

type PublicEmojiCache = {
	byId: Record<string, { url: string; name: string }>;
	byName: Record<string, { url: string; name: string }>;
};

export const GET: RequestHandler = async ({ url, locals }) => {
	const namesParam = url.searchParams.get('names') || '';
	const requestedKeys = Array.from(
		new Set(
			namesParam
				.split(',')
				.map((n) =>
					n
						.trim()
						.toLowerCase()
						.replace(/[^a-z0-9_-]/g, '')
				)
				.filter(Boolean)
		)
	).slice(0, 50);

	if (requestedKeys.length === 0) {
		return json({ emojis: {}, names: {} });
	}

	let publicIndex = getCached<PublicEmojiCache>('public_emoji_resolve_index');
	if (!publicIndex) {
		const publicSets = await db.query.emojiSets.findMany({
			where: or(eq(emojiSets.isPublished, true), eq(emojiSets.isInstanceDefault, true)),
			columns: { emojis: true }
		});

		const byId: Record<string, { url: string; name: string }> = {};
		const byName: Record<string, { url: string; name: string }> = {};

		for (const set of publicSets) {
			const list = (set.emojis as EmojiItem[]) || [];
			for (const em of list) {
				const cleanId = (em.id || '').toLowerCase();
				if (cleanId && !byId[cleanId]) {
					byId[cleanId] = { url: em.url, name: em.name };
				}
				const cleanName = (em.name || '').toLowerCase();
				if (cleanName && !byName[cleanName]) {
					byName[cleanName] = { url: em.url, name: em.name };
				}
			}
		}

		publicIndex = { byId, byName };
		setCached('public_emoji_resolve_index', publicIndex, 60_000);
	}

	const resultMap: Record<string, string> = {};
	const nameMap: Record<string, string> = {};
	const unresolvedKeys: string[] = [];

	for (const key of requestedKeys) {
		const match = publicIndex.byId[key] || publicIndex.byName[key];
		if (match) {
			resultMap[key] = match.url;
			nameMap[key] = match.name;
		} else {
			unresolvedKeys.push(key);
		}
	}

	// Si l'utilisateur est connecté et qu'il reste des clés non trouvées (ex: ses packs privés)
	if (unresolvedKeys.length > 0 && locals.user) {
		const userId = locals.user.id;
		const savedRels = await db
			.select({ emojiSetId: userSavedEmojiSets.emojiSetId })
			.from(userSavedEmojiSets)
			.where(eq(userSavedEmojiSets.userId, userId));
		const savedIds = savedRels.map((r) => r.emojiSetId);

		const userSets = await db.query.emojiSets.findMany({
			where:
				savedIds.length > 0
					? or(eq(emojiSets.ownerId, userId), inArray(emojiSets.id, savedIds))
					: eq(emojiSets.ownerId, userId),
			columns: { emojis: true }
		});

		for (const set of userSets) {
			const list = (set.emojis as EmojiItem[]) || [];
			for (const em of list) {
				const cleanId = (em.id || '').toLowerCase();
				if (cleanId && unresolvedKeys.includes(cleanId) && !resultMap[cleanId]) {
					resultMap[cleanId] = em.url;
					nameMap[cleanId] = em.name;
				}
				const cleanName = (em.name || '').toLowerCase();
				if (cleanName && unresolvedKeys.includes(cleanName) && !resultMap[cleanName]) {
					resultMap[cleanName] = em.url;
					nameMap[cleanName] = em.name;
				}
			}
		}
	}

	return json({ emojis: resultMap, names: nameMap });
};
