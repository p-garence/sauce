import webpush from 'web-push';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { db } from '$lib/server/db';
import { pushSubscriptions } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

const publicKey =
	publicEnv.PUBLIC_VAPID_KEY || env.PUBLIC_VAPID_KEY || process.env.PUBLIC_VAPID_KEY || '';
const privateKey = env.VAPID_PRIVATE_KEY || process.env.VAPID_PRIVATE_KEY || '';
const subject = env.VAPID_SUBJECT || process.env.VAPID_SUBJECT || 'mailto:admin@sauce-et-ail.local';

if (publicKey && privateKey) {
	webpush.setVapidDetails(subject, publicKey, privateKey);
}

export type PushNotificationPayload = {
	title: string;
	body: string;
	icon?: string;
	url?: string;
	tag?: string;
	data?: Record<string, unknown>;
};

/**
 * Envoie une notification Web Push à tous les appareils enregistrés de l'utilisateur.
 * Supprime automatiquement les souscriptions révoquées (410 Gone / 404 Not Found).
 */
export async function sendPushNotification(
	userId: string,
	payload: PushNotificationPayload
): Promise<void> {
	if (!publicKey || !privateKey) {
		console.warn('[WebPush] Clés VAPID non configurées, push ignoré.');
		return;
	}

	try {
		const userSubscriptions = await db
			.select()
			.from(pushSubscriptions)
			.where(eq(pushSubscriptions.userId, userId));

		if (!userSubscriptions || userSubscriptions.length === 0) {
			return;
		}

		const jsonPayload = JSON.stringify({
			title: payload.title,
			body: payload.body,
			icon: payload.icon || '/icon-192.png',
			badge: '/icon-192.png',
			url: payload.url || '/',
			tag: payload.tag,
			data: payload.data
		});

		const sendPromises = userSubscriptions.map(async (sub) => {
			const pushConfig = {
				endpoint: sub.endpoint,
				keys: {
					p256dh: sub.p256dh,
					auth: sub.auth
				}
			};

			try {
				await webpush.sendNotification(pushConfig, jsonPayload);
			} catch (err: unknown) {
				const error = err as { statusCode?: number };
				// 410 (Gone) ou 404 (Not Found) = souscription expirée ou désinstallée
				if (error.statusCode === 410 || error.statusCode === 404) {
					console.log(`[WebPush] Nettoyage souscription expirée: ${sub.id}`);
					await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
				} else {
					console.error(`[WebPush] Erreur d'envoi pour ${sub.id}:`, err);
				}
			}
		});

		await Promise.allSettled(sendPromises);
	} catch (error) {
		console.error("[WebPush] Erreur globale lors de l'envoi push:", error);
	}
}
