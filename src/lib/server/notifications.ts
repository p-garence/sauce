import { db, client } from '$lib/server/db';
import { notifications, user as userTable } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type {
	AppNotification,
	NotificationActorData,
	NotificationPayload,
	StreamEvent
} from '$lib/types';
import { sendPushNotification } from '$lib/server/push';

export type { NotificationPayload };

function sendPushForNotification(
	payload: NotificationPayload,
	actorInfos: NotificationActorData | null,
	fallbackTagId: string
) {
	db.query.user
		.findFirst({
			where: eq(userTable.id, payload.recipientId),
			columns: { notificationSettings: true }
		})
		.then((recipientUser) => {
			const settings = recipientUser?.notificationSettings;
			if (settings?.all === false) return;

			// Vérification du type
			if (payload.type === 'like' && settings?.like === false) return;
			if (payload.type === 'comment' && settings?.comment === false) return;
			if (payload.type === 'follow' && settings?.follow === false) return;
			if (payload.type === 'message' && settings?.message === false) return;

			const actorName =
				actorInfos?.name || (actorInfos?.username ? `@${actorInfos.username}` : 'Quelqu’un');
			let title = 'Nouvelle notification';
			let body = payload.content || '';
			let targetUrl = '/flux';

			switch (payload.type) {
				case 'like': {
					const isStory = payload.content?.includes('story');
					title = isStory
						? `${actorName} a aimé votre story`
						: `${actorName} a aimé votre publication`;
					body = payload.content || 'A aimé votre publication.';
					if (payload.entityId) {
						targetUrl = isStory ? `/story/${payload.entityId}` : `/post/${payload.entityId}`;
					}
					break;
				}
				case 'comment':
					title = `${actorName} a commenté`;
					body = payload.content || 'Nouveau commentaire sur votre publication.';
					if (payload.entityId) targetUrl = `/post/${payload.entityId}`;
					break;
				case 'follow':
					title = `${actorName} a commencé à vous suivre`;
					body = payload.content || `${actorName} est désormais abonné.`;
					if (actorInfos?.username) targetUrl = `/profil/${actorInfos.username}`;
					break;
				case 'mention':
					title = `${actorName} vous a mentionné`;
					body = payload.content || `${actorName} vous a mentionné.`;
					if (payload.entityId) targetUrl = `/post/${payload.entityId}`;
					break;
				case 'message':
					title = `Message de ${actorName}`;
					body = payload.content || 'Nouveau message reçu.';
					if (payload.entityId) targetUrl = `/chat/${payload.entityId}`;
					break;
				case 'system':
					title = 'Le serveur';
					body = payload.content || 'Nouvelle notification système.';
					if (payload.entityId) targetUrl = `/post/${payload.entityId}`;
					break;
			}

			sendPushNotification(payload.recipientId, {
				title,
				body,
				url: targetUrl,
				tag: `notif-${payload.type}-${payload.entityId || fallbackTagId}`
			}).catch((err) => console.error('[PushNotification] Erreur envoi push:', err));
		})
		.catch((err) => console.error('[PushNotification] Erreur lecture destinataire:', err));
}

export async function sendNotification(payload: NotificationPayload) {
	if (payload.recipientId === payload.actorId) return;

	// Si c'est un like, on vérifie s'il existe déjà une notification de cet acteur pour cette entité
	if (payload.type === 'like' && payload.actorId && payload.entityId) {
		const existing = await db.query.notifications.findFirst({
			where: and(
				eq(notifications.recipientId, payload.recipientId),
				eq(notifications.actorId, payload.actorId),
				eq(notifications.type, 'like'),
				eq(notifications.entityId, payload.entityId)
			)
		});

		if (existing) {
			const [updatedNotif] = await db
				.update(notifications)
				.set({
					isRead: false,
					createdAt: new Date(),
					content: payload.content || null
				})
				.where(eq(notifications.id, existing.id))
				.returning();

			let actorInfos: NotificationActorData | null = null;
			if (payload.actorId) {
				const dbActor = await db.query.user.findFirst({
					where: eq(userTable.id, payload.actorId),
					columns: { username: true, name: true, image: true, id: true }
				});
				if (dbActor) {
					actorInfos = {
						id: dbActor.id,
						name: dbActor.name || null,
						username: dbActor.username || 'Utilisateur Inconnu',
						image: dbActor.image
					};
				}
			}

			const fullNotification = {
				id: updatedNotif.id,
				type: updatedNotif.type,
				isRead: updatedNotif.isRead,
				createdAt: updatedNotif.createdAt.toISOString(),
				content: updatedNotif.content,
				actor: actorInfos,
				entityId: updatedNotif.entityId,
				actionState: updatedNotif.actionState
			} as AppNotification;

			const streamEvent: StreamEvent = {
				type: 'notification',
				data: fullNotification
			};

			const channelName = `events_user_${payload.recipientId.replace(/-/g, '_')}`;
			await client.notify(channelName, JSON.stringify(streamEvent));

			sendPushForNotification(payload, actorInfos, updatedNotif.id);
			return;
		}
	}

	const [newNotif] = await db
		.insert(notifications)
		.values({
			recipientId: payload.recipientId,
			actorId: payload.actorId || null,
			type: payload.type,
			entityId: payload.entityId || null,
			content: payload.content || null,
			actionState: payload.actionState || null
		})
		.returning();

	let actorInfos: NotificationActorData | null = null;
	if (payload.actorId) {
		const dbActor = await db.query.user.findFirst({
			where: eq(userTable.id, payload.actorId),
			columns: { username: true, name: true, image: true, id: true }
		});
		if (dbActor) {
			actorInfos = {
				id: dbActor.id,
				name: dbActor.name || null,
				username: dbActor.username || 'Utilisateur Inconnu',
				image: dbActor.image
			};
		}
	}

	const fullNotification = {
		id: newNotif.id,
		type: newNotif.type,
		isRead: newNotif.isRead,
		createdAt: newNotif.createdAt.toISOString(),
		content: newNotif.content,
		actor: actorInfos,
		entityId: newNotif.entityId,
		actionState: newNotif.actionState
	} as AppNotification;

	const streamEvent: StreamEvent = {
		type: 'notification',
		data: fullNotification
	};

	const channelName = `events_user_${payload.recipientId.replace(/-/g, '_')}`;
	await client.notify(channelName, JSON.stringify(streamEvent));

	sendPushForNotification(payload, actorInfos, newNotif.id);
}

/**
 * Supprime les notifications non lues correspondant aux critères et notifie le client en temps réel.
 */
export async function removeUnreadNotification(payload: {
	recipientId?: string;
	actorId: string;
	entityId: string;
	type: 'like' | 'comment' | 'follow' | 'mention';
}) {
	const conditions = [
		eq(notifications.actorId, payload.actorId),
		eq(notifications.entityId, payload.entityId),
		eq(notifications.type, payload.type),
		eq(notifications.isRead, false)
	];
	if (payload.recipientId) {
		conditions.push(eq(notifications.recipientId, payload.recipientId));
	}

	const deleted = await db
		.delete(notifications)
		.where(and(...conditions))
		.returning({ id: notifications.id, recipientId: notifications.recipientId });

	for (const notif of deleted) {
		const channelName = `events_user_${notif.recipientId.replace(/-/g, '_')}`;
		const streamEvent: StreamEvent = {
			type: 'notification_deleted',
			data: { id: notif.id }
		};
		await client.notify(channelName, JSON.stringify(streamEvent)).catch(console.error);
	}

	return deleted;
}

/**
 * Diffuse une notification système liée à un post à l'ensemble des utilisateurs enregistrés.
 */
export async function broadcastSystemNotification(payload: { postId: string; message: string }) {
	const allUsers = await db.select({ id: userTable.id }).from(userTable);

	if (allUsers.length === 0) return;

	const notifsToInsert = allUsers.map((u) => ({
		recipientId: u.id,
		actorId: null,
		type: 'system' as const,
		entityId: payload.postId,
		content: payload.message,
		isRead: false
	}));

	const insertedNotifs = await db.insert(notifications).values(notifsToInsert).returning();

	const nowIso = new Date().toISOString();
	for (const notif of insertedNotifs) {
		const fullNotification: AppNotification = {
			id: notif.id,
			type: 'system',
			isRead: false,
			createdAt: notif.createdAt ? notif.createdAt.toISOString() : nowIso,
			content: notif.content,
			actor: null,
			entityId: notif.entityId,
			actionState: null
		};

		const streamEvent: StreamEvent = {
			type: 'notification',
			data: fullNotification
		};

		const channelName = `events_user_${notif.recipientId.replace(/-/g, '_')}`;
		client.notify(channelName, JSON.stringify(streamEvent)).catch(console.error);

		sendPushNotification(notif.recipientId, {
			title: 'Le serveur',
			body: payload.message,
			url: `/post/${payload.postId}`,
			tag: `notif-system-${payload.postId}`
		}).catch(console.error);
	}
}
