import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getIconSetById, updateIconSet, deleteIconSet } from '$lib/server/icons';
import { db } from '$lib/server/db';
import { userSavedIconSets } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Non authentifié' }, { status: 401 });
	}

	try {
		const set = await getIconSetById(params.id);
		if (!set) {
			return json({ error: 'Set introuvable' }, { status: 404 });
		}
		if (!set.isPublished && !set.isInstanceDefault && set.ownerId !== locals.user.id) {
			const saved = await db.query.userSavedIconSets.findFirst({
				where: and(
					eq(userSavedIconSets.userId, locals.user.id),
					eq(userSavedIconSets.iconSetId, set.id)
				)
			});
			if (!saved) {
				return json({ error: 'Accès non autorisé à ce pack privé' }, { status: 403 });
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
		const updated = await updateIconSet(locals.user.id, params.id, body);
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
		const deleted = await deleteIconSet(locals.user.id, params.id);
		return json({ success: true, deleted });
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Erreur lors de la suppression';
		return json({ error: message }, { status: 400 });
	}
};
