/**
 * @module server/stories/interactions
 * @description Gestion des interactions utilisateur sur les stories (vues, likes, réponses en message direct).
 */

import { db } from '$lib/server/db';
import { stories, storyViews, storyLikes } from '$lib/server/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { assertCanSeeStory } from '$lib/server/permissions';
import { sendNotification, removeUnreadNotification } from '$lib/server/notifications';
import { getOrCreateDirectChat, sendChatMessage, assertCanSendChatMessage } from '$lib/server/chat';
import { formatStoryReplyContent } from '$lib/stories';

/**
 * Enregistre la vue d'une story par un utilisateur (idempotent).
 *
 * @param storyId Identifiant de la story
 * @param viewerId Identifiant du spectateur
 * @returns `true` si une nouvelle vue a été comptabilisée, `false` sinon
 */
export async function recordStoryView(storyId: string, viewerId: string): Promise<boolean> {
	try {
		await assertCanSeeStory(viewerId, storyId);

		const inserted = await db
			.insert(storyViews)
			.values({
				storyId,
				viewerId
			})
			.onConflictDoNothing()
			.returning();

		if (inserted.length > 0) {
			await db
				.update(stories)
				.set({ viewsCount: sql`${stories.viewsCount} + 1` })
				.where(eq(stories.id, storyId));
			return true;
		}
		return false;
	} catch (e) {
		console.warn('Erreur recordStoryView:', e);
		return false;
	}
}

/**
 * Like ou unlike une story avec mise à jour du compteur et notification à l'auteur.
 *
 * @param storyId Identifiant de la story
 * @param userId Identifiant de l'utilisateur qui like
 * @param action Action explicite optionnelle ('like' ou 'unlike')
 */
export async function toggleStoryLike(
	storyId: string,
	userId: string,
	action?: 'like' | 'unlike'
): Promise<{ success: boolean; isLiked: boolean; likesCount: number }> {
	await assertCanSeeStory(userId, storyId);

	const targetStory = await db.query.stories.findFirst({
		where: eq(stories.id, storyId)
	});
	if (!targetStory) {
		throw new Error('Story introuvable');
	}

	const existing = await db.query.storyLikes.findFirst({
		where: and(eq(storyLikes.storyId, storyId), eq(storyLikes.userId, userId))
	});

	const shouldLike = action ? action === 'like' : !existing;

	if (shouldLike) {
		const inserted = await db
			.insert(storyLikes)
			.values({ storyId, userId })
			.onConflictDoNothing()
			.returning();

		let likesCount = targetStory.likesCount;
		if (inserted.length > 0) {
			const [updated] = await db
				.update(stories)
				.set({ likesCount: sql`${stories.likesCount} + 1` })
				.where(eq(stories.id, storyId))
				.returning({ likesCount: stories.likesCount, authorId: stories.authorId });
			if (updated) {
				likesCount = updated.likesCount;
			}

			// Notification à l'auteur de la story (si ce n'est pas soi-même)
			if (targetStory.authorId !== userId) {
				await sendNotification({
					recipientId: targetStory.authorId,
					actorId: userId,
					type: 'like',
					entityId: storyId,
					content: 'a aimé votre story'
				});
			}
		}

		return {
			success: true,
			isLiked: true,
			likesCount
		};
	} else {
		const deleted = await db
			.delete(storyLikes)
			.where(and(eq(storyLikes.storyId, storyId), eq(storyLikes.userId, userId)))
			.returning();

		let likesCount = targetStory.likesCount;
		if (deleted.length > 0) {
			const [updated] = await db
				.update(stories)
				.set({ likesCount: sql`GREATEST(0, ${stories.likesCount} - 1)` })
				.where(eq(stories.id, storyId))
				.returning({ likesCount: stories.likesCount });
			if (updated) {
				likesCount = updated.likesCount;
			}

			await removeUnreadNotification({
				actorId: userId,
				entityId: storyId,
				type: 'like'
			});
		}

		return {
			success: true,
			isLiked: false,
			likesCount
		};
	}
}

/**
 * Envoie un message direct en réponse à une story avec vignette interactive.
 *
 * @param storyId Identifiant de la story
 * @param senderId Identifiant de l'expéditeur
 * @param messageText Texte du message de réponse
 * @returns Résultat et identifiant de la conversation
 */
export async function replyToStory(
	storyId: string,
	senderId: string,
	messageText: string
): Promise<{ success: boolean; chatId: string }> {
	const trimmed = messageText.trim();
	if (!trimmed) {
		throw new Error('Message vide');
	}

	await assertCanSeeStory(senderId, storyId);

	const story = await db.query.stories.findFirst({
		where: eq(stories.id, storyId),
		with: {
			author: {
				columns: { id: true, username: true }
			}
		}
	});

	if (!story || !story.author || !story.author.username) {
		throw new Error('Story introuvable');
	}

	if (story.authorId === senderId) {
		throw new Error('Vous ne pouvez pas envoyer de message sur votre propre story');
	}

	// 1. Récupère ou crée la conversation directe avec l'auteur
	const chatId = await getOrCreateDirectChat(senderId, story.author.username);

	// 2. Vérification des restrictions d'envoi unifiées (bloqué, refusé, pending)
	await assertCanSendChatMessage(senderId, chatId);

	// 3. Formate le message en y attachant la référence de la story (vignette cliquable)
	const fullMessage = formatStoryReplyContent(
		{
			id: story.id,
			authorId: story.authorId,
			authorUsername: story.author.username || '',
			mediaUrl: story.mediaUrl,
			mediaType: story.mediaType as 'image' | 'video',
			caption: story.caption
		},
		trimmed
	);

	await sendChatMessage(chatId, senderId, fullMessage);

	return { success: true, chatId };
}
