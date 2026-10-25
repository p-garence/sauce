import { requireApiSession } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { messages, chatParticipants } from '$lib/server/db/schema';
import { eq, and, desc, lt, gt } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { MESSAGES_PER_CHAT } from '$lib/constants';

export const GET: RequestHandler = async ({ request, url }) => {
	const session = await requireApiSession(request);

	const chatId = url.searchParams.get('chatId');
	const beforeDate = url.searchParams.get('before');

	if (!chatId || !beforeDate) return json({ error: 'Paramètres manquants' }, { status: 400 });

	const dateLimit = new Date(beforeDate);
	if (Number.isNaN(dateLimit.getTime())) {
		return json({ error: 'Date invalide' }, { status: 400 });
	}

	// On vérifie que l'user participe bien, et on récupère sa date clearedAt
	const participation = await db.query.chatParticipants.findFirst({
		where: and(eq(chatParticipants.chatId, chatId), eq(chatParticipants.userId, session.user.id))
	});

	if (!participation) return json({ error: 'Accès refusé' }, { status: 403 });

	// On récupère les MESSAGES_PER_CHAT précédents, mais seulement ceux APRES le clearedAt
	const history = await db.query.messages.findMany({
		where: and(
			eq(messages.chatId, chatId),
			lt(messages.createdAt, dateLimit),
			gt(messages.createdAt, participation.clearedAt)
		),
		orderBy: [desc(messages.createdAt)],
		limit: MESSAGES_PER_CHAT,
		with: {
			sender: { columns: { name: true, username: true, image: true } }
		}
	});

	history.reverse();
	return json({ messages: history, hasMore: history.length === MESSAGES_PER_CHAT });
};
