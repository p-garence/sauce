import { requireApiSession } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { chatParticipants } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const session = await requireApiSession(request);

	const body = await request.json().catch(() => ({}));
	const chatId = body.chatId;

	if (!chatId) return new Response('Bad request', { status: 400 });

	// On actualise simplement le lastReadAt à NOW()
	await db
		.update(chatParticipants)
		.set({ lastReadAt: new Date() })
		.where(and(eq(chatParticipants.userId, session.user.id), eq(chatParticipants.chatId, chatId)));

	// Le badge frontend s'est déjà mis à jour, pas besoin de compter précisément ici.
	return new Response(JSON.stringify({ success: true }), {
		headers: { 'Content-Type': 'application/json' }
	});
};
