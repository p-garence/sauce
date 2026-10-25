import { error, isHttpError } from '@sveltejs/kit';
import { requireSession } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { chatParticipants, messages, notifications } from '$lib/server/db/schema';
import { eq, and, desc, gt } from 'drizzle-orm';
import { MESSAGES_PER_CHAT } from '$lib/constants';
import type { PageServerLoad, Actions } from './$types';
import {
	softDeleteChat,
	sendChatMessage,
	blockChatUser,
	acceptChatInvitation,
	rejectChatInvitation,
	unblockChatUser,
	toggleChatMute,
	deleteChatMessage,
	updateChatMessage,
	assertCanSendChatMessage,
	formatMessageReactions
} from '$lib/server/chat';
import { saveChatFile, getUserMediaUsage, formatBytes } from '$lib/server/media';
import { isValidUuid } from '$lib/utils/validation';

export const load: PageServerLoad = async ({ params, parent }) => {
	if (!isValidUuid(params.chatId)) {
		throw error(404, 'Conversation introuvable');
	}

	const { sessionUser } = await parent();
	const currentUserId = sessionUser.id;

	const participation = await db.query.chatParticipants.findFirst({
		where: and(
			eq(chatParticipants.chatId, params.chatId),
			eq(chatParticipants.userId, currentUserId)
		),
		with: {
			chat: {
				with: {
					participants: {
						with: {
							user: {
								columns: { id: true, name: true, username: true, image: true }
							}
						}
					}
				}
			}
		}
	});

	if (!participation) throw error(403, 'Accès refusé ou conversation introuvable');

	const chat = participation.chat;

	const chatMessages = await db.query.messages.findMany({
		where: and(eq(messages.chatId, params.chatId), gt(messages.createdAt, participation.clearedAt)),
		orderBy: [desc(messages.createdAt)],
		limit: MESSAGES_PER_CHAT,
		with: {
			sender: { columns: { name: true, username: true, image: true } },
			reactions: {
				with: {
					user: { columns: { id: true, name: true, username: true, image: true } }
				}
			}
		}
	});

	chatMessages.reverse();

	const formattedMessages = chatMessages.map((m) => ({
		...m,
		reactions: formatMessageReactions(m.reactions || [], currentUserId)
	}));

	await db
		.update(chatParticipants)
		.set({ lastReadAt: new Date(), isHidden: false })
		.where(
			and(eq(chatParticipants.chatId, params.chatId), eq(chatParticipants.userId, currentUserId))
		);

	// On marque également comme lues les notifications de mentions pour cette conversation
	await db
		.update(notifications)
		.set({ isRead: true })
		.where(
			and(
				eq(notifications.recipientId, currentUserId),
				eq(notifications.entityId, params.chatId),
				eq(notifications.type, 'mention'),
				eq(notifications.isRead, false)
			)
		);

	let title = chat.name;
	let image = null;
	let otherUserId = null;
	let otherUserStatus: string | null = null;
	let otherUserUsername: string | null = null;

	if (chat.type === 'direct') {
		const other = chat.participants.find((p) => p.userId !== currentUserId);
		if (other) {
			title = other.user.name || other.user.username;
			image = other.user.image;
			otherUserId = other.user.id;
			otherUserStatus = other.status;
			otherUserUsername = other.user.username;
		}
	}

	return {
		chatId: params.chatId,
		type: chat.type,
		title: title || 'Groupe',
		description: chat.type === 'group' ? chat.description : null,
		image,
		messages: formattedMessages,
		currentUserId,
		hasMore: chatMessages.length === MESSAGES_PER_CHAT,
		otherUserId,
		adminOnlyMessaging: chat.adminOnlyMessaging,
		isAdmin: participation.isAdmin,
		isMuted: participation.isMuted,
		myStatus: participation.status,
		otherUserStatus,
		otherUserUsername,
		currentUsername: sessionUser.username
	};
};

export const actions: Actions = {
	sendMessage: async ({ request, params }) => {
		const session = await requireSession(request);
		const formData = await request.formData();
		const content = formData.get('content')?.toString() || '';
		const file = formData.get('file') as File | null;

		const hasText = content.trim().length > 0;
		const hasFile = file instanceof File && file.size > 0;

		if (!hasText && !hasFile) return { success: false, error: 'Message vide' };

		try {
			await assertCanSendChatMessage(session.user.id, params.chatId);

			let savedMedia = null;
			if (hasFile && file) {
				// Vérifier le quota de l'utilisateur
				const userUsage = await getUserMediaUsage(session.user.id);
				if (userUsage.totalBytes + file.size > userUsage.quotaBytes) {
					return {
						success: false,
						error: `Quota de stockage dépassé (${formatBytes(userUsage.totalBytes)} / ${formatBytes(userUsage.quotaBytes)}). Supprimez d'anciens médias pour libérer de l'espace.`
					};
				}

				const saved = await saveChatFile(file);
				savedMedia = {
					url: saved.content,
					type: saved.type,
					name: saved.name,
					size: saved.size
				};
			}

			const newMessage = await sendChatMessage(
				params.chatId,
				session.user.id,
				content.trim(),
				savedMedia
			);
			return { success: true, newMessage };
		} catch (err) {
			if (isHttpError(err)) return { success: false, error: err.body.message };
			return { success: false, error: "Erreur lors de l'envoi" };
		}
	},

	acceptChat: async ({ request, params }) => {
		const session = await requireSession(request);
		await acceptChatInvitation(params.chatId, session.user.id);
		return { success: true };
	},
	rejectChat: async ({ request, params }) => {
		const session = await requireSession(request);
		await rejectChatInvitation(params.chatId, session.user.id);
		return { success: true };
	},
	blockChat: async ({ request, params }) => {
		const session = await requireSession(request);
		await blockChatUser(params.chatId, session.user.id);
		return { success: true };
	},
	unblockChat: async ({ request, params }) => {
		const session = await requireSession(request);
		await unblockChatUser(params.chatId, session.user.id);
		return { success: true };
	},
	clearChat: async ({ request, params }) => {
		const session = await requireSession(request);
		await softDeleteChat(params.chatId, session.user.id);
		return { success: true };
	},
	toggleMute: async ({ request, params }) => {
		const session = await requireSession(request);
		const data = await request.formData();
		const muteStr = data.get('mute')?.toString();
		const mute = muteStr !== undefined ? muteStr === 'true' : undefined;
		const isMuted = await toggleChatMute(params.chatId, session.user.id, mute);
		return { success: true, isMuted };
	},
	deleteMessage: async ({ request }) => {
		const session = await requireSession(request);
		const data = await request.formData();
		const messageId = data.get('messageId')?.toString();
		if (!messageId) return { success: false, error: 'ID de message manquant' };
		try {
			await deleteChatMessage(messageId, session.user.id);
			return { success: true };
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : 'Erreur lors de la suppression';
			return { success: false, error: message };
		}
	},
	editMessage: async ({ request }) => {
		const session = await requireSession(request);
		const data = await request.formData();
		const messageId = data.get('messageId')?.toString();
		const content = data.get('content')?.toString() || '';
		if (!messageId) return { success: false, error: 'ID de message manquant' };
		try {
			const updated = await updateChatMessage(messageId, session.user.id, content);
			return { success: true, message: updated };
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : 'Erreur lors de la modification';
			return { success: false, error: message };
		}
	}
};
