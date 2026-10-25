import { json, error } from '@sveltejs/kit';
import { requireApiSession } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { pushSubscriptions } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const session = await requireApiSession(request);

	const body = await request.json().catch(() => null);
	if (!body || !body.endpoint) {
		throw error(400, 'Endpoint manquant');
	}

	try {
		await db
			.delete(pushSubscriptions)
			.where(
				and(
					eq(pushSubscriptions.endpoint, body.endpoint),
					eq(pushSubscriptions.userId, session.user.id)
				)
			);

		return json({ success: true, message: 'Appareil désabonné des notifications' });
	} catch (err) {
		console.error('[WebPush] Erreur désabonnement:', err);
		throw error(500, 'Impossible de désabonner cet appareil');
	}
};
