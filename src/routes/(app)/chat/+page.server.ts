import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { chatParticipants } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireSession } from '$lib/server/auth';
import type { PageServerLoad, Actions } from './$types';
import {
	softDeleteChat,
	acceptChatInvitation,
	rejectChatInvitation,
	toggleChatMute
} from '$lib/server/chat';
import { parseStoryReply } from '$lib/stories';

export const load: PageServerLoad = async ({ parent }) => {
	const { sessionUser } = await parent();
	if (!sessionUser) throw redirect(302, '/login');
	const currentUserId = sessionUser.id;

	const myParticipations = await db.query.chatParticipants.findMany({
		where: and(eq(chatParticipants.userId, currentUserId), eq(chatParticipants.isHidden, false)),
		with: {
			chat: {
				with: {
					participants: { with: { user: true } },
					messages: {
						orderBy: (msgs, { desc }) => [desc(msgs.createdAt)],
						limit: 1,
						with: { sender: { columns: { name: true, username: true } } }
					}
				}
			}
		}
	});

	const contacts = myParticipations
		.filter((p) => {
			// Pour les conversations directes, si aucun message n'a encore été envoyé,
			// on ne l'affiche pas dans la liste des conversations (notamment pour le destinataire).
			if (p.chat.type === 'direct' && p.chat.messages.length === 0) {
				return false;
			}
			return true;
		})
		.map((p) => {
			const chat = p.chat;
			const lastMessage = chat.messages[0];
			let title = chat.name;
			let image = null;

			if (chat.type === 'direct') {
				const other = chat.participants.find((cp) => cp.userId !== currentUserId)?.user;
				if (other) {
					title = other.name || other.username;
					image = other.image;
				}
			}

			const isCleared = lastMessage && lastMessage.createdAt <= p.clearedAt;
			const displayMessage = isCleared ? null : lastMessage;

			let lastMessageText = 'Nouvelle conversation';
			if (displayMessage) {
				if (displayMessage.content === '[deleted]') {
					lastMessageText = 'Message supprimé';
				} else {
					const parsed = parseStoryReply(displayMessage.content);
					if (parsed.story) {
					lastMessageText = `📷 Réponse à une story : ${parsed.text}`;
				} else if (displayMessage.mediaUrl) {
					if (displayMessage.mediaType === 'image') {
						lastMessageText = displayMessage.content ? `📷 ${displayMessage.content}` : '📷 Photo';
					} else if (displayMessage.mediaType === 'video') {
						lastMessageText = displayMessage.content ? `🎥 ${displayMessage.content}` : '🎥 Vidéo';
					} else if (displayMessage.mediaType === 'audio') {
						lastMessageText = displayMessage.content ? `🎤 ${displayMessage.content}` : '🎤 Message vocal';
					} else {
						lastMessageText = displayMessage.content
							? `📎 ${displayMessage.content}`
							: `📎 ${displayMessage.mediaName || 'Fichier'}`;
					}
				} else {
					lastMessageText = displayMessage.content;
				}
			}
		}

			return {
				id: chat.id,
				type: chat.type,
				title: title || 'Groupe',
				image,
				status: p.status,
				isMuted: p.isMuted,
				lastMessageTime: displayMessage ? displayMessage.createdAt.getTime() : p.joinedAt.getTime(),
				lastMessageContent: lastMessageText,
				isLastMessageFromMe: displayMessage ? displayMessage.senderId === currentUserId : false,
				lastMessageSenderName:
					displayMessage && displayMessage.senderId !== currentUserId
						? displayMessage.sender?.name || displayMessage.sender?.username
						: null
			};
		});

	contacts.sort((a, b) => b.lastMessageTime - a.lastMessageTime);

	return { contacts, currentUserId };
};
export const actions: Actions = {
	acceptChat: async ({ request }) => {
		const session = await requireSession(request);
		const chatId = (await request.formData()).get('chatId')?.toString();
		if (chatId) await acceptChatInvitation(chatId, session.user.id); // 👈 Code mutualisé !
		return { success: true };
	},

	rejectChat: async ({ request }) => {
		const session = await requireSession(request);
		const chatId = (await request.formData()).get('chatId')?.toString();
		if (chatId) await rejectChatInvitation(chatId, session.user.id); // 👈 Code mutualisé !
		return { success: true };
	},

	clearChat: async ({ request, url }) => {
		const session = await requireSession(request);
		const chatId = url.searchParams.get('chatId');
		if (chatId) await softDeleteChat(chatId, session.user.id); // 👈 Code mutualisé !
		return { success: true };
	},

	toggleMuteChat: async ({ request }) => {
		const session = await requireSession(request);
		const data = await request.formData();
		const chatId = data.get('chatId')?.toString();
		const muteStr = data.get('mute')?.toString();
		const mute = muteStr !== undefined ? muteStr === 'true' : undefined;
		if (chatId) {
			const isMuted = await toggleChatMute(chatId, session.user.id, mute);
			return { success: true, isMuted };
		}
		return { success: false };
	}
};
