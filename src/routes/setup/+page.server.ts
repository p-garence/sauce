import { requireSession } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { user, userGroups, userGroupMembers, userFeeds } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import { DEFAULT_FEED_CONFIG } from '$lib/constants';
import type { Actions, PageServerLoad } from './$types';
import type { User, UserGroup } from '$lib/types';
import {
	getUserFeeds,
	createUserFeed,
	updateUserFeed,
	deleteUserFeed,
	parseFeedFormData
} from '$lib/server/flux';
import { getTrendingTags } from '$lib/server/tags';

export const load: PageServerLoad = async ({ request }) => {
	const session = await requireSession(request);

	// 1. Récupération de l'utilisateur complet depuis la base de données
	const [dbUser] = await db.select().from(user).where(eq(user.id, session.user.id)).limit(1);

	if (!dbUser) {
		throw redirect(302, '/login');
	}

	// 2. Si la configuration est déjà terminée, redirection vers le flux principal
	if (dbUser.hasCompletedSetup) {
		throw redirect(302, '/flux');
	}

	// 3. S'assurer que le groupe par défaut "Amis proches" existe
	const existingGroups = await db
		.select({ id: userGroups.id })
		.from(userGroups)
		.where(eq(userGroups.ownerId, session.user.id))
		.limit(1);

	if (existingGroups.length === 0) {
		await db.insert(userGroups).values({
			ownerId: session.user.id,
			name: 'Amis proches',
			color: '#10b981'
		});
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

	// 4. Récupérer les flux (initialise automatiquement le flux par défaut si inexistant)
	const { feeds: myFeeds, activeFeedId } = await getUserFeeds(
		session.user.id,
		dbUser.activeFeedId as string | null
	);

	// 5. Récupérer les hashtags populaires pour les suggestions
	const trendingTags = await getTrendingTags(10, 7, session.user.id);

	return {
		sessionUser: dbUser as User,
		feeds: myFeeds,
		groups: myGroups,
		trendingTags,
		activeFeedId
	};
};

export const actions: Actions = {
	createFeed: async ({ request }) => {
		const session = await requireSession(request);
		const data = await request.formData();
		const feedInput = parseFeedFormData(data);

		try {
			await createUserFeed(session.user.id, feedInput);
			return { success: true };
		} catch (err) {
			return fail(400, { feedError: (err as Error).message });
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
			return fail(400, { feedError: (err as Error).message });
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
			return fail(400, { feedError: (err as Error).message });
		}
	},

	completeSetup: async ({ request }) => {
		const session = await requireSession(request);
		const data = await request.formData();

		const name = data.get('name')?.toString().trim() || session.user.name;

		if (name.length < 3) {
			return fail(400, { error: 'Le nom affiché doit contenir au moins 3 caractères.' });
		}

		const bio = data.get('bio')?.toString().trim() || null;

		const rawAvatarUrl = data.get('avatarUrl')?.toString().trim();
		if (
			rawAvatarUrl &&
			!rawAvatarUrl.startsWith('/media/') &&
			rawAvatarUrl !== session.user.image
		) {
			return fail(400, { error: "URL d'avatar invalide." });
		}
		const avatarUrl = rawAvatarUrl || session.user.image;

		const requireFollowRequest = data.get('requireFollowRequest') === 'true';
		const requireMessageApproval = data.get('requireMessageApproval') === 'true';
		const showFollowers = data.get('showFollowers') === 'true';
		const showFollowing = data.get('showFollowing') === 'true';

		try {
			const [currentUser] = await db
				.select({
					profileVisibility: user.profileVisibility,
					hasCompletedSetup: user.hasCompletedSetup,
					activeFeedId: user.activeFeedId
				})
				.from(user)
				.where(eq(user.id, session.user.id));

			if (currentUser?.hasCompletedSetup) {
				return fail(400, { error: 'La configuration initiale a déjà été effectuée.' });
			}

			const newVisibility = {
				...(currentUser?.profileVisibility || {}),
				requireFollowRequest,
				requireMessageApproval,
				showFollowers,
				showFollowing,
				allowMentions: currentUser?.profileVisibility?.allowMentions ?? true
			};

			// TRANSACTION GLOBALE
			await db.transaction(async (tx) => {
				// A. S'assurer que le groupe par défaut existe
				const [existingGroup] = await tx
					.select({ id: userGroups.id })
					.from(userGroups)
					.where(eq(userGroups.ownerId, session.user.id))
					.limit(1);

				if (!existingGroup) {
					await tx.insert(userGroups).values({
						ownerId: session.user.id,
						name: 'Amis proches',
						color: '#10b981'
					});
				}

				// B. S'assurer qu'un flux existe et récupérer le flux actif
				let activeFeedId = currentUser?.activeFeedId;
				const existingFeeds = await tx
					.select({ id: userFeeds.id })
					.from(userFeeds)
					.where(eq(userFeeds.userId, session.user.id));

				if (existingFeeds.length === 0) {
					const [defaultFeed] = await tx
						.insert(userFeeds)
						.values({
							userId: session.user.id,
							...DEFAULT_FEED_CONFIG
						})
						.returning();
					activeFeedId = defaultFeed.id;
				} else if (!activeFeedId || !existingFeeds.some((f) => f.id === activeFeedId)) {
					activeFeedId = existingFeeds[0].id;
				}

				// C. On met à jour l'utilisateur
				await tx
					.update(user)
					.set({
						name,
						bio,
						image: avatarUrl ? avatarUrl : null,
						profileVisibility: newVisibility,
						activeFeedId,
						hasCompletedSetup: true
					})
					.where(eq(user.id, session.user.id));
			});
		} catch (error) {
			console.error('Erreur completeSetup:', error);
			return fail(500, { error: "Une erreur est survenue lors de l'enregistrement." });
		}

		return { success: true };
	}
};
