/**
 * @module server/chat/conversations
 * @description Gestion des conversations (salons, participants, invitations, permissions, sourdine).
 */

import { db } from '$lib/server/db';
import {
	chats,
	chatParticipants,
	user as userTable,
	follows,
	messages
} from '$lib/server/db/schema';
import { eq, and, inArray, not, sql } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import {
	blockUserGlobal,
	unblockUserGlobal,
	isBlockedBidirectional
} from '$lib/server/permissions';

/**
 * Définit le statut d'une invitation selon les règles de confidentialité du destinataire.
 *
 * @param senderId Identifiant de l'expéditeur
 * @param receiverId Identifiant du destinataire
 * @returns Statut initial 'accepted' ou 'pending'
 */
export async function getMessagePermission(
	senderId: string,
	receiverId: string
): Promise<'accepted' | 'pending'> {
	const receiver = await db.query.user.findFirst({
		where: eq(userTable.id, receiverId)
	});

	if (!receiver) throw error(404, 'Utilisateur introuvable');

	// Si le destinataire n'exige pas d'approbation, c'est directement accepté
	if (!receiver.profileVisibility?.requireMessageApproval) return 'accepted';

	// Sinon, on vérifie s'il nous suit. S'il nous suit, on est "accepted", sinon "pending"
	const isConnection = await db.query.follows.findFirst({
		where: and(
			eq(follows.followerId, receiverId),
			eq(follows.followingId, senderId),
			eq(follows.status, 'accepted')
		)
	});

	return isConnection ? 'accepted' : 'pending';
}

/**
 * Trouve ou crée une conversation directe entre deux utilisateurs.
 *
 * @param currentUserId Identifiant de l'utilisateur courant
 * @param targetUsername Nom d'utilisateur de la cible
 * @returns Identifiant du chat
 */
export async function getOrCreateDirectChat(
	currentUserId: string,
	targetUsername: string
): Promise<string> {
	const targetUser = await db.query.user.findFirst({
		where: eq(userTable.username, targetUsername)
	});

	if (!targetUser) throw error(404, 'Utilisateur introuvable');
	if (targetUser.id === currentUserId)
		throw error(400, 'Vous ne pouvez pas vous parler à vous-même');

	if (await isBlockedBidirectional(currentUserId, targetUser.id)) {
		throw error(403, 'Vous ne pouvez pas contacter cette personne.');
	}

	// 1. Cherche si un chat direct existe déjà entre CES DEUX utilisateurs
	const existing = await db
		.select({ id: chats.id })
		.from(chats)
		.innerJoin(chatParticipants, eq(chats.id, chatParticipants.chatId))
		.where(
			and(
				eq(chats.type, 'direct'),
				inArray(chatParticipants.userId, [currentUserId, targetUser.id])
			)
		)
		.groupBy(chats.id)
		.having(sql`count(distinct ${chatParticipants.userId}) = 2`)
		.limit(1);

	if (existing.length > 0) {
		return existing[0].id;
	}

	// 2. Le chat n'existe pas : on récupère le statut cible
	const status = await getMessagePermission(currentUserId, targetUser.id);

	// 3. On crée le chat dans une transaction atomique
	return await db.transaction(async (tx) => {
		const [newChat] = await tx.insert(chats).values({ type: 'direct' }).returning();

		await tx.insert(chatParticipants).values([
			{ chatId: newChat.id, userId: currentUserId, isAdmin: false, status: 'accepted' },
			{ chatId: newChat.id, userId: targetUser.id, isAdmin: false, status: status }
		]);

		return newChat.id;
	});
}

/**
 * Crée un groupe avec des statuts d'invitation dynamiques.
 *
 * @param creatorId Identifiant du créateur
 * @param name Nom du groupe
 * @param usernames Noms d'utilisateurs invités
 * @returns Identifiant du nouveau chat groupe
 */
export async function createGroupChat(
	creatorId: string,
	name: string,
	usernames: string[]
): Promise<string> {
	const invitedUsers = await db
		.select({ id: userTable.id, username: userTable.username })
		.from(userTable)
		.where(inArray(userTable.username, usernames));

	if (invitedUsers.length === 0) throw error(400, 'Aucun utilisateur valide trouvé');

	const participantStatuses: { userId: string; status: 'accepted' | 'pending' }[] = [];
	for (const u of invitedUsers) {
		if (await isBlockedBidirectional(creatorId, u.id)) continue;
		const status = await getMessagePermission(creatorId, u.id);
		participantStatuses.push({ userId: u.id, status });
	}

	if (participantStatuses.length === 0) throw error(400, 'Aucun utilisateur valide trouvé');

	return await db.transaction(async (tx) => {
		const [newChat] = await tx
			.insert(chats)
			.values({ type: 'group', name: name.trim() })
			.returning();

		const participants: {
			chatId: string;
			userId: string;
			isAdmin: boolean;
			status: 'accepted' | 'pending';
		}[] = [];
		for (const p of participantStatuses) {
			participants.push({ chatId: newChat.id, userId: p.userId, isAdmin: false, status: p.status });
		}

		participants.push({ chatId: newChat.id, userId: creatorId, isAdmin: true, status: 'accepted' });

		await tx.insert(chatParticipants).values(participants);

		return newChat.id;
	});
}

/**
 * "Soft Delete" : Vide l'historique et cache la conversation pour cet utilisateur.
 *
 * @param chatId Identifiant de la conversation
 * @param userId Identifiant de l'utilisateur
 */
export async function softDeleteChat(chatId: string, userId: string): Promise<void> {
	await db
		.update(chatParticipants)
		.set({ isHidden: true, clearedAt: new Date() })
		.where(and(eq(chatParticipants.chatId, chatId), eq(chatParticipants.userId, userId)));
}

/**
 * Accepte une invitation de message.
 *
 * @param chatId Identifiant de la conversation
 * @param userId Identifiant de l'utilisateur
 */
export async function acceptChatInvitation(chatId: string, userId: string): Promise<void> {
	await db
		.update(chatParticipants)
		.set({ status: 'accepted' })
		.where(
			and(
				eq(chatParticipants.chatId, chatId),
				eq(chatParticipants.userId, userId),
				inArray(chatParticipants.status, ['pending', 'refused'])
			)
		);
}

/**
 * Refuse une invitation de message.
 *
 * @param chatId Identifiant de la conversation
 * @param userId Identifiant de l'utilisateur
 */
export async function rejectChatInvitation(chatId: string, userId: string): Promise<void> {
	await db
		.update(chatParticipants)
		.set({ status: 'refused' })
		.where(and(eq(chatParticipants.chatId, chatId), eq(chatParticipants.userId, userId)));
}

/**
 * Bloque un utilisateur dans un chat et globalement.
 *
 * @param chatId Identifiant de la conversation
 * @param userId Identifiant de l'utilisateur qui bloque
 */
export async function blockChatUser(chatId: string, userId: string): Promise<void> {
	await db
		.update(chatParticipants)
		.set({ status: 'blocked' })
		.where(and(eq(chatParticipants.chatId, chatId), eq(chatParticipants.userId, userId)));

	const chatInfo = await db.query.chats.findFirst({ where: eq(chats.id, chatId) });
	if (chatInfo?.type === 'direct') {
		const other = await db.query.chatParticipants.findFirst({
			where: and(eq(chatParticipants.chatId, chatId), not(eq(chatParticipants.userId, userId)))
		});
		if (other) {
			await blockUserGlobal(userId, other.userId);
		}
	}
}

/**
 * Débloque un utilisateur (rebascule le statut en 'accepted' et débloque globalement).
 *
 * @param chatId Identifiant de la conversation
 * @param userId Identifiant de l'utilisateur qui débloque
 */
export async function unblockChatUser(chatId: string, userId: string): Promise<void> {
	await db
		.update(chatParticipants)
		.set({ status: 'accepted' })
		.where(and(eq(chatParticipants.chatId, chatId), eq(chatParticipants.userId, userId)));

	const chatInfo = await db.query.chats.findFirst({ where: eq(chats.id, chatId) });
	if (chatInfo?.type === 'direct') {
		const other = await db.query.chatParticipants.findFirst({
			where: and(eq(chatParticipants.chatId, chatId), not(eq(chatParticipants.userId, userId)))
		});
		if (other) {
			await unblockUserGlobal(userId, other.userId);
		}
	}
}

/**
 * Met à jour les informations d'un groupe (nom, description, droits admin).
 */
export async function updateGroupInfo(
	chatId: string,
	userId: string,
	name: string,
	description: string | null,
	adminOnly: boolean
): Promise<void> {
	const caller = await db.query.chatParticipants.findFirst({
		where: and(eq(chatParticipants.chatId, chatId), eq(chatParticipants.userId, userId))
	});
	if (!caller?.isAdmin) throw error(403, 'Non autorisé');

	await db
		.update(chats)
		.set({ name, description, adminOnlyMessaging: adminOnly })
		.where(eq(chats.id, chatId));
}

/**
 * Ajoute un membre à un groupe.
 */
export async function addGroupMember(
	chatId: string,
	callerId: string,
	targetUsername: string,
	makeAdmin: boolean
): Promise<void> {
	const caller = await db.query.chatParticipants.findFirst({
		where: and(eq(chatParticipants.chatId, chatId), eq(chatParticipants.userId, callerId))
	});
	if (!caller?.isAdmin) throw error(403, 'Non autorisé');

	const userToAdd = await db.query.user.findFirst({
		where: eq(userTable.username, targetUsername)
	});
	if (!userToAdd) throw error(404, 'Utilisateur introuvable');

	try {
		await db.insert(chatParticipants).values({
			chatId,
			userId: userToAdd.id,
			isAdmin: makeAdmin,
			status: 'pending'
		});
	} catch {
		throw error(400, 'Cet utilisateur est déjà dans le groupe');
	}
}

/**
 * Promeut ou rétrograde un administrateur de groupe.
 */
export async function toggleGroupAdmin(
	chatId: string,
	callerId: string,
	targetUserId: string,
	promote: boolean
): Promise<void> {
	const caller = await db.query.chatParticipants.findFirst({
		where: and(eq(chatParticipants.chatId, chatId), eq(chatParticipants.userId, callerId))
	});
	if (!caller?.isAdmin) throw error(403, 'Non autorisé');

	if (!promote && callerId === targetUserId) {
		const admins = await db.query.chatParticipants.findMany({
			where: and(eq(chatParticipants.chatId, chatId), eq(chatParticipants.isAdmin, true))
		});
		if (admins.length <= 1) throw error(400, 'Vous êtes le dernier administrateur');
	}

	await db
		.update(chatParticipants)
		.set({ isAdmin: promote })
		.where(and(eq(chatParticipants.chatId, chatId), eq(chatParticipants.userId, targetUserId)));
}

/**
 * Retire un membre d'un groupe.
 */
export async function removeGroupMember(
	chatId: string,
	callerId: string,
	targetUserId: string
): Promise<void> {
	const caller = await db.query.chatParticipants.findFirst({
		where: and(eq(chatParticipants.chatId, chatId), eq(chatParticipants.userId, callerId))
	});
	if (!caller?.isAdmin) throw error(403, 'Non autorisé');
	if (callerId === targetUserId) throw error(400, 'Vous ne pouvez pas vous exclure vous-même');

	await db
		.delete(chatParticipants)
		.where(and(eq(chatParticipants.chatId, chatId), eq(chatParticipants.userId, targetUserId)));
}

/**
 * Permet à un utilisateur de quitter un groupe.
 */
export async function leaveGroupChat(chatId: string, userId: string): Promise<void> {
	const caller = await db.query.chatParticipants.findFirst({
		where: and(eq(chatParticipants.chatId, chatId), eq(chatParticipants.userId, userId))
	});

	if (caller?.isAdmin) {
		const allParticipants = await db.query.chatParticipants.findMany({
			where: eq(chatParticipants.chatId, chatId)
		});
		const admins = allParticipants.filter((p) => p.isAdmin);

		if (admins.length === 1 && allParticipants.length > 1) {
			throw error(400, 'Vous êtes le dernier admin. Nommez un autre admin avant de quitter.');
		}
	}

	await db
		.delete(chatParticipants)
		.where(and(eq(chatParticipants.chatId, chatId), eq(chatParticipants.userId, userId)));
}

/**
 * Active ou désactive la sourdine pour une conversation et un utilisateur donné.
 *
 * @param chatId Identifiant de la conversation
 * @param userId Identifiant de l'utilisateur
 * @param mute État souhaité (si non spécifié, bascule l'état actuel)
 * @returns Nouvel état de sourdine
 */
export async function toggleChatMute(
	chatId: string,
	userId: string,
	mute?: boolean
): Promise<boolean> {
	const participant = await db.query.chatParticipants.findFirst({
		where: and(eq(chatParticipants.chatId, chatId), eq(chatParticipants.userId, userId))
	});
	if (!participant) throw error(404, 'Participant introuvable');

	const nextMuted = mute !== undefined ? mute : !participant.isMuted;

	await db
		.update(chatParticipants)
		.set({ isMuted: nextMuted })
		.where(and(eq(chatParticipants.chatId, chatId), eq(chatParticipants.userId, userId)));

	return nextMuted;
}

/**
 * Vérifie qu'un utilisateur a le droit d'envoyer un message dans une conversation.
 * Lève une exception HttpError (403 ou 404) si l'utilisateur est bloqué, refusé,
 * s'il s'agit d'une demande en attente après un premier message, ou si le groupe est réservé aux admins.
 *
 * @param senderId Identifiant de l'expéditeur
 * @param chatId Identifiant de la conversation
 */
export async function assertCanSendChatMessage(
	senderId: string,
	chatId: string
): Promise<{
	caller: typeof chatParticipants.$inferSelect;
	chatInfo: typeof chats.$inferSelect;
}> {
	const myParticipation = await db.query.chatParticipants.findFirst({
		where: and(eq(chatParticipants.chatId, chatId), eq(chatParticipants.userId, senderId))
	});

	if (
		!myParticipation ||
		myParticipation.status === 'blocked' ||
		myParticipation.status === 'refused'
	) {
		throw error(403, 'Accès refusé à cette conversation.');
	}

	const chatInfo = await db.query.chats.findFirst({ where: eq(chats.id, chatId) });
	if (!chatInfo) {
		throw error(404, 'Conversation introuvable');
	}

	if (chatInfo.adminOnlyMessaging && !myParticipation.isAdmin) {
		throw error(403, 'Seuls les administrateurs peuvent envoyer des messages.');
	}

	// Pour les conversations directes ou avec d'autres participants
	const otherParticipant = await db.query.chatParticipants.findFirst({
		where: and(eq(chatParticipants.chatId, chatId), not(eq(chatParticipants.userId, senderId)))
	});

	if (otherParticipant) {
		if (
			otherParticipant.status === 'blocked' ||
			(await isBlockedBidirectional(senderId, otherParticipant.userId))
		) {
			throw error(403, 'Vous ne pouvez plus écrire à cette personne.');
		}
		if (otherParticipant.status === 'refused') {
			throw error(403, "L'utilisateur n'a pas accepté votre demande.");
		}
		if (otherParticipant.status === 'pending') {
			const myMessages = await db.query.messages.findMany({
				where: and(eq(messages.chatId, chatId), eq(messages.senderId, senderId))
			});
			if (myMessages.length > 0) {
				throw error(403, "Vous devez attendre que l'utilisateur accepte votre demande.");
			}
		}
	}

	return { caller: myParticipation, chatInfo };
}
