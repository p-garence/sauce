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
			await toggleUserBan(locals.user!.id, userId);
			return { success: true };
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
			return { success: true };
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
			await deleteUserByAdmin(locals.user!.id, userId);
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
			await updateUserNameByAdmin(locals.user!.id, userId, newName);
			return { success: true };
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
		try {
			await addInvitesToUser(locals.user!.id, userId, Number.isNaN(count) ? 5 : count);
			return { success: true };
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
