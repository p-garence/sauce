/**
 * @module server/chat/messages
 * @description Envoi, mise à jour, suppression et notifications en temps réel pour les messages de chat.
 */

import { db, client } from '$lib/server/db';
import { chatParticipants, user as userTable, messages } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { notifyMentions } from '$lib/server/mentions';
import { sendPushNotification } from '$lib/server/push';
import { deleteMediaFiles } from '$lib/server/media';
import { assertCanSendChatMessage } from './conversations';

/**
 * Envoie un message dans un chat après vérification des droits et statuts.
 * Notifie les participants via SSE et push notifications.
 *
 * @param chatId Identifiant de la conversation
 * @param senderId Identifiant de l'expéditeur
 * @param content Texte du message
 * @param media Fichier ou média attaché optionnel
 * @returns Le message créé avec les informations de l'expéditeur
 */
export async function sendChatMessage(
	chatId: string,
	senderId: string,
	content: string,
	media?: {
		url: string;
		type: 'image' | 'video' | 'file' | 'audio';
		name: string;
		size: number;
	} | null
) {
	await assertCanSendChatMessage(senderId, chatId);

	// 1. On insère le message
	const [newMessage] = await db
		.insert(messages)
		.values({
			chatId,
			senderId,
			content: content || '',
			mediaUrl: media?.url ?? null,
			mediaType: media?.type ?? null,
			mediaName: media?.name ?? null,
			mediaSize: media?.size ?? null
		})
		.returning();

	// 2. On "réveille" la conversation pour tout le monde
	await db
		.update(chatParticipants)
		.set({ isHidden: false })
		.where(eq(chatParticipants.chatId, chatId));

	// 3. On met à jour la date de lecture UNIQUEMENT pour l'expéditeur
	await db
		.update(chatParticipants)
		.set({ lastReadAt: new Date() })
		.where(and(eq(chatParticipants.chatId, chatId), eq(chatParticipants.userId, senderId)));

	// 4. On prépare la notification Temps Réel
	const senderInfo = await db.query.user.findFirst({
		where: eq(userTable.id, senderId),
		columns: { name: true, username: true, image: true }
	});

	const messageWithSender = { ...newMessage, sender: senderInfo };
	const payload = JSON.stringify({ type: 'message', data: messageWithSender });

	const participantsList = await db.query.chatParticipants.findMany({
		where: eq(chatParticipants.chatId, chatId)
	});

	// On notifie tout le monde en SSE
	for (const p of participantsList) {
		const channel = `events_user_${p.userId.replace(/-/g, '_')}`;
		await client.notify(channel, payload);
	}

	// Envoi des notifications push pour les destinataires non-mutés
	for (const p of participantsList) {
		if (p.userId === senderId || p.isMuted) continue;

		db.query.user
			.findFirst({
				where: eq(userTable.id, p.userId),
				columns: { notificationSettings: true }
			})
			.then((recipientUser) => {
				const notifSettings = recipientUser?.notificationSettings;
				if (notifSettings?.all === false || notifSettings?.message === false) return;

				const senderDisplayName =
					senderInfo?.name ||
					(senderInfo?.username ? `@${senderInfo.username}` : 'Nouveau message');

				let preview = content;
				if (!preview && media) {
					if (media.type === 'image') preview = '📷 Photo';
					else if (media.type === 'video') preview = '🎥 Vidéo';
					else if (media.type === 'audio') preview = '🎤 Message vocal';
					else preview = `📎 Fichier : ${media.name}`;
				} else if (preview && media) {
					if (media.type === 'image') preview = `📷 ${preview}`;
					else if (media.type === 'video') preview = `🎥 ${preview}`;
					else if (media.type === 'audio') preview = `🎤 ${preview}`;
					else preview = `📎 ${preview}`;
				}
				const finalPreview = preview.length > 100 ? preview.slice(0, 97) + '...' : preview;

				sendPushNotification(p.userId, {
					title: senderDisplayName,
					body: finalPreview,
					url: `/chat/${chatId}`,
					tag: `chat-${chatId}`
				}).catch((err) => console.error('[ChatPush] Erreur push:', err));
			})
			.catch((err) => console.error('[ChatPush] Erreur lecture destinataire:', err));
	}

	// Notifications spécifiques pour les mentions @username parmi les membres du chat
	const participantIds = participantsList.map((p) => p.userId);
	if (content) {
		await notifyMentions({
			actorId: senderId,
			text: content,
			entityId: chatId,
			context: 'chat',
			allowedRecipientIds: participantIds
		});
	}

	return messageWithSender;
}

/**
 * Modifie le contenu d'un message existant et notifie les participants.
 *
 * @param messageId Identifiant du message
 * @param userId Identifiant du propriétaire
 * @param content Nouveau texte
 * @returns Le message mis à jour
 */
export async function updateChatMessage(messageId: string, userId: string, content: string) {
	const msg = await db.query.messages.findFirst({
		where: eq(messages.id, messageId)
	});
	if (!msg) throw error(404, 'Message introuvable');
	if (msg.senderId !== userId) throw error(403, 'Non autorisé à modifier ce message');
	if (msg.content === '[deleted]') throw error(400, 'Impossible de modifier un message supprimé');

	const trimmed = content.trim();
	if (!trimmed && !msg.mediaUrl) {
		throw error(400, 'Le message ne peut pas être vide');
	}

	const [updated] = await db
		.update(messages)
		.set({
			content: trimmed,
			updatedAt: new Date()
		})
		.where(eq(messages.id, messageId))
		.returning();

	const senderInfo = await db.query.user.findFirst({
		where: eq(userTable.id, userId),
		columns: { name: true, username: true, image: true }
	});

	const messageWithSender = { ...updated, sender: senderInfo };

	// Notifier les nouvelles mentions @username parmi les membres du chat
	const participantsList = await db.query.chatParticipants.findMany({
		where: eq(chatParticipants.chatId, msg.chatId)
	});
	const participantIds = participantsList.map((p) => p.userId);
	if (trimmed) {
		await notifyMentions({
			actorId: userId,
			text: trimmed,
			entityId: msg.chatId,
			context: 'chat',
			allowedRecipientIds: participantIds
		});
	}

	// SSE notification de modification
	const payload = JSON.stringify({
		type: 'message_updated',
		data: messageWithSender
	});
	for (const p of participantsList) {
		const channel = `events_user_${p.userId.replace(/-/g, '_')}`;
		await client.notify(channel, payload).catch(() => {});
	}

	return messageWithSender;
}

/**
 * Supprime (soft-delete) un message de chat et son éventuel fichier média.
 *
 * @param messageId Identifiant du message
 * @param userId Identifiant du propriétaire
 * @returns Le message masqué avec statut [deleted]
 */
export async function deleteChatMessage(messageId: string, userId: string) {
	const msg = await db.query.messages.findFirst({
		where: eq(messages.id, messageId)
	});
	if (!msg) throw error(404, 'Message introuvable');
	if (msg.senderId !== userId) throw error(403, 'Non autorisé à supprimer ce message');
	if (msg.content === '[deleted]') throw error(400, 'Ce message est déjà supprimé');

	if (msg.mediaUrl) {
		await deleteMediaFiles([{ type: msg.mediaType || 'file', content: msg.mediaUrl }]);
	}

	const [updated] = await db
		.update(messages)
		.set({
			content: '[deleted]',
			mediaUrl: null,
			mediaType: null,
			mediaName: null,
			mediaSize: null,
			updatedAt: new Date()
		})
		.where(eq(messages.id, messageId))
		.returning();

	const senderInfo = await db.query.user.findFirst({
		where: eq(userTable.id, userId),
		columns: { name: true, username: true, image: true }
	});

	const messageWithSender = { ...updated, sender: senderInfo };

	// SSE notification de suppression
	const participantsList = await db.query.chatParticipants.findMany({
		where: eq(chatParticipants.chatId, msg.chatId)
	});
	const payload = JSON.stringify({
		type: 'message_deleted',
		data: { messageId, chatId: msg.chatId, message: messageWithSender }
	});
	for (const p of participantsList) {
		const channel = `events_user_${p.userId.replace(/-/g, '_')}`;
		await client.notify(channel, payload).catch(() => {});
	}

	return messageWithSender;
}
