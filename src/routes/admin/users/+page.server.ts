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

function getErrorMessage(err: unknown): string {
	return err instanceof Error ? err.message : 'Une erreur est survenue';
}

export const load: PageServerLoad = async ({ locals }) => {
	assertAdmin(locals.user);
	const allUsers = await getAdminUsers();
	return {
		users: allUsers
	};
};

export const actions: Actions = {
	toggleBan: async ({ request, locals }) => {
		assertAdmin(locals.user);
		const form = await request.formData();
		const userId = form.get('userId') as string;
		try {
			await toggleUserBan(userId, locals.user!.id);
			return { success: true };
		} catch (err) {
			return fail(400, { message: getErrorMessage(err) });
		}
	},

	updateRole: async ({ request, locals }) => {
		assertAdmin(locals.user);
		const form = await request.formData();
		const userId = form.get('userId') as string;
		const role = form.get('role') as string;
		try {
			await updateUserRole(userId, role, locals.user!.id);
			return { success: true };
		} catch (err) {
			return fail(400, { message: getErrorMessage(err) });
		}
	},

	deleteUser: async ({ request, locals }) => {
		assertAdmin(locals.user);
		const form = await request.formData();
		const userId = form.get('userId') as string;
		try {
			await deleteUserByAdmin(userId, locals.user!.id);
			return { success: true };
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
			await updateUserNameByAdmin(userId, newName);
			return { success: true };
		} catch (err) {
			return fail(400, { message: getErrorMessage(err) });
		}
	},

	addInvites: async ({ request, locals }) => {
		assertAdmin(locals.user);
		const form = await request.formData();
		const userId = form.get('userId') as string;
		const count = parseInt(form.get('count') as string, 10);
		try {
			await addInvitesToUser(userId, count);
			return { success: true };
		} catch (err) {
			return fail(400, { message: getErrorMessage(err) });
		}
	},

	updateQuota: async ({ request, locals }) => {
		assertAdmin(locals.user);
		const form = await request.formData();
		const userId = form.get('userId') as string;
		const quotaBytes = form.get('quotaBytes') ? parseInt(form.get('quotaBytes') as string, 10) : null;
		try {
			await updateUserQuota(userId, quotaBytes);
			return { success: true };
		} catch (err) {
			return fail(400, { message: getErrorMessage(err) });
		}
	}
};
