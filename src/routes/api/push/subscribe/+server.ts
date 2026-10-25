import { json, error } from '@sveltejs/kit';
import { requireApiSession } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { pushSubscriptions } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const session = await requireApiSession(request);

	const body = await request.json().catch(() => null);
	if (!body || !body.subscription || !body.subscription.endpoint) {
		throw error(400, 'Souscription Push invalide');
	}

	const { endpoint, keys } = body.subscription;
	const p256dh = keys?.p256dh;
	const auth = keys?.auth;
	const userAgent = body.userAgent || request.headers.get('user-agent') || null;

	if (!endpoint || !p256dh || !auth) {
		throw error(400, 'Clés de souscription manquantes');
	}

	try {
		await db
			.insert(pushSubscriptions)
			.values({
				userId: session.user.id,
				endpoint,
				p256dh,
				auth,
				userAgent
			})
			.onConflictDoUpdate({
				target: pushSubscriptions.endpoint,
				set: {
					userId: session.user.id,
					p256dh,
					auth,
					userAgent
				}
			});

		return json({ success: true, message: 'Appareil enregistré pour les notifications Push' });
	} catch (err) {
		console.error('[WebPush] Erreur enregistrement souscription:', err);
		throw error(500, 'Impossible d’enregistrer cet appareil');
	}
};
