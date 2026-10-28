import { db } from '$lib/server/db';
import { posts, stories, userGroups } from '$lib/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { getInstanceSettings } from '$lib/server/instanceSettings';
import type { PostVisibility } from '$lib/types';

export interface BulkVisibilityInput {
	visibility: PostVisibility;
	groupId?: string | null;
	updatePosts?: boolean;
	updateStories?: boolean;
}

/**
 * Met à jour en masse la visibilité des posts et/ou stories d'un utilisateur
 * (ex: passage en followers, privé ou groupe dédié).
 *
 * @param userId - ID du propriétaire des contenus
 * @param input - Paramètres de visibilité, ciblage de groupe, et périmètre (posts, stories)
 */
export async function bulkUpdateVisibility(userId: string, input: BulkVisibilityInput) {
	const { visibility, groupId, updatePosts = true, updateStories = true } = input;

	if (visibility === 'public') {
		const settings = await getInstanceSettings();
		if (!settings.privacySettings.isPublicInstance) {
			throw new Error(
				"La visibilité publique n'est pas autorisée lorsque l'instance est en mode privé."
			);
		}
	}

	if (visibility === 'group') {
		if (!groupId) {
			throw new Error('Veuillez sélectionner un groupe valide.');
		}
		const targetGroup = await db.query.userGroups.findFirst({
			where: and(eq(userGroups.id, groupId), eq(userGroups.ownerId, userId))
		});
		if (!targetGroup) {
			throw new Error('Groupe introuvable ou non autorisé.');
		}
	}

	if (updatePosts) {
		await db
			.update(posts)
			.set({
				visibility,
				groupId: visibility === 'group' ? (groupId ?? null) : null,
				isFederated: visibility === 'public'
			})
			.where(eq(posts.authorId, userId));
	}

	if (updateStories) {
		await db
			.update(stories)
			.set({
				visibility,
				groupId: visibility === 'group' ? (groupId ?? null) : null
			})
			.where(eq(stories.authorId, userId));
	}
}

/**
 * Restreint tous les posts publics d'un utilisateur au cercle de ses abonnés ('followers').
 *
 * @param userId - ID de l'utilisateur
 */
export async function makePostsConnections(userId: string) {
	await db
		.update(posts)
		.set({ visibility: 'followers' })
		.where(and(eq(posts.authorId, userId), eq(posts.visibility, 'public')));
}

/**
 * Restreint tous les posts non-privés d'un utilisateur en mode strictement 'private'.
 *
 * @param userId - ID de l'utilisateur
 */
export async function makePostsPrivate(userId: string) {
	await db
		.update(posts)
		.set({ visibility: 'private' })
		.where(
			and(eq(posts.authorId, userId), inArray(posts.visibility, ['public', 'followers', 'network']))
		);
}
