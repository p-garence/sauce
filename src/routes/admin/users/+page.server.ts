/**
 * @module routes/admin/users/+page.server
 * @description Contrôleur serveur de gestion des utilisateurs de l'instance.
 */

import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import {
	assertAdmin,
	getAdminUsers,
	toggleUserBan,
	updateUserRole,
	deleteUserByAdmin,
	updateUserNameByAdmin,
	addInvitesToUser,
	updateUserQuota
} from '$lib/server/admin';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

function getErrorMessage(err: unknown): string {
	return err instanceof Error ? err.message : 'Une erreur est survenue';
}

export const load: PageServerLoad = async ({ locals }) => {
	assertAdmin(locals.user);
	const allUsers = await getAdminUsers();
	return {
		users: allUsers,
		currentUserId: locals.user?.id
	};
};

export const actions: Actions = {
	sendResetPassword: async ({ request, locals }) => {
		assertAdmin(locals.user);
		const form = await request.formData();
		const userId = form.get('userId') as string;
		if (!userId) {
			return fail(400, { message: 'Identifiant utilisateur manquant.' });
		}

		const targetUser = await db.query.user.findFirst({
			where: eq(user.id, userId)
		});

		if (!targetUser || !targetUser.email) {
			return fail(404, { message: 'Utilisateur ou adresse email introuvable.' });
		}

		try {
			await auth.api.requestPasswordReset({
				body: {
					email: targetUser.email
				},
				headers: request.headers
			});

			return {
				success: true,
				message: `Email de réinitialisation envoyé avec succès à ${targetUser.email}.`
			};
		} catch (err) {
			console.error('Erreur sendResetPassword:', err);
			return fail(500, { message: getErrorMessage(err) });
		}
	},

	toggleBan: async ({ request, locals }) => {
		assertAdmin(locals.user);
		const form = await request.formData();
		const userId = form.get('userId') as string;
		try {
			const res = await toggleUserBan(locals.user!.id, userId);
			return {
				success: true,
				message: res.isBanned
					? 'Compte utilisateur banni avec succès.'
					: 'Compte utilisateur débanni avec succès.'
			};
		} catch (err) {
			return fail(400, { message: getErrorMessage(err) });
		}
	},

	makeAdmin: async ({ request, locals }) => {
		assertAdmin(locals.user);
		const form = await request.formData();
		const userId = form.get('userId') as string;
		try {
			await updateUserRole(locals.user!.id, userId, 'admin');
			return { success: true, message: 'Utilisateur promu administrateur avec succès.' };
		} catch (err) {
			return fail(400, { message: getErrorMessage(err) });
		}
	},

	updateRole: async ({ request, locals }) => {
		assertAdmin(locals.user);
		const form = await request.formData();
		const userId = form.get('userId') as string;
		const role = (form.get('role') as string) || 'admin';
		try {
			await updateUserRole(locals.user!.id, userId, role);
			return { success: true, message: `Rôle mis à jour vers "${role}".` };
		} catch (err) {
			return fail(400, { message: getErrorMessage(err) });
		}
	},

	deleteUser: async ({ request, locals }) => {
		assertAdmin(locals.user);
		const form = await request.formData();
		const userId = form.get('userId') as string;
		try {
			await deleteUserByAdmin(locals.user!.id, userId);
			return { success: true, message: 'Utilisateur supprimé avec succès.' };
		} catch (err) {
			return fail(400, { message: getErrorMessage(err) });
		}
	},

	updateName: async ({ request, locals }) => {
		assertAdmin(locals.user);
		const form = await request.formData();
		const userId = form.get('userId') as string;
		const newName = form.get('newName') as string;
		try {
			await updateUserNameByAdmin(locals.user!.id, userId, newName);
			return { success: true, message: 'Nom mis à jour avec succès.' };
		} catch (err) {
			return fail(400, { message: getErrorMessage(err) });
		}
	},

	addInvites: async ({ request, locals }) => {
		assertAdmin(locals.user);
		const form = await request.formData();
		const userId = form.get('userId') as string;
		const countRaw = form.get('count');
		const count = countRaw ? parseInt(countRaw as string, 10) : 5;
		const finalCount = Number.isNaN(count) ? 5 : count;
		try {
			await addInvitesToUser(locals.user!.id, userId, finalCount);
			return {
				success: true,
				message: `${finalCount} clés d'invitation ajoutées avec succès.`
			};
		} catch (err) {
			return fail(400, { message: getErrorMessage(err) });
		}
	},

	updateQuota: async ({ request, locals }) => {
		assertAdmin(locals.user);
		const form = await request.formData();
		const userId = form.get('userId') as string;
		const quotaGBRaw = form.get('quotaGB');
		const quotaBytesRaw = form.get('quotaBytes');
		let quotaBytes = 0;
		if (quotaGBRaw !== null && quotaGBRaw !== '') {
			const gb = parseFloat(quotaGBRaw as string);
			if (Number.isNaN(gb) || gb < 0) {
				return fail(400, { message: 'Quota invalide.' });
			}
			quotaBytes = Math.round(gb * 1024 * 1024 * 1024);
		} else if (quotaBytesRaw !== null && quotaBytesRaw !== '') {
			quotaBytes = parseInt(quotaBytesRaw as string, 10);
		}
		try {
			await updateUserQuota(locals.user!.id, userId, quotaBytes);
			return { success: true };
		} catch (err) {
			return fail(400, { message: getErrorMessage(err) });
		}
	}
};
