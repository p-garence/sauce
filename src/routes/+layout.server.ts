// src/routes/+layout.server.ts
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { count } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	// 1. Vérification du nombre d'utilisateurs en base
	const [result] = await db.select({ value: count() }).from(user).limit(1);
	const userCount = result.value;

	// Si 0 utilisateur, on verrouille tout et on redirige vers l'installation
	if (userCount === 0 && url.pathname !== '/admin-setup') {
		throw redirect(302, '/admin-setup');
	}

	// Si l'admin existe déjà, on interdit de retourner sur l'installation
	if (userCount > 0 && url.pathname === '/admin-setup') {
		throw redirect(302, '/');
	}

	// 2. Gestion de la session depuis locals (déjà résolue et vérifiée dans hooks.server.ts)
	const sessionUser = locals.user;
	const rawSession = locals.session;

	if (sessionUser && !sessionUser.hasCompletedSetup && url.pathname !== '/setup') {
		throw redirect(302, '/setup');
	}
	if (sessionUser && sessionUser.hasCompletedSetup && url.pathname === '/setup') {
		throw redirect(302, '/flux');
	}
	if (sessionUser && sessionUser.hasCompletedSetup && url.pathname === '/') {
		throw redirect(302, '/flux');
	}

	const publicRoutes = ['/', '/calendrier', '/login', '/admin-setup'];
	const isPublicPostRoute = url.pathname.startsWith('/post/');
	if (!sessionUser && !isPublicPostRoute && !publicRoutes.some((route) => url.pathname === route)) {
		throw redirect(302, '/');
	}

	const session =
		sessionUser && rawSession
			? {
					user: sessionUser,
					session: {
						id: rawSession.id,
						userId: rawSession.userId,
						expiresAt: rawSession.expiresAt
					}
				}
			: null;

	return { session };
};
