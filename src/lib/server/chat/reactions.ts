/**
 * @module server/chat/reactions
 * @description Gestion des réactions emojis sur les messages de chat (ajout, suppression, groupement, diffusion en temps réel).
 */

import { db, client } from '$lib/server/db';
import {
	messages,
	chatParticipants,
	messageReactions
} from '$lib/server/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { MessageReactionGroup, MessageReactionUser } from '$lib/types';
import { isValidUuid } from '$lib/utils/validation';

export interface RawReactionWithUser {
	id: string;
	messageId: string;
	userId: string;
	emojiId: string;
	emojiName: string;
	emojiUrl: string;
	user?: {
		id: string;
		name: string | null;
		username: string | null;
		image?: string | null;
	} | null;
}

/**
 * Groupe une liste brute de réactions de message par emojiId.
 *
 * @param rawReactions Liste brute de réactions extraites de la base
 * @param currentUserId Identifiant de l'utilisateur actif pour marquer hasReacted
 * @returns Liste de groupes de réactions
 */
export function formatMessageReactions(
	rawReactions: RawReactionWithUser[],
	currentUserId?: string | null
): MessageReactionGroup[] {
	if (!rawReactions || rawReactions.length === 0) return [];

	const groupsMap = new Map<
		string,
		{
			emojiId: string;
			emojiName: string;
			emojiUrl: string;
			users: MessageReactionUser[];
			hasReacted: boolean;
		}
	>();

	for (const r of rawReactions) {
		let group = groupsMap.get(r.emojiId);
		if (!group) {
			group = {
				emojiId: r.emojiId,
				emojiName: r.emojiName,
				emojiUrl: r.emojiUrl,
				users: [],
				hasReacted: false
			};
			groupsMap.set(r.emojiId, group);
		}

		group.users.push({
			id: r.userId,
			name: r.user?.name ?? null,
			username: r.user?.username ?? null,
			image: r.user?.image ?? null
		});

		if (currentUserId && r.userId === currentUserId) {
			group.hasReacted = true;
		}
	}

	return Array.from(groupsMap.values()).map((g) => ({
		emojiId: g.emojiId,
		emojiName: g.emojiName,
		emojiUrl: g.emojiUrl,
		count: g.users.length,
		users: g.users,
		hasReacted: g.hasReacted
	}));
}

/**
 * Alterne (ajoute ou supprime) la réaction d'un utilisateur sur un message de chat.
 * Diffuse l'événement SSE à tous les participants de la conversation.
 *
 * @param messageId Identifiant du message
 * @param userId Identifiant de l'utilisateur
 * @param emoji Objet emoji { id, name, url }
 * @returns Le tableau actualisé des réactions groupées
 */
export async function toggleMessageReaction(
	messageId: string,
	userId: string,
	emoji: { id: string; name: string; url: string }
): Promise<{ messageId: string; chatId: string; reactions: MessageReactionGroup[] }> {
	if (!isValidUuid(messageId)) {
		throw error(400, 'Identifiant de message invalide.');
	}

	if (!emoji?.id || !emoji?.url) {
		throw error(400, 'Emoji invalide.');
	}

	const msg = await db.query.messages.findFirst({
		where: eq(messages.id, messageId),
		columns: { id: true, chatId: true, content: true }
	});

	if (!msg) {
		throw error(404, 'Message introuvable.');
	}

	if (msg.content === '[deleted]') {
		throw error(400, 'Impossible de réagir à un message supprimé.');
	}

	// Vérifier la participation au chat
	const participation = await db.query.chatParticipants.findFirst({
		where: and(eq(chatParticipants.chatId, msg.chatId), eq(chatParticipants.userId, userId))
	});

	if (!participation || participation.status === 'blocked' || participation.status === 'refused') {
		throw error(403, 'Accès refusé à cette conversation.');
	}

	// Vérifier si la réaction existe déjà
	const existing = await db.query.messageReactions.findFirst({
		where: and(
			eq(messageReactions.messageId, messageId),
			eq(messageReactions.userId, userId),
			eq(messageReactions.emojiId, emoji.id)
		)
	});

	if (existing) {
		await db.delete(messageReactions).where(eq(messageReactions.id, existing.id));
	} else {
		await db.insert(messageReactions).values({
			messageId,
			userId,
			emojiId: emoji.id,
			emojiName: emoji.name || 'emoji',
			emojiUrl: emoji.url
		});
	}

	// Récupérer toutes les réactions à jour pour ce message
	const allReactions = await db.query.messageReactions.findMany({
		where: eq(messageReactions.messageId, messageId),
		with: {
			user: {
				columns: { id: true, name: true, username: true, image: true }
			}
		},
		orderBy: [asc(messageReactions.createdAt)]
	});

	const formattedReactions = formatMessageReactions(allReactions, userId);

	// Diffuser l'événement SSE à tous les participants
	const participantsList = await db.query.chatParticipants.findMany({
		where: eq(chatParticipants.chatId, msg.chatId)
	});

	const payload = JSON.stringify({
		type: 'message_reaction',
		data: {
			chatId: msg.chatId,
			messageId: msg.id,
			reactions: formattedReactions
		}
	});

	for (const p of participantsList) {
		const channel = `events_user_${p.userId.replace(/-/g, '_')}`;
		await client.notify(channel, payload).catch(() => {});
	}

	return {
		messageId: msg.id,
		chatId: msg.chatId,
		reactions: formattedReactions
	};
}
