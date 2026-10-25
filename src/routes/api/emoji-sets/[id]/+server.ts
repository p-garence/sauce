import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getEmojiSetById, updateEmojiSet, deleteEmojiSet } from '$lib/server/emojis';
import { db } from '$lib/server/db';
import { userSavedEmojiSets } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Non authentifié' }, { status: 401 });
	}

	try {
		const set = await getEmojiSetById(params.id);
		if (!set) {
			return json({ error: 'Collection introuvable' }, { status: 404 });
		}
		if (!set.isPublished && !set.isInstanceDefault && set.ownerId !== locals.user.id) {
			const saved = await db.query.userSavedEmojiSets.findFirst({
				where: and(
					eq(userSavedEmojiSets.userId, locals.user.id),
					eq(userSavedEmojiSets.emojiSetId, set.id)
				)
			});
			if (!saved) {
				return json({ error: 'Accès non autorisé à cette collection privée' }, { status: 403 });
			}
		}
		return json(set);
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Erreur interne';
		return json({ error: message }, { status: 500 });
	}
};

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Non authentifié' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const updated = await updateEmojiSet(locals.user.id, params.id, body);
		return json(updated);
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Erreur lors de la mise à jour';
		return json({ error: message }, { status: 400 });
	}
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Non authentifié' }, { status: 401 });
	}

	try {
		const deleted = await deleteEmojiSet(locals.user.id, params.id);
		return json({ success: true, deleted });
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Erreur lors de la suppression';
		return json({ error: message }, { status: 400 });
	}
};
