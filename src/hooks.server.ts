// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { db } from '$lib/server/db';
import { session as sessionTable } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

import { cleanupExpiredStories } from '$lib/server/stories';
import { ensureOptimizationIndexes } from '$lib/server/db/indexes';
import { ensureSystemUser } from '$lib/server/admin';

let lastStoryCleanup = 0;

export const handle: Handle = async ({ event, resolve }) => {
	const reqStartTime = performance.now();

	// Interception des requêtes fantômes injectées par des extensions de navigateur (ex: pulltab)
	if (event.url.pathname.endsWith('__PULLTAB_CSS_URL__')) {
		return new Response('', {
			status: 200,
			headers: { 'Content-Type': 'text/css' }
		});
	}

	if (!building) {
		await ensureOptimizationIndexes();
		await ensureSystemUser().catch((e) => console.error('Erreur ensureSystemUser:', e));
	}

	// SÉCURITÉ : Interdire l'inscription publique directe via l'API Better Auth (qui contournerait les clés d'invitation)
	if (event.url.pathname.startsWith('/api/auth/sign-up')) {
		return new Response(
			JSON.stringify({
				message: "L'inscription directe est désactivée. Utilisez une clé d'invitation."
			}),
			{
				status: 403,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	// Nettoyage périodique en tâche de fond (au maximum une fois par heure)
	const now = Date.now();
	if (!building && now - lastStoryCleanup > 3600 * 1000) {
		lastStoryCleanup = now;
		cleanupExpiredStories().catch((e) => console.error('Erreur cleanupExpiredStories:', e));
	}

	// 1. On récupère la session une seule fois pour peupler event.locals
	const authStartTime = performance.now();
	const session = await auth.api.getSession({ headers: event.request.headers });
	const authDuration = performance.now() - authStartTime;

	if (session) {
		// SÉCURITÉ : Si l'utilisateur est banni, on révoque immédiatement sa session
		if (session.user.isBanned) {
			await db
				.delete(sessionTable)
				.where(eq(sessionTable.userId, session.user.id))
				.catch(() => {});
			event.locals.session = null;
			event.locals.user = null;
		} else {
			event.locals.session = session.session;
			event.locals.user = session.user;
		}
	} else {
		event.locals.session = null;
		event.locals.user = null;
	}

	// 2. On laisse svelteKitHandler gérer la requête
	const response = await svelteKitHandler({ event, resolve, auth, building });

	// Ajout de l'en-tête standard Server-Timing (visible dans l'onglet Network des DevTools)
	const totalDuration = performance.now() - reqStartTime;
	response.headers.set(
		'Server-Timing',
		`total;dur=${totalDuration.toFixed(1)};desc="Total", auth;dur=${authDuration.toFixed(1)};desc="Auth"`
	);

	// Protection SEO : interdire l'indexation des chemins privés, d'administration et de l'API
	const privatePaths = [
		'/api',
		'/chat',
		'/creer_discussion',
		'/parametres',
		'/publier',
		'/modifier_post',
		'/modifier_profil',
		'/story',
		'/admin',
		'/admin-setup',
		'/setup'
	];
	if (privatePaths.some((p) => event.url.pathname.startsWith(p))) {
		response.headers.set('X-Robots-Tag', 'noindex, nofollow');
	}

	return response;
};
