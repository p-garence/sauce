import { requireApiSession } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { chatParticipants, messages, notifications } from '$lib/server/db/schema';
import { sql } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request }) => {
	const session = await requireApiSession(request);

	// On cherche les ID des discussions contenant au moins un message non lu par moi
	// RÈGLE SOURDINE : si la conversation est en sourdine (is_muted = true), elle ne compte pas
	// SAUF si l'utilisateur a été mentionné (@) dans cette conversation depuis sa dernière lecture
	const unreadResult = await db.execute(sql`
        SELECT DISTINCT cp.chat_id
        FROM ${chatParticipants} cp
        INNER JOIN ${messages} m ON m.chat_id = cp.chat_id
        WHERE cp.user_id = ${session.user.id}
          AND cp.is_hidden = false
          AND m.sender_id != ${session.user.id}
          AND m.created_at > cp.last_read_at
          AND m.created_at > cp.cleared_at
          AND (
            cp.is_muted = false
            OR EXISTS (
                SELECT 1 FROM ${notifications} n
                WHERE n.recipient_id = ${session.user.id}
                  AND n.type = 'mention'
                  AND n.entity_id = cp.chat_id
                  AND n.created_at > cp.last_read_at
                  AND n.is_read = false
            )
          )
    `);

	// On récupère également tous les chats en sourdine pour le client
	const mutedResult = await db.execute(sql`
        SELECT cp.chat_id
        FROM ${chatParticipants} cp
        WHERE cp.user_id = ${session.user.id}
          AND cp.is_muted = true
    `);

	const unreadIds = unreadResult.map((row) => String(row.chat_id));
	const mutedIds = mutedResult.map((row) => String(row.chat_id));

	return json({ unreadChatIds: unreadIds, mutedChatIds: mutedIds });
};
