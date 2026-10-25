/**
 * @module server/icons
 * @description Gestion des packs d'icônes personnalisés (CRUD, bibliothèque, activation, publication).
 */

import { db } from '$lib/server/db';
import { iconSets, userSavedIconSets, user as userTable, posts } from '$lib/server/db/schema';
import { eq, and, desc, inArray, ne } from 'drizzle-orm';
import { createPost } from '$lib/server/posts/crud';
import { getInstanceSettings } from './instanceSettings';
import { isValidAssetUrl, sanitizePackName } from './customPacks/common';

/**
 * Récupère la bibliothèque d'icônes pour un utilisateur.
 *
 * @param userId Identifiant de l'utilisateur
 */
export async function getUserIconLibrary(userId: string) {
	const currentUser = await db.query.user.findFirst({
		where: eq(userTable.id, userId),
		columns: { activeIconSetId: true }
	});

	const owned = await db.query.iconSets.findMany({
		where: and(eq(iconSets.ownerId, userId), eq(iconSets.isDeletedByOwner, false)),
		orderBy: [desc(iconSets.createdAt)]
	});

	// Nettoie d'office tout doublon orphelin : un utilisateur ne doit pas avoir son propre set dans saved
	if (owned.length > 0) {
		const ownedIds = owned.map((o) => o.id);
		await db
			.delete(userSavedIconSets)
			.where(
				and(eq(userSavedIconSets.userId, userId), inArray(userSavedIconSets.iconSetId, ownedIds))
			)
			.catch(() => {});
	}

	const savedRelations = await db.query.userSavedIconSets.findMany({
		where: eq(userSavedIconSets.userId, userId),
		with: {
			iconSet: {
				with: {
					owner: {
						columns: { id: true, username: true, name: true, image: true }
					}
				}
			}
		},
		orderBy: [desc(userSavedIconSets.savedAt)]
	});

	const saved = savedRelations
		.map((r) => r.iconSet)
		.filter((s): s is NonNullable<typeof s> => Boolean(s) && s.ownerId !== userId);

	const instanceSettings = await getInstanceSettings();

	return {
		owned,
		saved,
		allowedCustomIconSets: instanceSettings.allowedCustomIconSets || [],
		activeIconSetId: currentUser?.activeIconSetId || null
	};
}

/**
 * Récupère un set d'icônes par son identifiant.
 *
 * @param id Identifiant du set d'icônes
 */
export async function getIconSetById(id: string) {
	return await db.query.iconSets.findFirst({
		where: eq(iconSets.id, id),
		with: {
			owner: {
				columns: { id: true, username: true, name: true, image: true }
			}
		}
	});
}

function sanitizeIconsMap(rawIcons: Record<string, string> | undefined): Record<string, string> {
	if (!rawIcons || typeof rawIcons !== 'object') return {};
	const cleaned: Record<string, string> = {};
	const entries = Object.entries(rawIcons).slice(0, 100);
	for (const [key, val] of entries) {
		if (
			typeof key === 'string' &&
			key.length >= 1 &&
			key.length <= 60 &&
			/^[a-zA-Z0-9._-]+$/.test(key) &&
			isValidAssetUrl(val)
		) {
			cleaned[key] = val;
		}
	}
	return cleaned;
}

/**
 * Crée un nouveau set d'icônes.
 *
 * @param userId Identifiant du créateur
 * @param data Données du set
 */
export async function createIconSet(
	userId: string,
	data: { name: string; description?: string; icons?: Record<string, string>; fallback?: string }
) {
	const trimmedName = sanitizePackName(data.name, "Le nom du set d'icônes est requis.");

	const sanitizedIcons = sanitizeIconsMap(data.icons);
	if (Object.keys(sanitizedIcons).length === 0) {
		throw new Error("Le set d'icônes doit contenir au moins une icône personnalisée valide.");
	}

	const [created] = await db
		.insert(iconSets)
		.values({
			ownerId: userId,
			name: trimmedName,
			description: data.description?.trim() || null,
			icons: sanitizedIcons,
			fallback: data.fallback === 'original' ? 'original' : 'lucide'
		})
		.returning();

	// Activer automatiquement le pack créé chez l'utilisateur
	await db
		.update(userTable)
		.set({ activeIconSetId: created.id })
		.where(eq(userTable.id, userId));

	return created;
}

/**
 * Met à jour un set d'icônes existant.
 *
 * @param userId Identifiant du propriétaire
 * @param id Identifiant du set d'icônes
 * @param data Données à mettre à jour
 */
export async function updateIconSet(
	userId: string,
	id: string,
	data: { name?: string; description?: string; icons?: Record<string, string>; fallback?: string }
) {
	const existing = await db.query.iconSets.findFirst({
		where: and(eq(iconSets.id, id), eq(iconSets.ownerId, userId))
	});

	if (!existing) {
		throw new Error("Set d'icônes introuvable ou non autorisé.");
	}

	const updatePayload: Partial<typeof iconSets.$inferInsert> = {};
	if (data.name !== undefined) {
		const trimmed = data.name.trim();
		if (!trimmed) throw new Error('Le nom ne peut pas être vide.');
		updatePayload.name = trimmed.slice(0, 50);
	}
	if (data.description !== undefined) {
		updatePayload.description = data.description?.trim() || null;
	}
	if (data.icons !== undefined) {
		const sanitized = sanitizeIconsMap(data.icons);
		if (Object.keys(sanitized).length === 0) {
			throw new Error("Le set d'icônes doit contenir au moins une icône personnalisée valide.");
		}
		updatePayload.icons = sanitized;
	}
	if (data.fallback !== undefined) {
		updatePayload.fallback = data.fallback === 'original' ? 'original' : 'lucide';
	}

	const [updated] = await db
		.update(iconSets)
		.set(updatePayload)
		.where(eq(iconSets.id, id))
		.returning();

	return updated;
}

/**
 * Supprime un set d'icônes ou le marque comme supprimé s'il est utilisé ailleurs.
 *
 * @param userId Identifiant du propriétaire
 * @param id Identifiant du set d'icônes
 */
export async function deleteIconSet(userId: string, id: string) {
	const existing = await db.query.iconSets.findFirst({
		where: and(eq(iconSets.id, id), eq(iconSets.ownerId, userId))
	});

	if (!existing) {
		throw new Error("Set d'icônes introuvable ou non autorisé.");
	}

	// Si actif chez l'utilisateur propriétaire, réinitialiser chez lui
	await db
		.update(userTable)
		.set({ activeIconSetId: null })
		.where(and(eq(userTable.id, userId), eq(userTable.activeIconSetId, id)));

	// Vérifier si ce set est référencé chez d'autres utilisateurs ou dans des publications
	const [otherUserSaved, otherUserActive, postRef] = await Promise.all([
		db.query.userSavedIconSets.findFirst({
			where: and(eq(userSavedIconSets.iconSetId, id), ne(userSavedIconSets.userId, userId))
		}),
		db.query.user.findFirst({
			where: and(eq(userTable.activeIconSetId, id), ne(userTable.id, userId))
		}),
		db.query.posts.findFirst({
			where: eq(posts.iconSetId, id)
		})
	]);

	const isReferenced = Boolean(
		otherUserSaved || otherUserActive || postRef || existing.isInstanceDefault
	);

	if (isReferenced) {
		// Tant qu'il est référencé chez quelqu'un ou dans un post, on le conserve en BDD mais on le retire de la liste du créateur
		const [updated] = await db
			.update(iconSets)
			.set({ isDeletedByOwner: true, isPublished: false })
			.where(eq(iconSets.id, id))
			.returning();

		return updated;
	}

	const [deleted] = await db.delete(iconSets).where(eq(iconSets.id, id)).returning();

	return deleted;
}

/**
 * Ajoute ou retire un set d'icônes de la bibliothèque de l'utilisateur.
 *
 * @param userId Identifiant de l'utilisateur
 * @param iconSetId Identifiant du set d'icônes
 */
export async function toggleSaveIconSet(userId: string, iconSetId: string) {
	const set = await db.query.iconSets.findFirst({
		where: eq(iconSets.id, iconSetId)
	});
	if (!set) {
		throw new Error("Set d'icônes introuvable.");
	}

	if (set.ownerId === userId && !set.isDeletedByOwner) {
		throw new Error(
			"Vous êtes le créateur de ce set d'icônes, il fait déjà partie de votre bibliothèque."
		);
	}

	const existingSave = await db.query.userSavedIconSets.findFirst({
		where: and(eq(userSavedIconSets.userId, userId), eq(userSavedIconSets.iconSetId, iconSetId))
	});

	if (existingSave) {
		await db
			.delete(userSavedIconSets)
			.where(and(eq(userSavedIconSets.userId, userId), eq(userSavedIconSets.iconSetId, iconSetId)));

		// Si c'était son set actif, on le désactive aussi
		await db
			.update(userTable)
			.set({ activeIconSetId: null })
			.where(and(eq(userTable.id, userId), eq(userTable.activeIconSetId, iconSetId)));

		if (set.isDeletedByOwner) {
			const [remainingSave, remainingActive, postRef] = await Promise.all([
				db.query.userSavedIconSets.findFirst({
					where: eq(userSavedIconSets.iconSetId, iconSetId)
				}),
				db.query.user.findFirst({
					where: eq(userTable.activeIconSetId, iconSetId)
				}),
				db.query.posts.findFirst({
					where: eq(posts.iconSetId, iconSetId)
				})
			]);
			if (!remainingSave && !remainingActive && !postRef && !set.isInstanceDefault) {
				await db.delete(iconSets).where(eq(iconSets.id, iconSetId));
			}
		}

		return { saved: false };
	} else {
		if (set.isDeletedByOwner) {
			throw new Error("Ce set a été supprimé par son créateur et ne peut plus être ajouté.");
		}
		if (!set.isPublished && !set.isInstanceDefault && set.ownerId !== userId) {
			throw new Error("Ce set d'icônes est privé et ne peut pas être ajouté à votre bibliothèque.");
		}
		await db
			.insert(userSavedIconSets)
			.values({
				userId,
				iconSetId
			})
			.onConflictDoNothing();
		// Activer automatiquement le pack dans le set actif de l'utilisateur quand il l'ajoute
		await db.update(userTable).set({ activeIconSetId: iconSetId }).where(eq(userTable.id, userId));
		return { saved: true, isActive: true };
	}
}

/**
 * Définit ou désactive le set d'icônes actif pour un utilisateur.
 *
 * @param userId Identifiant de l'utilisateur
 * @param iconSetId Identifiant du set d'icônes ou null pour réinitialiser
 */
export async function setActiveIconSet(userId: string, iconSetId: string | null) {
	if (iconSetId === null) {
		await db.update(userTable).set({ activeIconSetId: null }).where(eq(userTable.id, userId));
		return { activeIconSetId: null };
	}

	const targetSet = await db.query.iconSets.findFirst({
		where: eq(iconSets.id, iconSetId)
	});

	if (!targetSet) {
		throw new Error("Set d'icônes introuvable.");
	}

	// Vérifier si propriétaire, sauvegardé ou publié
	const isOwner = targetSet.ownerId === userId;
	const isSaved = await db.query.userSavedIconSets.findFirst({
		where: and(eq(userSavedIconSets.userId, userId), eq(userSavedIconSets.iconSetId, iconSetId))
	});

	if (!isOwner && !isSaved && !targetSet.isPublished) {
		throw new Error("Vous n'avez pas accès à ce set d'icônes.");
	}

	await db.update(userTable).set({ activeIconSetId: iconSetId }).where(eq(userTable.id, userId));

	return { activeIconSetId: iconSetId, iconSet: targetSet };
}

/**
 * Publie un set d'icônes sous forme de publication sur le flux public.
 *
 * @param userId Identifiant de l'auteur
 * @param iconSetId Identifiant du set d'icônes
 * @param content Texte optionnel accompagnant la publication
 */
export async function publishIconSet(userId: string, iconSetId: string, content?: string) {
	const set = await db.query.iconSets.findFirst({
		where: and(eq(iconSets.id, iconSetId), eq(iconSets.ownerId, userId))
	});

	if (!set) {
		throw new Error("Set d'icônes introuvable ou non autorisé.");
	}

	await db.update(iconSets).set({ isPublished: true }).where(eq(iconSets.id, iconSetId));

	const post = await createPost({
		authorId: userId,
		content: content || `Voici mon pack d'icônes personnalisé : **${set.name}** !`,
		mediaUrls: [],
		postType: 'icon_set',
		iconSetId,
		visibility: 'public'
	});

	return { post, iconSet: { ...set, isPublished: true } };
}
