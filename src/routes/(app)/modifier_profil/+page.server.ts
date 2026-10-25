import { fail } from '@sveltejs/kit';
import { requireSession } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { user as userTable } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { deleteMediaFiles } from '$lib/server/media';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { sessionUser } = await parent();

	return {
		profile: {
			username: sessionUser.username || '',
			createdAt: sessionUser.createdAt,
			image: sessionUser.image || '',
			name: sessionUser.name || '',
			email: sessionUser.email || '',
			bio: sessionUser.bio || '',
			site: sessionUser.site || '',
			genre: sessionUser.genre || '',
			age: sessionUser.age || '',
			contactEmail: sessionUser.contactEmail || '',
			visibility: sessionUser.profileVisibility || {
				bio: true,
				site: false,
				age: false,
				genre: false,
				contactEmail: false,
				requireFollowRequest: false,
				requireMessageApproval: false,
				showFollowers: true,
				showFollowing: true,
				allowMentions: true
			}
		}
	};
};

export const actions: Actions = {
	default: async ({ request }) => {
		const session = await requireSession(request);
		const formData = await request.formData();

		const name = String(formData.get('name') || '');
		const email = String(formData.get('email') || '');
		const bio = String(formData.get('bio') || '');
		const rawSite = String(formData.get('site') || '').trim();
		const genre = String(formData.get('genre') || '');
		const age = String(formData.get('age') || '').trim();
		const contactEmail = String(formData.get('contactEmail') || '');

		const avatarUrl = String(formData.get('avatarUrl') || '').trim();

		let safeSite: string | null = null;
		if (rawSite) {
			const candidate = /^https?:\/\//i.test(rawSite) ? rawSite : `https://${rawSite}`;
			try {
				const parsedUrl = new URL(candidate);
				if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
					return fail(400, { message: 'URL du site invalide.' });
				}
				safeSite = parsedUrl.toString();
			} catch {
				return fail(400, { message: 'URL du site invalide.' });
			}
		}

		try {
			// 1. Fetch current user data to keep existing privacy settings intact
			const [currentUser] = await db
				.select({
					profileVisibility: userTable.profileVisibility,
					image: userTable.image
				})
				.from(userTable)
				.where(eq(userTable.id, session.user.id));

			if (avatarUrl && !avatarUrl.startsWith('/media/') && avatarUrl !== currentUser?.image) {
				return fail(400, { message: "URL d'avatar invalide." });
			}

			const currentVisibility = currentUser?.profileVisibility || {
				bio: true,
				site: false,
				age: false,
				genre: false,
				contactEmail: false,
				requireFollowRequest: false,
				requireMessageApproval: false,
				showFollowers: true,
				showFollowing: true
			};

			// 2. Merge existing privacy settings with the newly updated display settings
			const updatedProfileVisibility = {
				...currentVisibility, // Keep requireFollowRequest, etc.
				bio: formData.has('show_bio'),
				site: formData.has('show_site'),
				age: formData.has('show_age'),
				genre: formData.has('show_genre'),
				contactEmail: formData.has('show_contactEmail')
			};

			const newImage = avatarUrl ? avatarUrl : null;

			// Nettoyage de l'ancien avatar s'il a changé et était stocké localement
			if (
				currentUser?.image &&
				currentUser.image.startsWith('/media/') &&
				currentUser.image !== newImage
			) {
				await deleteMediaFiles([{ type: 'image', content: currentUser.image }]);
			}

			const updateData = {
				name: name,
				email: email || session.user.email,
				bio: bio || null,
				site: safeSite,
				genre: genre || null,
				contactEmail: contactEmail || null,
				age: age || null,
				profileVisibility: updatedProfileVisibility, // Pass the fully merged object
				image: newImage
			};

			await db.update(userTable).set(updateData).where(eq(userTable.id, session.user.id));

			return { success: true };
		} catch (error) {
			console.error('Erreur lors de la modification:', error);
			return fail(500, { message: 'Erreur lors de la sauvegarde.' });
		}
	}
};
