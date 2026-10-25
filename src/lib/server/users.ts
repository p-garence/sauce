import { db } from '$lib/server/db';
import { user as userTable, follows } from '$lib/server/db/schema';
import { and, or, ilike, ne, notInArray, sql, type SQL } from 'drizzle-orm';
import type { UserSearchResult } from '$lib/types';
import type { CursorData } from './cursor';
import { USERS_PER_PAGE } from '$lib/constants';
import { notBlockedSql } from '$lib/server/permissions';

export async function searchOrGetNetworkUsers(
	currentUserId: string,
	query: string,
	limitCount = USERS_PER_PAGE,
	cursor?: CursorData | null,
	excludeIds: string[] = []
): Promise<{ users: UserSearchResult[]; nextCursor: CursorData | null }> {
	// Définitions SQL strictes pour savoir qui est qui
	const isFollowingSql = sql`EXISTS(SELECT 1 FROM ${follows} f WHERE f.follower_id = ${currentUserId} AND f.following_id = ${userTable.id} AND f.status = 'accepted')`;
	const isFollowerSql = sql`EXISTS(SELECT 1 FROM ${follows} f WHERE f.follower_id = ${userTable.id} AND f.following_id = ${currentUserId} AND f.status = 'accepted')`;

	// Utilisé pour trier : 2 = Je le suis, 1 = Il me suit (mais je ne le suis pas), 0 = Autres
	const networkScore = sql<number>`
        CASE 
            WHEN ${isFollowingSql} THEN 2 
            WHEN ${isFollowerSql} THEN 1 
            ELSE 0 
        END
    `;

	const baseQuery = db
		.select({
			id: userTable.id,
			username: userTable.username,
			name: userTable.name,
			image: userTable.image,
			is_following: isFollowingSql.as('is_following'),
			is_follower: isFollowerSql.as('is_follower')
		})
		.from(userTable);

	// On exclut toujours soi-même et les utilisateurs bloqués (bidirectionnel)
	const conditions: SQL[] = [
		ne(userTable.id, currentUserId),
		notBlockedSql(currentUserId, userTable.id)
	];

	const validExcludeIds = excludeIds.filter((id) => Boolean(id && id.trim()));
	if (validExcludeIds.length > 0) {
		conditions.push(notInArray(userTable.id, validExcludeIds));
	}

	if (query.trim() !== '') {
		const searchPattern = `%${query.trim()}%`;
		conditions.push(
			or(ilike(userTable.username, searchPattern), ilike(userTable.name, searchPattern)) as SQL // Rassurer TypeScript
		);
	}

	// GESTION DU CURSEUR COMPLEXE (Réseau + Ordre Alphabétique)
	if (cursor && cursor.lastValue) {
		const parts = String(cursor.lastValue).split(':');
		const lastScore = parseInt(parts[0], 10);
		const lastUsername = parts.slice(1).join(':');

		if (!Number.isNaN(lastScore)) {
			conditions.push(
				or(
					sql`${networkScore} < ${lastScore}`,
					and(sql`${networkScore} = ${lastScore}`, sql`${userTable.username} > ${lastUsername}`)
				) as SQL // Rassurer TypeScript
			);
		}
	}

	// 👇 Plus de 'let', on initialise la constante directement avec le résultat
	const fetchedUsers = await baseQuery
		.where(and(...conditions))
		.orderBy(sql`${networkScore} DESC`, userTable.username)
		.limit(limitCount);

	// GÉNÉRATION DU NOUVEAU CURSEUR
	let nextCursor: CursorData | null = null;
	if (fetchedUsers.length === limitCount) {
		const lastUser = fetchedUsers[fetchedUsers.length - 1];

		let score = 0;
		if (lastUser.is_following) score = 2;
		else if (lastUser.is_follower) score = 1;

		const safeUsername = lastUser.username || lastUser.id;

		nextCursor = {
			type: 'network_alpha',
			lastValue: `${score}:${safeUsername}`, // ex: "2:marcel"
			lastId: lastUser.id
		};
	}

	// MAPPING FRONTEND
	const formattedUsers: UserSearchResult[] = fetchedUsers.map((u) => ({
		id: u.id,
		username: u.username || '',
		name: u.name || null,
		image: u.image || null,
		is_following: Boolean(u.is_following),
		is_follower: Boolean(u.is_follower)
	}));

	return { users: formattedUsers, nextCursor };
}
