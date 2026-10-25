import { redirect, fail } from '@sveltejs/kit';
import { requireSession, generateInviteCode } from '$lib/server/auth';
import { getBlockedUsersList, unblockUserGlobal } from '$lib/server/permissions';
import { db } from '$lib/server/db';
import { inviteKeys, user } from '$lib/server/db/schema';
import { eq, count } from 'drizzle-orm';
import { getUserFeeds, createUserFeed, updateUserFeed, deleteUserFeed, parseFeedFormData } from '$lib/server/flux';
import { createUserGroup, updateUserGroup, deleteUserGroup } from '$lib/server/groups';
import { bulkUpdateVisibility, makePostsConnections, makePostsPrivate } from '$lib/server/posts';
import { getUserMediaUsage } from '$lib/server/media';
import { getTrendingTags } from '$lib/server/tags';
import { DEFAULT_MAX_INVITES } from '$lib/constants';
import type { PostVisibility } from '$lib/types';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { sessionUser, userGroups } = await parent();
	if (!sessionUser) throw redirect(302, '/login');

	const myKeys = await db.query.inviteKeys.findMany({
		where: eq(inviteKeys.createdBy, sessionUser.id),
		orderBy: (keys, { desc }) => [desc(keys.createdAt)]
	});

	const { feeds: myFeeds } = await getUserFeeds(
		sessionUser.id,
		sessionUser.activeFeedId as string | null
	);

	const mediaUsage = await getUserMediaUsage(sessionUser.id);
	const trendingTags = await getTrendingTags(10, 7, sessionUser.id);
	const blockedUsers = await getBlockedUsersList(sessionUser.id);

	return {
		user: sessionUser,
		keys: myKeys,
		feeds: myFeeds,
		userGroups,
		mediaUsage,
		trendingTags,
		blockedUsers
	};
};

export const actions: Actions = {
	generateKey: async ({ request }) => {
		const session = await requireSession(request);

		const [result] = await db
			.select({ value: count() })
			.from(inviteKeys)
			.where(eq(inviteKeys.createdBy, session.user.id));

		const [currentUser] = await db
			.select({ maxInvites: user.maxInvites })
			.from(user)
			.where(eq(user.id, session.user.id));

		const limit = currentUser?.maxInvites ?? DEFAULT_MAX_INVITES;

		if (result.value >= limit) {
			return fail(400, { message: `Vous avez atteint votre limite de ${limit} clés.` });
		}

		const newKey = generateInviteCode('INV');

		await db.insert(inviteKeys).values({
			key: newKey,
			createdBy: session.user.id
		});

		return { success: true };
	},

	unblockUser: async ({ request }) => {
		const session = await requireSession(request);
		const data = await request.formData();
		const targetUserId = data.get('targetUserId')?.toString();

		if (!targetUserId) {
			return fail(400, { success: false, message: 'Utilisateur invalide.' });
		}

		try {
			await unblockUserGlobal(session.user.id, targetUserId);
			return { success: true, message: 'Utilisateur débloqué avec succès.' };
		} catch (e) {
			console.error('Erreur unblockUser:', e);
			return fail(500, { success: false, message: 'Impossible de débloquer cet utilisateur.' });
		}
	},

	createFeed: async ({ request }) => {
		const session = await requireSession(request);
		const data = await request.formData();
		const feedInput = parseFeedFormData(data);

		try {
			await createUserFeed(session.user.id, feedInput);
			return { success: true };
		} catch (err) {
			return fail(400, { message: (err as Error).message });
		}
	},

	updateFeed: async ({ request }) => {
		const session = await requireSession(request);
		const data = await request.formData();
		const feedId = data.get('feedId') as string;
		const feedInput = parseFeedFormData(data);

		try {
			await updateUserFeed(session.user.id, feedId, feedInput);
			return { success: true };
		} catch (err) {
			return fail(400, { message: (err as Error).message });
		}
	},

	deleteFeed: async ({ request }) => {
		const session = await requireSession(request);
		const data = await request.formData();
		const feedId = data.get('feedId') as string;

		try {
			await deleteUserFeed(session.user.id, feedId);
			return { success: true };
		} catch (err) {
			return fail(400, { message: (err as Error).message });
		}
	},

	updateBehaviorToggles: async ({ request }) => {
		const session = await requireSession(request);
		const data = await request.formData();

		const [currentUser] = await db
			.select({ doubleTap: user.doubleTap })
			.from(user)
			.where(eq(user.id, session.user.id));

		if (!currentUser) return fail(404, { message: 'Utilisateur introuvable.' });

		await db
			.update(user)
			.set({ doubleTap: data.get('doubleTap') === 'true' })
			.where(eq(user.id, session.user.id));

		return { success: true };
	},

	updatePrivacyToggles: async ({ request }) => {
		const session = await requireSession(request);
		const data = await request.formData();

		const [currentUser] = await db
			.select({ profileVisibility: user.profileVisibility })
			.from(user)
			.where(eq(user.id, session.user.id));

		if (!currentUser) return fail(404, { message: 'Utilisateur introuvable.' });

		const currentVisibility = currentUser.profileVisibility || {};
		const newVisibility = {
			...currentVisibility,
			requireFollowRequest: data.get('requireFollowRequest') === 'true',
			requireMessageApproval: data.get('requireMessageApproval') === 'true',
			showFollowers: data.get('showFollowers') === 'true',
			showFollowing: data.get('showFollowing') === 'true',
			allowMentions: data.get('allowMentions') === 'true'
		};

		await db
			.update(user)
			.set({ profileVisibility: newVisibility })
			.where(eq(user.id, session.user.id));

		return { success: true };
	},

	bulkUpdateVisibility: async ({ request }) => {
		const session = await requireSession(request);
		const data = await request.formData();

		const rawVisibility = data.get('visibility') as string;
		let visibility: PostVisibility;
		let groupId: string | null = null;

		if (rawVisibility?.startsWith('group:')) {
			visibility = 'group';
			groupId = rawVisibility.split(':')[1] || null;
		} else if (['public', 'network', 'followers', 'private'].includes(rawVisibility)) {
			visibility = rawVisibility as PostVisibility;
		} else {
			return fail(400, { success: false, message: 'Option de visibilité invalide.' });
		}

		const updatePosts = data.get('updatePosts') !== 'false';
		const updateStories = data.get('updateStories') !== 'false';

		try {
			await bulkUpdateVisibility(session.user.id, {
				visibility,
				groupId,
				updatePosts,
				updateStories
			});

			return {
				success: true,
				message:
					'La visibilité de vos anciennes publications et stories a été mise à jour avec succès.'
			};
		} catch (error) {
			console.error('Erreur bulkUpdateVisibility:', error);
			return fail(400, {
				success: false,
				message: (error as Error).message || 'Impossible de modifier la visibilité de vos contenus.'
			});
		}
	},

	makePostsConnections: async ({ request }) => {
		const session = await requireSession(request);

		try {
			await makePostsConnections(session.user.id);
			return {
				success: true,
				message: 'Vos publications publiques sont désormais réservées à vos connexions.'
			};
		} catch (error) {
			console.error('Erreur makePostsConnections:', error);
			return fail(500, {
				success: false,
				message: 'Impossible de modifier la visibilité de vos posts.'
			});
		}
	},

	makePostsPrivate: async ({ request }) => {
		const session = await requireSession(request);

		try {
			await makePostsPrivate(session.user.id);
			return { success: true, message: 'Toutes vos publications sont désormais privées.' };
		} catch (error) {
			console.error('Erreur makePostsPrivate:', error);
			return fail(500, {
				success: false,
				message: 'Impossible de modifier la visibilité de vos posts.'
			});
		}
	},

	updateNotificationToggles: async ({ request }) => {
		const session = await requireSession(request);
		const data = await request.formData();

		const [currentUser] = await db
			.select({ notificationSettings: user.notificationSettings })
			.from(user)
			.where(eq(user.id, session.user.id));

		if (!currentUser) return fail(404, { message: 'Utilisateur introuvable.' });

		const currentSettings = currentUser.notificationSettings || {};
		const newSettings = {
			...currentSettings,
			all: data.get('all') === 'true',
			follow: data.get('follow') === 'true',
			message: data.get('message') === 'true',
			like: data.get('like') === 'true',
			comment: data.get('comment') === 'true'
		};

		await db
			.update(user)
			.set({ notificationSettings: newSettings })
			.where(eq(user.id, session.user.id));

		return { success: true };
	},

	createGroup: async ({ request }) => {
		const session = await requireSession(request);
		const data = await request.formData();
		const name = data.get('name')?.toString() || '';
		const color = data.get('color')?.toString() || '#10b981';
		const icon = data.get('icon')?.toString() || null;

		try {
			await createUserGroup({ ownerId: session.user.id, name, color, icon });
			return { success: true };
		} catch (e) {
			return fail(400, { error: (e as Error).message });
		}
	},

	updateGroup: async ({ request }) => {
		const session = await requireSession(request);
		const data = await request.formData();
		const groupId = data.get('groupId')?.toString() || '';
		const name = data.get('name')?.toString() || '';
		const color = data.get('color')?.toString() || '#10b981';
		const icon = data.get('icon')?.toString() || null;

		try {
			await updateUserGroup({ groupId, ownerId: session.user.id, name, color, icon });
			return { success: true };
		} catch (e) {
			return fail(400, { error: (e as Error).message });
		}
	},

	deleteGroup: async ({ request }) => {
		const session = await requireSession(request);
		const data = await request.formData();
		const groupId = data.get('groupId')?.toString() || '';

		try {
			await deleteUserGroup(groupId, session.user.id);
			return { success: true };
		} catch (e) {
			return fail(400, { error: (e as Error).message });
		}
	}
};
