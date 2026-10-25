import { json } from '@sveltejs/kit';
import { requireApiSession } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { notifications } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const session = await requireApiSession(request);

	try {
		// Supprime physiquement toutes les notifications de cet utilisateur
		await db.delete(notifications).where(eq(notifications.recipientId, session.user.id));

		return json({ success: true });
	} catch (error) {
		console.error('Erreur nettoyage:', error);
		return json({ error: 'Erreur interne' }, { status: 500 });
	}
};
