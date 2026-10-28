import { json } from '@sveltejs/kit';
import { requireApiSession } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { posts, userGroups } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { getInstanceSettings } from '$lib/server/instanceSettings';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ params, request }) => {
	const session = await requireApiSession(request);
	const postId = params.id;

	if (!postId) return json({ error: 'ID du post manquant' }, { status: 400 });

	try {
		const { visibility, groupId } = await request.json();

		// 1. Validation de la visibilité
		const validStandardVisibilities = ['public', 'followers', 'group', 'private', 'network'];
		let isValid = validStandardVisibilities.includes(visibility);

		if (visibility === 'public') {
			const settings = await getInstanceSettings();
			if (!settings.privacySettings.isPublicInstance) {
				return json(
					{
						error:
							"La visibilité publique n'est pas autorisée lorsque l'instance est en mode privé."
					},
					{ status: 400 }
				);
			}
		}

		if (visibility === 'group') {
			if (!groupId || typeof groupId !== 'string') {
				isValid = false;
			} else {
				const group = await db.query.userGroups.findFirst({
					where: and(eq(userGroups.id, groupId), eq(userGroups.ownerId, session.user.id))
				});
				isValid = Boolean(group);
			}
		}

		if (!isValid) {
			return json({ error: 'Visibilité invalide ou groupe non autorisé' }, { status: 400 });
		}

		// 2. Mise à jour sécurisée (seul l'auteur peut le faire)
		const result = await db
			.update(posts)
			.set({
				visibility,
				groupId: visibility === 'group' ? groupId : null,
				isFederated: visibility === 'public' // On met à jour la fédération en cascade
			})
			.where(and(eq(posts.id, postId), eq(posts.authorId, session.user.id)))
			.returning({ updatedId: posts.id });

		if (result.length === 0) {
			return json({ error: 'Post introuvable ou accès refusé' }, { status: 404 });
		}

		return json({ success: true, visibility });
	} catch (error) {
		console.error('Erreur MAJ visibilité:', error);
		return json({ error: 'Erreur interne' }, { status: 500 });
	}
};
