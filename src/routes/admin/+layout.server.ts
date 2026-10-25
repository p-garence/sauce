import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db';
import { user as userTable } from '$lib/server/db/schema';
import type { User } from '$lib/types';
import { eq } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ parent }) => {
	// 1. On récupère la session de base fournie par le layout racine
	const { session } = await parent();

	if (!session) {
		throw redirect(302, '/login');
	}

	// 2. On récupère notre utilisateur complet depuis notre table
	const [dbUser] = await db
		.select()
		.from(userTable)
		.where(eq(userTable.id, session.user.id))
		.limit(1);

	if (!dbUser) {
		throw redirect(302, '/login');
	}

	if ((dbUser as User).role !== 'admin') {
		throw redirect(302, '/');
	}

	return { sessionUser: dbUser as User };
};
