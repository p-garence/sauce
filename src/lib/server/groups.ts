import { db } from '$lib/server/db';
import { userGroups, userGroupMembers, posts, stories } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';

export interface CreateGroupInput {
	ownerId: string;
	name: string;
	color?: string;
	icon?: string | null;
}

export interface UpdateGroupInput {
	groupId: string;
	ownerId: string;
	name: string;
	color?: string;
	icon?: string | null;
}

/**
 * Récupère tous les groupes d'audience créés par un utilisateur.
 */
export async function getUserGroups(ownerId: string) {
	return db.query.userGroups.findMany({
		where: eq(userGroups.ownerId, ownerId),
		orderBy: (groups, { asc }) => [asc(groups.name)]
	});
}

/**
 * Récupère un groupe spécifique appartenant à l'utilisateur.
 */
export async function getUserGroupById(groupId: string, ownerId: string) {
	return db.query.userGroups.findFirst({
		where: and(eq(userGroups.id, groupId), eq(userGroups.ownerId, ownerId))
	});
}

/**
 * Crée un nouveau groupe personnalisé.
 */
export async function createUserGroup(input: CreateGroupInput) {
	const name = input.name.trim();
	if (!name) throw new Error('Le nom du groupe est requis');
	if (name.length > 50) throw new Error('Nom trop long (50 caractères max)');

	const [created] = await db
		.insert(userGroups)
		.values({
			ownerId: input.ownerId,
			name,
			color: input.color || '#10b981',
			icon: input.icon && input.icon !== 'none' ? input.icon : null
		})
		.returning();

	return created;
}

/**
 * Met à jour un groupe existant.
 */
export async function updateUserGroup(input: UpdateGroupInput) {
	const name = input.name.trim();
	if (!name) throw new Error('Le nom du groupe est requis');
	if (name.length > 50) throw new Error('Nom trop long (50 caractères max)');

	const [updated] = await db
		.update(userGroups)
		.set({
			name,
			color: input.color || '#10b981',
			icon: input.icon && input.icon !== 'none' ? input.icon : null
		})
		.where(and(eq(userGroups.id, input.groupId), eq(userGroups.ownerId, input.ownerId)))
		.returning();

	if (!updated) {
		throw new Error('Groupe introuvable ou non autorisé');
	}

	return updated;
}

/**
 * Supprime un groupe en basculant au préalable les publications et stories associées en visibilité privée.
 */
export async function deleteUserGroup(groupId: string, ownerId: string) {
	// 1. Bascule sécurisée des posts et stories associés en privé
	await db
		.update(posts)
		.set({ visibility: 'private', groupId: null })
		.where(and(eq(posts.authorId, ownerId), eq(posts.groupId, groupId)));

	await db
		.update(stories)
		.set({ visibility: 'private', groupId: null })
		.where(and(eq(stories.authorId, ownerId), eq(stories.groupId, groupId)));

	// 2. Suppression du groupe (cascade vers userGroupMembers)
	const [deleted] = await db
		.delete(userGroups)
		.where(and(eq(userGroups.id, groupId), eq(userGroups.ownerId, ownerId)))
		.returning();

	if (!deleted) {
		throw new Error('Groupe introuvable ou non autorisé');
	}

	return deleted;
}

/**
 * Récupère les IDs des groupes du propriétaire dans lesquels se trouve l'utilisateur cible.
 */
export async function getUserGroupMemberships(
	ownerId: string,
	targetUserId: string
): Promise<string[]> {
	const memberships = await db
		.select({ groupId: userGroupMembers.groupId })
		.from(userGroupMembers)
		.innerJoin(userGroups, eq(userGroups.id, userGroupMembers.groupId))
		.where(and(eq(userGroups.ownerId, ownerId), eq(userGroupMembers.userId, targetUserId)));

	return memberships.map((m) => m.groupId);
}

/**
 * Ajoute un membre à un groupe.
 */
export async function addGroupMember(groupId: string, ownerId: string, targetUserId: string) {
	const group = await getUserGroupById(groupId, ownerId);
	if (!group) {
		throw new Error('Groupe introuvable ou non autorisé');
	}

	await db.insert(userGroupMembers).values({ groupId, userId: targetUserId }).onConflictDoNothing();
}

/**
 * Retire un membre d'un groupe.
 */
export async function removeGroupMember(groupId: string, ownerId: string, targetUserId: string) {
	const group = await getUserGroupById(groupId, ownerId);
	if (!group) {
		throw new Error('Groupe introuvable ou non autorisé');
	}

	await db
		.delete(userGroupMembers)
		.where(and(eq(userGroupMembers.groupId, groupId), eq(userGroupMembers.userId, targetUserId)));
}
