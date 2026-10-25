import { json } from '@sveltejs/kit';
import { requireApiSession } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { user as userTable } from '$lib/server/db/schema';
import { inArray, sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, url }) => {
	await requireApiSession(request);

	const rawUsernames = url.searchParams.get('usernames') || '';
	const usernames = rawUsernames
		.split(',')
		.map((u) => u.trim().toLowerCase().replace(/^@/, ''))
		.filter((u) => u.length > 0)
		.slice(0, 50);

	if (usernames.length === 0) {
		return json({ statuses: {} });
	}

	const foundUsers = await db.query.user.findMany({
		where: inArray(sql`LOWER(${userTable.username})`, usernames),
		columns: {
			username: true,
			profileVisibility: true
		}
	});

	const statuses: Record<string, boolean> = {};

	// Par défaut pour les pseudos demandés
	for (const uname of usernames) {
		statuses[uname] = false;
	}

	for (const u of foundUsers) {
		if (u.username) {
			const lower = u.username.toLowerCase();
			const allows = u.profileVisibility?.allowMentions ?? true;
			statuses[lower] = allows;
		}
	}

	return json({ statuses });
};
