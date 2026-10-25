import { error, redirect, isHttpError } from '@sveltejs/kit';
import { requireSession } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { chats } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import {
	updateGroupInfo,
	addGroupMember,
	toggleGroupAdmin,
	removeGroupMember,
	leaveGroupChat,
	toggleChatMute
} from '$lib/server/chat';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, parent }) => {
	// ... Gardez tout le code de la fonction load tel quel (inchangé)
	const { sessionUser } = await parent();
	const chatId = params.chatId;

	const chatInfo = await db.query.chats.findFirst({
		where: eq(chats.id, chatId),
		with: {
			participants: {
				with: {
					user: {
						columns: { id: true, name: true, username: true, image: true }
					}
				}
			}
		}
	});

	if (!chatInfo) throw error(404, 'Groupe introuvable');
	if (chatInfo.type !== 'group') throw redirect(303, `/chat/${chatId}`);

	const currentParticipant = chatInfo.participants.find((p) => p.userId === sessionUser.id);
	if (!currentParticipant) throw error(403, 'Accès refusé');

	const adminsCount = chatInfo.participants.filter((p) => p.isAdmin).length;

	return {
		chat: chatInfo,
		participants: chatInfo.participants,
		isAdmin: currentParticipant.isAdmin,
		isOnlyAdmin: currentParticipant.isAdmin && adminsCount === 1,
		isMuted: currentParticipant.isMuted,
		currentUserId: sessionUser.id
	};
};

// Fonction utilitaire pour attraper les erreurs proprement
function handleError(err: unknown) {
	if (isHttpError(err)) return { error: err.body.message };
	return { error: 'Une erreur est survenue' };
}

export const actions: Actions = {
	updateGroup: async ({ request, params }) => {
		const session = await requireSession(request);
		const data = await request.formData();
		const name = data.get('name')?.toString();
		const description = data.get('description')?.toString();
		const adminOnly = data.get('adminOnlyMessaging') === 'true';

		if (!name || name.trim() === '') return { error: 'Le nom est requis' };

		try {
			await updateGroupInfo(
				params.chatId,
				session.user.id,
				name.trim(),
				description?.trim() || null,
				adminOnly
			);
			return { success: true };
		} catch (err) {
			return handleError(err);
		}
	},

	addMember: async ({ request, params }) => {
		const session = await requireSession(request);
		const data = await request.formData();
		const username = data.get('username')?.toString();
		const makeAdmin = data.get('makeAdmin') === 'true';

		if (!username) return { error: "Nom d'utilisateur requis" };

		try {
			await addGroupMember(params.chatId, session.user.id, username, makeAdmin);
			return { success: true };
		} catch (err) {
			return handleError(err);
		}
	},

	toggleAdmin: async ({ request, params }) => {
		const session = await requireSession(request);
		const data = await request.formData();
		const targetUserId = data.get('userId')?.toString();
		const action = data.get('action')?.toString();

		if (!targetUserId || !action) return { error: 'Données manquantes' };

		try {
			await toggleGroupAdmin(params.chatId, session.user.id, targetUserId, action === 'promote');
			return { success: true };
		} catch (err) {
			return handleError(err);
		}
	},

	removeMember: async ({ request, params }) => {
		const session = await requireSession(request);
		const targetUserId = (await request.formData()).get('userId')?.toString();

		if (!targetUserId) return { error: 'ID requis' };

		try {
			await removeGroupMember(params.chatId, session.user.id, targetUserId);
			return { success: true };
		} catch (err) {
			return handleError(err);
		}
	},

	leaveGroup: async ({ request, params }) => {
		const session = await requireSession(request);
		try {
			await leaveGroupChat(params.chatId, session.user.id);
		} catch (err) {
			return handleError(err);
		}
		throw redirect(303, '/chat');
	},

	toggleMute: async ({ request, params }) => {
		const session = await requireSession(request);
		const data = await request.formData();
		const muteStr = data.get('mute')?.toString();
		const mute = muteStr !== undefined ? muteStr === 'true' : undefined;
		try {
			const isMuted = await toggleChatMute(params.chatId, session.user.id, mute);
			return { success: true, isMuted };
		} catch (err) {
			return handleError(err);
		}
	}
};
