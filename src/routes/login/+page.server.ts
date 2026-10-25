import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { user, inviteKeys } from '$lib/server/db/schema';
import { eq, and, isNull, or } from 'drizzle-orm';
import { redirect, fail } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	// L'inscription via clé d'invitation
	registerWithKey: async ({ request }) => {
		const formData = await request.formData();
		const email = (formData.get('email') as string) || '';
		const password = (formData.get('password') as string) || '';
		const username = ((formData.get('username') as string) || '').trim();
		const key = ((formData.get('inviteKey') as string) || '').trim();

		if (!key) {
			return fail(400, { message: "La clé d'invitation est requise." });
		}
		if (!username || username.length < 3) {
			return fail(400, { message: "Le nom d'utilisateur doit contenir au moins 3 caractères." });
		}
		if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
			return fail(400, {
				message:
					"Le nom d'utilisateur ne peut contenir que des lettres, chiffres, points, tirets et underscores."
			});
		}
		if (!email || !email.includes('@') || !email.includes('.')) {
			return fail(400, { message: 'Veuillez saisir une adresse email valide.' });
		}
		if (!password || password.length < 8) {
			return fail(400, { message: 'Le mot de passe doit comporter au moins 8 caractères.' });
		}

		try {
			// 1. Vérification ciblée : est-ce que l'email OU le username existe déjà ?
			const [existingUser] = await db
				.select({ email: user.email, username: user.username })
				.from(user)
				.where(or(eq(user.email, email), eq(user.username, username)));

			if (existingUser) {
				if (existingUser.email === email) {
					return fail(400, { message: 'Cet email est déjà utilisé par un autre compte.' });
				}
				if (existingUser.username === username) {
					return fail(400, { message: "Ce nom d'utilisateur est déjà pris." });
				}
			}

			// 2. On cherche la clé dans la base de données
			const [validKey] = await db
				.select()
				.from(inviteKeys)
				.where(
					and(
						eq(inviteKeys.key, key),
						isNull(inviteKeys.usedBy) // Doit être null (non utilisée)
					)
				);

			if (!validKey) {
				return fail(400, { message: "Clé d'invitation invalide ou déjà utilisée." });
			}

			// 3. On crée l'utilisateur avec Better Auth (Côté serveur !)
			const newUser = await auth.api.signUpEmail({
				body: { email, password, name: username },
				headers: request.headers
			});

			if (!newUser || !newUser.user) {
				return fail(500, { message: 'Erreur lors de la création du compte.' });
			}

			// 4. On met à jour la clé de façon atomique pour empêcher toute réutilisation concurrente
			const updatedKey = await db
				.update(inviteKeys)
				.set({ usedBy: newUser.user.id, usedAt: new Date() })
				.where(and(eq(inviteKeys.id, validKey.id), isNull(inviteKeys.usedBy)))
				.returning({ id: inviteKeys.id });

			if (updatedKey.length === 0) {
				await db.delete(user).where(eq(user.id, newUser.user.id));
				return fail(400, { message: "Clé d'invitation invalide ou déjà utilisée." });
			}

			await db
				.update(user)
				.set({ invitedById: validKey.createdBy, username: username })
				.where(eq(user.id, newUser.user.id));
		} catch (error: unknown) {
			const err = error as { body?: { message?: string } };
			const errorMessage =
				err?.body?.message ||
				(error instanceof Error ? error.message : 'Impossible de créer le compte.');

			if (
				errorMessage.includes('email') ||
				(errorMessage.includes('unique constraint') && errorMessage.includes('email'))
			) {
				return fail(400, { message: 'Cet email est déjà utilisé par un autre compte.' });
			}
			if (errorMessage.includes('username') || errorMessage.includes('unique constraint')) {
				return fail(400, { message: "Ce nom d'utilisateur est déjà pris." });
			}

			return fail(400, { message: errorMessage });
		}

		throw redirect(302, '/setup');
	}
};
