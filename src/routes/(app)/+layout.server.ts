import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import {
	userGroups,
	user as userTable,
	userGroupMembers,
	iconSets
} from '$lib/server/db/schema';
import { getUserActiveEmojiData } from '$lib/server/emojis';
import { getInstanceSettings } from '$lib/server/instanceSettings';
import type { LayoutServerLoad } from './$types';
import type { User, UserGroup } from '$lib/types';
import { eq, sql } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ parent, url }) => {
	// 1. On récupère la session de base fournie par le layout racine
	const { session } = await parent();

	if (!session) {
		if (url.pathname.startsWith('/post/')) {
			return {
				sessionUser: null as unknown as User,
				userGroups: [] as UserGroup[]
			};
		}
		throw redirect(302, '/login');
	}

	// 2. On récupère notre utilisateur complet depuis notre table
	const [dbUser] = await db
		.select()
		.from(userTable)
		.where(eq(userTable.id, session.user.id))
		.limit(1);

	if (!dbUser || dbUser.isBanned) {
		throw redirect(302, '/login');
	}

	const myGroups: UserGroup[] = await db
		.select({
			id: userGroups.id,
			name: userGroups.name,
			icon: userGroups.icon,
			color: userGroups.color,
			membersCount: sql<number>`count(${userGroupMembers.userId})::int`
		})
		.from(userGroups)
		.leftJoin(userGroupMembers, eq(userGroups.id, userGroupMembers.groupId))
		.where(eq(userGroups.ownerId, session.user.id))
		.groupBy(userGroups.id)
		.orderBy(userGroups.createdAt);

	const instanceSettingsData = await getInstanceSettings();

	let activeIconSet = null;
	if (dbUser.activeIconSetId) {
		activeIconSet = await db.query.iconSets.findFirst({
			where: eq(iconSets.id, dbUser.activeIconSetId)
		});
	} else if (
		instanceSettingsData.defaultIconPack === 'custom' &&
		instanceSettingsData.defaultIconSetId
	) {
		activeIconSet = await db.query.iconSets.findFirst({
			where: eq(iconSets.id, instanceSettingsData.defaultIconSetId)
		});
	}

	const activeEmojiData = await getUserActiveEmojiData(dbUser.id);

	// 4. On le renvoie proprement typé.
	return {
		sessionUser: dbUser as User,
		userGroups: myGroups,
		instanceSettings: instanceSettingsData,
		activeIconSet,
		activeEmojiSet: activeEmojiData.activeSets[0] || null,
		activeEmojiSets: activeEmojiData.activeSets,
		activeEmojis: activeEmojiData.emojis,
		userFavoriteEmojis: activeEmojiData.favoriteEmojis
	};
};
