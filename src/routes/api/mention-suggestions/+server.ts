import { json } from '@sveltejs/kit';
import { requireApiSession } from '$lib/server/auth';
import { assertChatParticipant, notBlockedSql } from '$lib/server/permissions';
import { db } from '$lib/server/db';
import { user as userTable, chatParticipants, follows } from '$lib/server/db/schema';
import { eq, and, or, ilike, not, sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, url }) => {
	const session = await requireApiSession(request);
	const currentUserId = session.user.id;
	const q = (url.searchParams.get('q') || '').trim().replace(/^@/, '');
	const chatId = url.searchParams.get('chatId');

	const results: {
		id: string;
		username: string;
		name: string | null;
		image: string | null;
		isChatMember?: boolean;
	}[] = [];
	const seenIds = new Set<string>();

	// Condition : l'utilisateur autorise les mentions (@)
	const allowMentionsCondition = sql`(${userTable.profileVisibility}->>'allowMentions' IS NULL OR ${userTable.profileVisibility}->>'allowMentions' != 'false')`;
	const notBlocked = notBlockedSql(currentUserId, userTable.id);

	// 1. Si on est dans un chat, vérifier que l'utilisateur y participe et proposer en priorité les membres du chat
	if (chatId) {
		await assertChatParticipant(currentUserId, chatId, { allowPendingOrRefusedRead: true });

		const members = await db
			.select({
				id: userTable.id,
				username: userTable.username,
				name: userTable.name,
				image: userTable.image
			})
			.from(chatParticipants)
			.innerJoin(userTable, eq(chatParticipants.userId, userTable.id))
			.where(
				and(
					eq(chatParticipants.chatId, chatId),
					not(eq(chatParticipants.userId, currentUserId)),
					allowMentionsCondition,
					notBlocked,
					q ? or(ilike(userTable.username, `${q}%`), ilike(userTable.name, `%${q}%`)) : undefined
				)
			)
			.limit(6);

		for (const m of members) {
			if (m.username && !seenIds.has(m.id)) {
				seenIds.add(m.id);
				results.push({ ...m, username: m.username, isChatMember: true });
			}
		}
	}

	// 2. Proposer les personnes suivies (following)
	if (results.length < 8) {
		const followed = await db
			.select({
				id: userTable.id,
				username: userTable.username,
				name: userTable.name,
				image: userTable.image
			})
			.from(follows)
			.innerJoin(userTable, eq(follows.followingId, userTable.id))
			.where(
				and(
					eq(follows.followerId, currentUserId),
					eq(follows.status, 'accepted'),
					allowMentionsCondition,
					notBlocked,
					q ? or(ilike(userTable.username, `${q}%`), ilike(userTable.name, `%${q}%`)) : undefined
				)
			)
			.limit(8 - results.length);

		for (const u of followed) {
			if (u.username && !seenIds.has(u.id)) {
				seenIds.add(u.id);
				results.push({ ...u, username: u.username });
			}
		}
	}

	// 3. Compléter avec une recherche globale si nécessaire
	if (results.length < 8 && q.length > 0) {
		const others = await db
			.select({
				id: userTable.id,
				username: userTable.username,
				name: userTable.name,
				image: userTable.image
			})
			.from(userTable)
			.where(
				and(
					not(eq(userTable.id, currentUserId)),
					allowMentionsCondition,
					notBlocked,
					or(ilike(userTable.username, `${q}%`), ilike(userTable.name, `%${q}%`))
				)
			)
			.limit(8 - results.length);

		for (const u of others) {
			if (u.username && !seenIds.has(u.id)) {
				seenIds.add(u.id);
				results.push({ ...u, username: u.username });
			}
		}
	}

	return json({ users: results });
};
