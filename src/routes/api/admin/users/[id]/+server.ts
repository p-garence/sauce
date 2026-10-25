import { json } from '@sveltejs/kit';
import { requireApiSession } from '$lib/server/auth';
import {
	assertAdmin,
	toggleUserBan,
	updateUserRole,
	updateUserNameByAdmin,
	addInvitesToUser,
	updateUserQuota,
	deleteUserByAdmin
} from '$lib/server/admin';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ request, params }) => {
	const session = await requireApiSession(request);
	assertAdmin(session.user);
	const targetUserId = params.id;

	const body = await request.json();

	try {
		const results: Record<string, unknown> = {};

		if ('isBanned' in body) {
			results.ban = await toggleUserBan(session.user.id, targetUserId, body.isBanned);
		}

		if ('role' in body) {
			results.role = await updateUserRole(
				session.user.id,
				targetUserId,
				body.role as 'admin' | 'user'
			);
		}

		if ('name' in body) {
			results.name = await updateUserNameByAdmin(session.user.id, targetUserId, body.name);
		}

		if ('addInvites' in body) {
			results.invites = await addInvitesToUser(
				session.user.id,
				targetUserId,
				Number(body.addInvites)
			);
		}

		if ('storageQuotaBytes' in body) {
			results.quota = await updateUserQuota(
				session.user.id,
				targetUserId,
				Number(body.storageQuotaBytes)
			);
		}

		return json({ success: true, ...results });
	} catch (error: unknown) {
		console.error('Erreur patch admin user:', error);
		const message = error instanceof Error ? error.message : 'Erreur serveur';
		const status = (error as { status?: number })?.status || 400;
		return json({ error: message }, { status });
	}
};

export const DELETE: RequestHandler = async ({ request, params }) => {
	const session = await requireApiSession(request);
	assertAdmin(session.user);
	const targetUserId = params.id;

	try {
		const result = await deleteUserByAdmin(session.user.id, targetUserId);
		return json(result);
	} catch (error: unknown) {
		console.error('Erreur delete admin user:', error);
		const message = error instanceof Error ? error.message : 'Erreur serveur';
		const status = (error as { status?: number })?.status || 400;
		return json({ error: message }, { status });
	}
};
