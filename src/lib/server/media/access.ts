/**
 * @module server/media/access
 * @description Contrôle d'accès et politiques de visibilité pour les fichiers multimédias stockés.
 */

import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import {
	posts,
	stories,
	messages,
	chatParticipants,
	user as userTable,
	iconSets,
	userSavedIconSets,
	emojiSets,
	userSavedEmojiSets
} from '$lib/server/db/schema';
import { sql, eq, and, or, inArray } from 'drizzle-orm';
import { canSeePostSql, canSeeStorySql } from '$lib/server/permissions';
import { getInstanceSettings } from '$lib/server/instanceSettings';

/**
 * Résultat du contrôle d'accès à un fichier média.
 */
export interface MediaAccessResult {
	/** Indique si le fichier peut recevoir des en-têtes de cache public immuable (1 an). */
	isPublicImmutable: boolean;
}

/**
 * Vérifie si un utilisateur (ou visiteur anonyme) est autorisé à accéder à un fichier média.
 * Lève une exception HttpError (401 si non authentifié alors que requis, 403 si interdit).
 *
 * Règles appliquées :
 * - Instance privée : Accès strictement réservé aux utilisateurs connectés.
 * - Avatars d'utilisateurs : Publics (ou réseau si instance privée).
 * - Pièces jointes de chat : Privées, réservées aux participants de la conversation.
 * - Publications : Selon la visibilité du post (public, followers, réseau, groupe, privé).
 * - Stories : Selon la visibilité de la story ou si référencée dans une réponse de chat.
 * - Packs d'icônes / émojis : Publics si publiés ou packs par défaut, sinon réservés au créateur ou utilisateur l'ayant enregistré.
 * - Brouillons / nouveaux uploads : Fenêtre de grâce configurée réservée aux utilisateurs connectés.
 *
 * @param filename Nom de base du fichier nettoyé (ex: `uuid.webp`)
 * @param viewerId Identifiant de l'utilisateur connecté ou `null` si visiteur anonyme
 * @param fileMtimeMs Timestamp de modification du fichier sur le disque en millisecondes
 * @returns Informations sur les droits et la politique de mise en cache
 */
export async function canAccessMediaFile(
	filename: string,
	viewerId: string | null,
	fileMtimeMs: number
): Promise<MediaAccessResult> {
	const settings = await getInstanceSettings();
	const isPublicInstance = settings.privacySettings.isPublicInstance !== false;

	if (!isPublicInstance && !viewerId) {
		throw error(401, 'Non autorisé. Cette instance est privée.');
	}

	const mediaUrl = `/media/${filename}`;

	// A0. Vérification rapide pour les avatars d'utilisateurs (publics par nature)
	const [userWithAvatar] = await db
		.select({ id: userTable.id })
		.from(userTable)
		.where(eq(userTable.image, mediaUrl))
		.limit(1);
	const isAvatar = Boolean(userWithAvatar);

	let isChatAttachment = false;
	let isPublicPost = false;
	let isPublicStory = false;
	let isPublicAsset = false;

	if (!isAvatar) {
		// A. Vérification pour les pièces jointes de messages de chat (privées aux participants)
		const chatMsg = await db.query.messages.findFirst({
			where: eq(messages.mediaUrl, mediaUrl),
			columns: { chatId: true, senderId: true }
		});

		if (chatMsg) {
			isChatAttachment = true;
			if (!viewerId) {
				throw error(401, 'Non autorisé. Vous devez être connecté pour accéder à ce fichier.');
			}
			const isParticipant = await db.query.chatParticipants.findFirst({
				where: and(
					eq(chatParticipants.chatId, chatMsg.chatId),
					eq(chatParticipants.userId, viewerId)
				)
			});
			if (!isParticipant) {
				throw error(403, 'Accès interdit. Vous ne participez pas à cette discussion.');
			}
		}

		// B. Vérification pour les publications (recherche indexée JSONB GIN)
		const baseVideoUrl = mediaUrl.endsWith('_poster.webp')
			? mediaUrl.replace('_poster.webp', '.mp4')
			: null;

		const targetJson = JSON.stringify([{ content: mediaUrl }]);
		const targetPosterJson = JSON.stringify([{ poster: mediaUrl }]);
		const targetBaseVideoJson = baseVideoUrl ? JSON.stringify([{ content: baseVideoUrl }]) : null;
		const targetJsonLegacy = JSON.stringify([mediaUrl]);

		const orConditions = [
			sql`${posts.mediaUrls} @> ${targetJson}::jsonb`,
			sql`${posts.mediaUrls} @> ${targetPosterJson}::jsonb`,
			sql`${posts.mediaUrls} @> ${targetJsonLegacy}::jsonb`
		];
		if (targetBaseVideoJson) {
			orConditions.push(sql`${posts.mediaUrls} @> ${targetBaseVideoJson}::jsonb`);
		}

		const [parentPost] = await db
			.select({ id: posts.id, visibility: posts.visibility })
			.from(posts)
			.where(or(...orConditions))
			.limit(1);

		if (parentPost) {
			isPublicPost = parentPost.visibility === 'public';
			if (!isPublicPost && !viewerId) {
				throw error(401, 'Non autorisé. Vous devez être connecté pour voir ce média.');
			}
			const [visiblePost] = await db
				.select({ id: posts.id })
				.from(posts)
				.where(and(eq(posts.id, parentPost.id), canSeePostSql(viewerId)))
				.limit(1);

			if (!visiblePost) {
				throw error(403, "Vous n'avez pas accès à ce média.");
			}
		}

		// C. Vérification pour les stories
		const [parentStory] = await db
			.select({
				id: stories.id,
				authorId: stories.authorId,
				visibility: stories.visibility,
				expiresAt: stories.expiresAt
			})
			.from(stories)
			.where(eq(stories.mediaUrl, mediaUrl))
			.limit(1);

		if (parentStory) {
			const isExpired = parentStory.expiresAt <= new Date();
			isPublicStory = !isExpired && parentStory.visibility === 'public';

			if (parentStory.authorId !== viewerId) {
				if (isExpired) {
					// Story expirée / archivée : seul l'auteur peut y accéder (sauf si citée dans un chat participant)
					let allowedViaChatReply = false;
					if (viewerId) {
						const replyRows = await db
							.select({ id: messages.id })
							.from(messages)
							.innerJoin(chatParticipants, eq(messages.chatId, chatParticipants.chatId))
							.where(
								and(
									eq(chatParticipants.userId, viewerId),
									sql`${messages.content} LIKE ${'%' + mediaUrl + '%'}`
								)
							)
							.limit(1);
						allowedViaChatReply = replyRows.length > 0;
					}
					if (!allowedViaChatReply) {
						throw error(403, "Cette story est archivée et n'est plus accessible.");
					}
				} else {
					if (!isPublicStory && !viewerId) {
						throw error(401, 'Non autorisé. Vous devez être connecté pour voir cette story.');
					}

					const [visibleStory] = await db
						.select({ id: stories.id })
						.from(stories)
						.where(and(eq(stories.id, parentStory.id), canSeeStorySql(viewerId)))
						.limit(1);

					if (!visibleStory) {
						let allowedViaChatReply = false;
						if (viewerId) {
							const replyRows = await db
								.select({ id: messages.id })
								.from(messages)
								.innerJoin(chatParticipants, eq(messages.chatId, chatParticipants.chatId))
								.where(
									and(
										eq(chatParticipants.userId, viewerId),
										sql`${messages.content} LIKE ${'%' + mediaUrl + '%'}`
									)
								)
								.limit(1);
							allowedViaChatReply = replyRows.length > 0;
						}
						if (!allowedViaChatReply) {
							throw error(403, "Vous n'avez pas accès à cette story.");
						}
					}
				}
			}
		}

		// D. Si non rattaché à un post, chat ou story, vérifier les packs d'icônes et d'émojis
		if (!chatMsg && !parentPost && !parentStory) {
			const emojiTargetJson = JSON.stringify([{ url: mediaUrl }]);
			const [matchedIcons, matchedEmojis] = await Promise.all([
				db
					.select({
						id: iconSets.id,
						ownerId: iconSets.ownerId,
						isPublished: iconSets.isPublished,
						isInstanceDefault: iconSets.isInstanceDefault
					})
					.from(iconSets)
					.where(sql`${iconSets.icons}::text LIKE ${'%' + filename + '%'}`),
				db
					.select({
						id: emojiSets.id,
						ownerId: emojiSets.ownerId,
						isPublished: emojiSets.isPublished,
						isInstanceDefault: emojiSets.isInstanceDefault
					})
					.from(emojiSets)
					.where(sql`${emojiSets.emojis} @> ${emojiTargetJson}::jsonb`)
			]);

			const hasMatchedAsset = matchedIcons.length > 0 || matchedEmojis.length > 0;

			if (hasMatchedAsset) {
				const allMatched = [...matchedIcons, ...matchedEmojis];
				const anyPublic = allMatched.some((s) => s.isPublished || s.isInstanceDefault);
				const anyOwned = Boolean(viewerId && allMatched.some((s) => s.ownerId === viewerId));

				if (anyPublic) {
					isPublicAsset = true;
				} else if (!anyOwned) {
					if (!viewerId) {
						throw error(
							401,
							'Non autorisé. Vous devez être connecté pour accéder à cette ressource.'
						);
					}
					const iconIds = matchedIcons.map((s) => s.id);
					const emojiIds = matchedEmojis.map((s) => s.id);
					const [savedIcon, savedEmoji] = await Promise.all([
						iconIds.length > 0
							? db.query.userSavedIconSets.findFirst({
									where: and(
										eq(userSavedIconSets.userId, viewerId),
										inArray(userSavedIconSets.iconSetId, iconIds)
									)
								})
							: Promise.resolve(null),
						emojiIds.length > 0
							? db.query.userSavedEmojiSets.findFirst({
									where: and(
										eq(userSavedEmojiSets.userId, viewerId),
										inArray(userSavedEmojiSets.emojiSetId, emojiIds)
									)
								})
							: Promise.resolve(null)
					]);

					if (!savedIcon && !savedEmoji) {
						throw error(403, "Vous n'avez pas accès à cette ressource.");
					}
				}
			} else {
				// E. Politique Fail-Close : fichier non rattaché en BDD.
				// Autorisé uniquement pour un utilisateur connecté pendant la fenêtre de brouillon.
				const graceHours = settings.mediaSettings.orphanGracePeriodHours || 2;
				const isRecentUpload = Date.now() - fileMtimeMs < graceHours * 60 * 60 * 1000;
				if (!viewerId || !isRecentUpload) {
					throw error(403, "Vous n'avez pas accès à ce média.");
				}
			}
		}
	}

	const isPublicImmutable =
		isPublicInstance &&
		(isAvatar || isPublicPost || isPublicStory || isPublicAsset) &&
		!isChatAttachment;

	return { isPublicImmutable };
}
