import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	toggleUserFavoriteEmoji,
	removeUserFavoriteEmoji,
	setUserFavoriteEmojis
} from '$lib/server/emojis';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Non authentifié' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { emojiId, replaceEmojiId, favoriteEmojiIds, action } = body;

		if (Array.isArray(favoriteEmojiIds)) {
			const result = await setUserFavoriteEmojis(locals.user.id, favoriteEmojiIds);
			return json(result);
		}

		if (action === 'remove' && emojiId) {
			const result = await removeUserFavoriteEmoji(locals.user.id, emojiId);
			return json(result);
		}

		if (!emojiId) {
			return json({ error: "Identifiant d'emoji requis." }, { status: 400 });
		}

		const result = await toggleUserFavoriteEmoji(locals.user.id, emojiId, replaceEmojiId);
		return json(result);
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Erreur';
		return json({ error: message }, { status: 400 });
	}
};
