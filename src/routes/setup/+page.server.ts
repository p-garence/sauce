import { requireSession } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { user, userGroups, userFeeds } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import { DEFAULT_FEED_CONFIG } from '$lib/constants';
import type { Actions, PageServerLoad } from './$types';
import type { User } from '$lib/types';

export const load: PageServerLoad = async ({ request }) => {
	const session = await requireSession(request);

	// 👇 1. On récupère l'utilisateur COMPLET depuis notre base de données
	const [dbUser] = await db.select().from(user).where(eq(user.id, session.user.id)).limit(1);

	if (!dbUser) {
		throw redirect(302, '/login');
	}

	// 👇 2. On utilise l'utilisateur de la DB pour vérifier le flag
	if (dbUser.hasCompletedSetup) {
		throw redirect(302, '/flux');
	}

	// 👇 3. On renvoie l'utilisateur typé complet (avec bio, profileVisibility, etc.)
	return { sessionUser: dbUser as User };
};

export const actions: Actions = {
	completeSetup: async ({ request }) => {
		const session = await requireSession(request);
		const data = await request.formData();

		const name = data.get('name')?.toString().trim() || session.user.name;

		if (name.length < 3) {
			return fail(400, { error: 'Le nom affiché doit contenir au moins 3 caractères.' });
		}

		const bio = data.get('bio')?.toString().trim() || null;

		// On récupère directement l'URL générée par le recadrage (ou l'ancienne)
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
		const requireMessageApproval = data.get('requireMessageApproval') === 'true'; // 👈 Ajout
		const showFollowers = data.get('showFollowers') === 'true';
		const showFollowing = data.get('showFollowing') === 'true';

		try {
			const [currentUser] = await db
				.select({
					profileVisibility: user.profileVisibility,
					hasCompletedSetup: user.hasCompletedSetup
				})
				.from(user)
				.where(eq(user.id, session.user.id));

			if (currentUser?.hasCompletedSetup) {
				return fail(400, { error: 'La configuration initiale a déjà été effectuée.' });
			}

			const newVisibility = {
				...(currentUser?.profileVisibility || {}),
				requireFollowRequest,
				requireMessageApproval, // 👈 Ajout
				showFollowers,
				showFollowing,
				allowMentions: currentUser?.profileVisibility?.allowMentions ?? true
			};

			// TRANSACTION GLOBALE
			await db.transaction(async (tx) => {
				// A. On crée le groupe par défaut
				await tx.insert(userGroups).values({
					ownerId: session.user.id,
					name: 'Amis proches',
					color: '#10b981'
				});

				// B. On crée le flux par défaut
				const [defaultFeed] = await tx
					.insert(userFeeds)
					.values({
						userId: session.user.id,
						...DEFAULT_FEED_CONFIG
					})
					.returning();

				// C. On met à jour l'utilisateur
				await tx
					.update(user)
					.set({
						name, // 👈 Ajout du nom
						bio,
						image: avatarUrl ? avatarUrl : null, // 👈 Sauvegarde propre
						profileVisibility: newVisibility,
						activeFeedId: defaultFeed.id,
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
