/**
 * @module server/emojis
 * @description Gestion des packs d'emojis personnalisés (CRUD, bibliothèque, favoris, activation).
 */

import { db } from '$lib/server/db';
import { emojiSets, userSavedEmojiSets, user as userTable, posts } from '$lib/server/db/schema';
import { eq, and, desc, inArray, ne, or, sql } from 'drizzle-orm';
import { createPost } from '$lib/server/posts/crud';
import type { EmojiItem } from '$lib/types';
import { cleanEmojiToken } from '$lib/emojis';
import { getInstanceDefaultEmojiSets } from './instanceSettings';
import { isValidAssetUrl, sanitizePackName } from './customPacks/common';

function sanitizeEmojiList(rawEmojis: EmojiItem[] | undefined): EmojiItem[] {
	if (!Array.isArray(rawEmojis)) return [];
	const cleaned: EmojiItem[] = [];
	const slice = rawEmojis.slice(0, 100);
	for (let idx = 0; idx < slice.length; idx++) {
		const e = slice[idx];
		if (!e || !isValidAssetUrl(e.url)) continue;
		const safeId =
			typeof e.id === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(e.id)
				? e.id
				: `em_${Date.now()}_${idx}`;
		cleaned.push({
			id: safeId,
			name: cleanEmojiToken(e.name, 30) || `emoji_${idx + 1}`,
			url: e.url
		});
	}
	return cleaned;
}

/**
 * Récupère la bibliothèque d'emojis complète pour un utilisateur (sets possédés, sauvegardés, par défaut, actifs).
 *
 * @param userId Identifiant de l'utilisateur
 */
export async function getUserEmojiLibrary(userId: string) {
	const currentUser = await db.query.user.findFirst({
		where: eq(userTable.id, userId),
		columns: {
			activeEmojiSetId: true,
			activeEmojiSetIds: true,
			disabledEmojiSetIds: true,
			favoriteEmojiIds: true
		}
	});

	const owned = await db.query.emojiSets.findMany({
		where: and(eq(emojiSets.ownerId, userId), eq(emojiSets.isDeletedByOwner, false)),
		with: {
			owner: {
				columns: { id: true, username: true, name: true, image: true }
			}
		},
		orderBy: [desc(emojiSets.createdAt)]
	});

	// Nettoie d'office tout doublon : un utilisateur ne doit pas avoir son propre set dans saved
	if (owned.length > 0) {
		const ownedIds = owned.map((o) => o.id);
		await db
			.delete(userSavedEmojiSets)
			.where(
				and(eq(userSavedEmojiSets.userId, userId), inArray(userSavedEmojiSets.emojiSetId, ownedIds))
			)
			.catch(() => {});
	}

	const savedRelations = await db.query.userSavedEmojiSets.findMany({
		where: eq(userSavedEmojiSets.userId, userId),
		with: {
			emojiSet: {
				with: {
					owner: {
						columns: { id: true, username: true, name: true, image: true }
					}
				}
			}
		},
		orderBy: [desc(userSavedEmojiSets.savedAt)]
	});

	const saved = savedRelations
		.map((r) => r.emojiSet)
		.filter((s): s is NonNullable<typeof s> => Boolean(s) && s.ownerId !== userId);

	let activeEmojiSetIds = (currentUser?.activeEmojiSetIds as string[]) || [];
	if (activeEmojiSetIds.length === 0 && currentUser?.activeEmojiSetId) {
		activeEmojiSetIds = [currentUser.activeEmojiSetId];
	}

	const instanceDefaultSets = await getInstanceDefaultEmojiSets();
	const disabledEmojiSetIds = (currentUser?.disabledEmojiSetIds as string[]) || [];

	return {
		owned,
		saved,
		instanceDefaultSets,
		disabledEmojiSetIds,
		activeEmojiSetId: currentUser?.activeEmojiSetId || null,
		activeEmojiSetIds,
		favoriteEmojiIds: (currentUser?.favoriteEmojiIds as string[]) || []
	};
}

/**
 * Récupère un set d'emojis par son identifiant avec les infos du propriétaire.
 *
 * @param id Identifiant du set d'emojis
 */
export async function getEmojiSetById(id: string) {
	return await db.query.emojiSets.findFirst({
		where: eq(emojiSets.id, id),
		with: {
			owner: {
				columns: { id: true, username: true, name: true, image: true }
			}
		}
	});
}

/**
 * Crée un nouveau set d'emojis pour un utilisateur.
 *
 * @param userId Identifiant du créateur
 * @param data Données du set
 */
export async function createEmojiSet(
	userId: string,
	data: {
		name: string;
		description?: string;
		emojis?: EmojiItem[];
		favoriteEmojiIds?: string[];
	}
) {
	const trimmedName = sanitizePackName(data.name, "Le nom de la collection d'emojis est requis.");

	const cleanEmojis = sanitizeEmojiList(data.emojis);
	if (cleanEmojis.length === 0) {
		throw new Error("La collection d'émojis doit contenir au moins un émoji valide.");
	}

	const defaultFavs =
		data.favoriteEmojiIds && data.favoriteEmojiIds.length > 0
			? data.favoriteEmojiIds.slice(0, 6)
			: cleanEmojis.slice(0, 6).map((e) => e.id);

	const [created] = await db
		.insert(emojiSets)
		.values({
			ownerId: userId,
			name: trimmedName,
			description: data.description?.trim() || null,
			emojis: cleanEmojis,
			favoriteEmojiIds: defaultFavs
		})
		.returning();

	// Activer automatiquement la nouvelle collection dans les collections actives de l'utilisateur
	const currentUser = await db.query.user.findFirst({
		where: eq(userTable.id, userId),
		columns: { activeEmojiSetId: true, activeEmojiSetIds: true }
	});
	if (currentUser) {
		const existingActive = (currentUser.activeEmojiSetIds as string[]) || [];
		if (!existingActive.includes(created.id)) {
			await db
				.update(userTable)
				.set({
					activeEmojiSetIds: [...existingActive, created.id],
					activeEmojiSetId: currentUser.activeEmojiSetId || created.id
				})
				.where(eq(userTable.id, userId));
		}
	}

	return created;
}

export async function updateEmojiSet(
	userId: string,
	id: string,
	data: {
		name?: string;
		description?: string;
		emojis?: EmojiItem[];
		favoriteEmojiIds?: string[];
	}
) {
	const existing = await db.query.emojiSets.findFirst({
		where: and(eq(emojiSets.id, id), eq(emojiSets.ownerId, userId))
	});

	if (!existing) {
		throw new Error("Collection d'emojis introuvable ou non autorisée.");
	}

	const updatePayload: Partial<typeof emojiSets.$inferInsert> = {};
	if (data.name !== undefined) {
		const trimmed = data.name.trim();
		if (!trimmed) throw new Error('Le nom ne peut pas être vide.');
		updatePayload.name = trimmed.slice(0, 50);
	}
	if (data.description !== undefined) {
		updatePayload.description = data.description?.trim() || null;
	}
	if (data.emojis !== undefined) {
		const cleanEmojis = sanitizeEmojiList(data.emojis);
		if (cleanEmojis.length === 0) {
			throw new Error("La collection d'émojis doit contenir au moins un émoji valide.");
		}
		updatePayload.emojis = cleanEmojis;
	}
	if (data.favoriteEmojiIds !== undefined) {
		updatePayload.favoriteEmojiIds = data.favoriteEmojiIds.slice(0, 6);
	}

	const [updated] = await db
		.update(emojiSets)
		.set(updatePayload)
		.where(eq(emojiSets.id, id))
		.returning();

	return updated;
}

export async function deleteEmojiSet(userId: string, id: string) {
	const existing = await db.query.emojiSets.findFirst({
		where: and(eq(emojiSets.id, id), eq(emojiSets.ownerId, userId))
	});

	if (!existing) {
		throw new Error("Collection d'emojis introuvable ou non autorisée.");
	}

	// Désactiver chez l'utilisateur propriétaire
	const user = await db.query.user.findFirst({
		where: eq(userTable.id, userId),
		columns: { activeEmojiSetId: true, activeEmojiSetIds: true }
	});

	if (user) {
		const updatedActiveIds = ((user.activeEmojiSetIds as string[]) || []).filter(
			(sId) => sId !== id
		);
		await db
			.update(userTable)
			.set({
				activeEmojiSetIds: updatedActiveIds,
				activeEmojiSetId:
					user.activeEmojiSetId === id ? updatedActiveIds[0] || null : user.activeEmojiSetId
			})
			.where(eq(userTable.id, userId));
	}

	// Vérifier si cette collection est toujours présente dans la bibliothèque d'au moins un autre utilisateur ou un post
	const [otherUserSaved, otherUserActive, postRef] = await Promise.all([
		db.query.userSavedEmojiSets.findFirst({
			where: and(eq(userSavedEmojiSets.emojiSetId, id), ne(userSavedEmojiSets.userId, userId))
		}),
		db.query.user.findFirst({
			where: and(
				or(
					eq(userTable.activeEmojiSetId, id),
					sql`${userTable.activeEmojiSetIds}::jsonb @> ${JSON.stringify([id])}::jsonb`
				),
				ne(userTable.id, userId)
			)
		}),
		db.query.posts.findFirst({
			where: eq(posts.emojiSetId, id)
		})
	]);

	const isKeptInAnotherLibrary = Boolean(
		otherUserSaved || otherUserActive || postRef || existing.isInstanceDefault
	);

	if (isKeptInAnotherLibrary) {
		// Tant qu'elle est dans la bibliothèque de quelqu'un d'autre ou liée à un post, on la conserve mais on la marque supprimée par l'auteur
		const [updated] = await db
			.update(emojiSets)
			.set({ isDeletedByOwner: true, isPublished: false })
			.where(eq(emojiSets.id, id))
			.returning();

		return updated;
	}

	// Si plus personne ne l'a dans sa bibliothèque, suppression définitive : les emojis disparaissent aussi
	const [deleted] = await db.delete(emojiSets).where(eq(emojiSets.id, id)).returning();
	return deleted;
}

export async function toggleSaveEmojiSet(userId: string, emojiSetId: string) {
	const set = await db.query.emojiSets.findFirst({
		where: eq(emojiSets.id, emojiSetId)
	});
	if (!set) {
		throw new Error("Collection d'emojis introuvable.");
	}

	if (set.ownerId === userId && !set.isDeletedByOwner) {
		throw new Error(
			"Vous êtes le créateur de cette collection d'emojis, elle fait déjà partie de votre bibliothèque."
		);
	}

	const existingSave = await db.query.userSavedEmojiSets.findFirst({
		where: and(eq(userSavedEmojiSets.userId, userId), eq(userSavedEmojiSets.emojiSetId, emojiSetId))
	});

	if (existingSave) {
		await db
			.delete(userSavedEmojiSets)
			.where(
				and(eq(userSavedEmojiSets.userId, userId), eq(userSavedEmojiSets.emojiSetId, emojiSetId))
			);

		// Si présente dans ses sets actifs, on la désactive aussi
		const user = await db.query.user.findFirst({
			where: eq(userTable.id, userId),
			columns: { activeEmojiSetId: true, activeEmojiSetIds: true }
		});
		if (user) {
			const updatedActiveIds = ((user.activeEmojiSetIds as string[]) || []).filter(
				(id) => id !== emojiSetId
			);
			await db
				.update(userTable)
				.set({
					activeEmojiSetIds: updatedActiveIds,
					activeEmojiSetId:
						user.activeEmojiSetId === emojiSetId
							? updatedActiveIds[0] || null
							: user.activeEmojiSetId
				})
				.where(eq(userTable.id, userId));
		}

		// Si le créateur original l'avait déjà supprimée et que plus personne ne la garde dans sa bibliothèque, on la supprime définitivement
		if (set.isDeletedByOwner) {
			const [remainingSave, remainingActive, postRef] = await Promise.all([
				db.query.userSavedEmojiSets.findFirst({
					where: eq(userSavedEmojiSets.emojiSetId, emojiSetId)
				}),
				db.query.user.findFirst({
					where: or(
						eq(userTable.activeEmojiSetId, emojiSetId),
						sql`${userTable.activeEmojiSetIds}::jsonb @> ${JSON.stringify([emojiSetId])}::jsonb`
					)
				}),
				db.query.posts.findFirst({
					where: eq(posts.emojiSetId, emojiSetId)
				})
			]);

			if (!remainingSave && !remainingActive && !postRef && !set.isInstanceDefault) {
				await db.delete(emojiSets).where(eq(emojiSets.id, emojiSetId));
			}
		}

		return { saved: false };
	} else {
		if (set.isDeletedByOwner) {
			throw new Error(
				'Cette collection a été supprimée par son créateur et ne peut plus être ajoutée.'
			);
		}
		if (!set.isPublished && !set.isInstanceDefault && set.ownerId !== userId) {
			throw new Error(
				"Cette collection d'emojis est privée et ne peut pas être ajoutée à votre bibliothèque."
			);
		}

		await db
			.insert(userSavedEmojiSets)
			.values({
				userId,
				emojiSetId
			})
			.onConflictDoNothing();

		// Activer automatiquement le pack dans les sets actifs de l'utilisateur quand il l'ajoute
		const user = await db.query.user.findFirst({
			where: eq(userTable.id, userId),
			columns: { activeEmojiSetId: true, activeEmojiSetIds: true }
		});
		if (user) {
			const activeIds = (user.activeEmojiSetIds as string[]) || [];
			if (!activeIds.includes(emojiSetId)) {
				const nextActive = [...activeIds, emojiSetId];
				await db
					.update(userTable)
					.set({
						activeEmojiSetIds: nextActive,
						activeEmojiSetId: user.activeEmojiSetId || emojiSetId
					})
					.where(eq(userTable.id, userId));
			}
		}

		return { saved: true, isActive: true };
	}
}

export async function toggleActiveEmojiSet(
	userId: string,
	emojiSetId: string,
	shouldActivate?: boolean
) {
	const user = await db.query.user.findFirst({
		where: eq(userTable.id, userId),
		columns: { activeEmojiSetId: true, activeEmojiSetIds: true }
	});
	if (!user) {
		throw new Error('Utilisateur non trouvé');
	}

	let currentActiveIds = (user.activeEmojiSetIds as string[]) || [];
	if (currentActiveIds.length === 0 && user.activeEmojiSetId) {
		currentActiveIds = [user.activeEmojiSetId];
	}

	const isCurrentlyActive = currentActiveIds.includes(emojiSetId);
	const willActivate = shouldActivate !== undefined ? shouldActivate : !isCurrentlyActive;

	if (willActivate) {
		const targetSet = await db.query.emojiSets.findFirst({
			where: eq(emojiSets.id, emojiSetId)
		});
		if (!targetSet) {
			throw new Error("Collection d'emojis introuvable.");
		}
		const isOwner = targetSet.ownerId === userId && !targetSet.isDeletedByOwner;
		const isSaved = await db.query.userSavedEmojiSets.findFirst({
			where: and(
				eq(userSavedEmojiSets.userId, userId),
				eq(userSavedEmojiSets.emojiSetId, emojiSetId)
			)
		});
		if (!isOwner && !isSaved && (!targetSet.isPublished || targetSet.isDeletedByOwner)) {
			throw new Error("Vous n'avez pas accès à cette collection d'emojis.");
		}

		if (!currentActiveIds.includes(emojiSetId)) {
			currentActiveIds = [...currentActiveIds, emojiSetId];
		}
	} else {
		currentActiveIds = currentActiveIds.filter((id) => id !== emojiSetId);
	}

	await db
		.update(userTable)
		.set({
			activeEmojiSetIds: currentActiveIds,
			activeEmojiSetId: currentActiveIds[0] || null
		})
		.where(eq(userTable.id, userId));

	return {
		active: willActivate,
		activeEmojiSetIds: currentActiveIds
	};
}

export async function setActiveEmojiSet(userId: string, emojiSetId: string | null) {
	if (emojiSetId === null) {
		await db
			.update(userTable)
			.set({ activeEmojiSetId: null, activeEmojiSetIds: [] })
			.where(eq(userTable.id, userId));
		return { activeEmojiSetId: null, activeEmojiSetIds: [] };
	}
	return await toggleActiveEmojiSet(userId, emojiSetId, true);
}

export async function setUserFavoriteEmojis(userId: string, favoriteEmojiIds: string[]) {
	const user = await db.query.user.findFirst({
		where: eq(userTable.id, userId),
		columns: { favoriteEmojiIds: true }
	});
	if (!user) {
		throw new Error('Utilisateur non trouvé');
	}

	const cleaned = Array.from(
		new Set(favoriteEmojiIds.filter((id): id is string => typeof id === 'string'))
	).slice(0, 6);

	await db.update(userTable).set({ favoriteEmojiIds: cleaned }).where(eq(userTable.id, userId));

	return {
		favoriteEmojiIds: cleaned
	};
}

export async function removeUserFavoriteEmoji(userId: string, emojiId: string) {
	const user = await db.query.user.findFirst({
		where: eq(userTable.id, userId),
		columns: { favoriteEmojiIds: true }
	});
	if (!user) {
		throw new Error('Utilisateur non trouvé');
	}

	const favs = ((user.favoriteEmojiIds as string[]) || []).filter((id) => id !== emojiId);
	await db.update(userTable).set({ favoriteEmojiIds: favs }).where(eq(userTable.id, userId));

	return {
		favoriteEmojiIds: favs
	};
}

export async function toggleUserFavoriteEmoji(
	userId: string,
	emojiId: string,
	replaceEmojiId?: string
) {
	const user = await db.query.user.findFirst({
		where: eq(userTable.id, userId),
		columns: { favoriteEmojiIds: true }
	});
	if (!user) {
		throw new Error('Utilisateur non trouvé');
	}

	let favs = (user.favoriteEmojiIds as string[]) || [];

	if (replaceEmojiId) {
		const idx = favs.indexOf(replaceEmojiId);
		if (idx !== -1) {
			favs[idx] = emojiId;
			favs = favs.filter((id, i) => i === idx || id !== emojiId);
		} else {
			if (favs.length < 6 && !favs.includes(emojiId)) {
				favs.push(emojiId);
			}
		}
	} else {
		const isFav = favs.includes(emojiId);
		if (isFav) {
			favs = favs.filter((id) => id !== emojiId);
		} else {
			if (favs.length >= 6) {
				throw new Error('La barre de favoris rapide est limitée à 6 emojis.');
			}
			favs = [...favs, emojiId];
		}
	}

	favs = Array.from(new Set(favs)).slice(0, 6);

	await db.update(userTable).set({ favoriteEmojiIds: favs }).where(eq(userTable.id, userId));

	return {
		favoriteEmojiIds: favs,
		isFavorite: favs.includes(emojiId)
	};
}

export async function publishEmojiSet(userId: string, emojiSetId: string, content?: string) {
	const set = await db.query.emojiSets.findFirst({
		where: eq(emojiSets.id, emojiSetId),
		with: {
			owner: {
				columns: { id: true, username: true, name: true, image: true }
			}
		}
	});

	if (!set) {
		throw new Error("Collection d'emojis introuvable.");
	}

	if (set.isDeletedByOwner) {
		throw new Error(
			"Cette collection a été supprimée par son créateur d'origine et ne peut plus être publiée."
		);
	}

	const isOwner = set.ownerId === userId;
	if (!isOwner) {
		if (!set.isPublished) {
			throw new Error("Seul le créateur peut publier cette collection d'emojis.");
		}
		const savedRel = await db.query.userSavedEmojiSets.findFirst({
			where: and(
				eq(userSavedEmojiSets.userId, userId),
				eq(userSavedEmojiSets.emojiSetId, emojiSetId)
			)
		});
		if (!savedRel) {
			throw new Error(
				"Vous devez avoir ajouté cette collection à votre bibliothèque pour pouvoir la partager."
			);
		}
	}

	if (!set.isPublished && isOwner) {
		await db.update(emojiSets).set({ isPublished: true }).where(eq(emojiSets.id, emojiSetId));
	}

	const defaultContent = isOwner
		? `Voici mes emojis personnalisés : **${set.name}** !`
		: `Je vous partage la collection d'emojis **${set.name}** créée par @${set.owner?.username || 'un membre'} !`;

	const post = await createPost({
		authorId: userId,
		content: content || defaultContent,
		mediaUrls: [],
		postType: 'emoji_set',
		emojiSetId,
		visibility: 'public'
	});

	return { post, emojiSet: { ...set, isPublished: true } };
}

export async function toggleInstanceDefaultEmojiSetForUser(userId: string, emojiSetId: string) {
	const user = await db.query.user.findFirst({
		where: eq(userTable.id, userId),
		columns: { disabledEmojiSetIds: true }
	});
	if (!user) {
		throw new Error('Utilisateur non trouvé');
	}

	let disabled = (user.disabledEmojiSetIds as string[]) || [];
	const isDisabled = disabled.includes(emojiSetId);

	if (isDisabled) {
		// Réactiver (retirer de disabled)
		disabled = disabled.filter((id) => id !== emojiSetId);
	} else {
		// Désactiver (ajouter à disabled)
		disabled = [...disabled, emojiSetId];
	}

	await db
		.update(userTable)
		.set({ disabledEmojiSetIds: disabled })
		.where(eq(userTable.id, userId));

	return {
		disabledEmojiSetIds: disabled,
		isActive: !disabled.includes(emojiSetId)
	};
}

export async function getUserActiveEmojiData(userId: string) {
	const currentUser = await db.query.user.findFirst({
		where: eq(userTable.id, userId),
		columns: {
			activeEmojiSetId: true,
			activeEmojiSetIds: true,
			disabledEmojiSetIds: true,
			favoriteEmojiIds: true
		}
	});

	if (!currentUser) {
		return {
			activeSets: [],
			emojis: [] as EmojiItem[],
			favoriteEmojis: [] as EmojiItem[]
		};
	}

	// 1. Sets par défaut de l'instance non désactivés par l'utilisateur
	const defaultSets = await getInstanceDefaultEmojiSets();
	const disabledIds = new Set((currentUser.disabledEmojiSetIds as string[]) || []);
	const activeDefaultSets = defaultSets.filter((s) => !disabledIds.has(s.id));

	// 2. Sets personnalisés activés par l'utilisateur
	let activeIds = (currentUser.activeEmojiSetIds as string[]) || [];
	if (activeIds.length === 0 && currentUser.activeEmojiSetId) {
		activeIds = [currentUser.activeEmojiSetId];
	}

	// Combiner les identifiants actifs sans doublons
	const allActiveIds = Array.from(
		new Set([...activeDefaultSets.map((s) => s.id), ...activeIds])
	);

	const sets =
		allActiveIds.length > 0
			? await db.query.emojiSets.findMany({
					where: inArray(emojiSets.id, allActiveIds)
				})
			: [];

	const allEmojis: EmojiItem[] = [];
	const seenEmojiIds = new Set<string>();

	for (const set of sets) {
		const list = (set.emojis as EmojiItem[]) || [];
		for (const em of list) {
			if (!seenEmojiIds.has(em.id)) {
				seenEmojiIds.add(em.id);
				allEmojis.push(em);
			}
		}
	}

	// Favoris personnels de l'utilisateur (doivent être disponibles même si leur collection d'origine est désactivée)
	const userFavIds = (currentUser.favoriteEmojiIds as string[]) || [];
	const favoriteEmojis: EmojiItem[] = [];

	if (userFavIds.length > 0) {
		const foundFavs = new Map<string, EmojiItem>();

		// 1. Chercher dans les emojis déjà actifs
		for (const em of allEmojis) {
			if (userFavIds.includes(em.id) && !foundFavs.has(em.id)) {
				foundFavs.set(em.id, em);
			}
		}

		// 2. Si certains favoris manquent (collection désactivée ou par défaut désactivée) :
		const missingFromActive = userFavIds.filter((id) => !foundFavs.has(id));
		if (missingFromActive.length > 0) {
			// Chercher dans tous les sets par défaut (y compris ceux désactivés)
			for (const set of defaultSets) {
				for (const em of (set.emojis as EmojiItem[]) || []) {
					if (missingFromActive.includes(em.id) && !foundFavs.has(em.id)) {
						foundFavs.set(em.id, em);
					}
				}
			}

			// Si encore des manquants, chercher dans les collections possédées ou publiées accessibles
			const stillMissing = userFavIds.filter((id) => !foundFavs.has(id));
			if (stillMissing.length > 0) {
				const extraSets = await db.query.emojiSets.findMany({
					where: and(
						or(eq(emojiSets.ownerId, userId), eq(emojiSets.isPublished, true)),
						eq(emojiSets.isDeletedByOwner, false)
					)
				});
				for (const set of extraSets) {
					for (const em of (set.emojis as EmojiItem[]) || []) {
						if (stillMissing.includes(em.id) && !foundFavs.has(em.id)) {
							foundFavs.set(em.id, em);
						}
					}
				}
			}
		}

		// Assembler la liste finale selon l'ordre défini par l'utilisateur
		for (const id of userFavIds) {
			const em = foundFavs.get(id);
			if (em) {
				favoriteEmojis.push(em);
				// Ajouter aussi aux emojis actifs globaux pour permettre leur rendu dans l'app
				if (!seenEmojiIds.has(em.id)) {
					seenEmojiIds.add(em.id);
					allEmojis.push(em);
				}
			}
		}
	}

	return {
		activeSets: sets,
		emojis: allEmojis,
		favoriteEmojis
	};
}
