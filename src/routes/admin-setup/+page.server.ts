import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// SÉCURITÉ & OPTIMISATION : On cherche juste si 1 id existe (plus rapide que count())
	const existingUsers = await db.select({ id: user.id }).from(user).limit(1);

	if (existingUsers.length > 0) {
		throw redirect(302, '/login');
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request }) => {
		const existingUsers = await db.select({ id: user.id }).from(user).limit(1);
		if (existingUsers.length > 0) {
			return fail(403, { message: 'Un administrateur est déjà configuré.' });
		}

		const formData = await request.formData();
		const email = formData.get('identifier') as string;
		const password = formData.get('secretKey') as string;
		const username = formData.get('username') as string;

		if (!email || !password || !username) {
			return fail(400, { message: 'Tous les champs sont requis.' });
		}

		try {
			// 1. On crée le compte (on passe le username à Better Auth)
			const newUser = await auth.api.signUpEmail({
				body: { email, password, name: username },
				headers: request.headers
			});

			if (newUser && newUser.user) {
				// 2. On met à jour la DB avec le rôle ET le username.
				await db
					.update(user)
					.set({
						role: 'admin',
						username: username
					})
					.where(eq(user.id, newUser.user.id));
			} else {
				return fail(500, { message: 'Erreur interne lors de la création.' });
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Erreur de création.';
			return fail(400, { message: errorMessage });
		}

		// Succès ! On l'envoie sur /setup comme un utilisateur normal
		throw redirect(302, '/setup');
	}
};
