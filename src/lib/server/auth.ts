import { env } from '$env/dynamic/private';
import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { redirect, error } from '@sveltejs/kit';
import nodeCrypto from 'node:crypto';
import { db } from '$lib/server/db';
import * as schema from './db/schema';

export const auth = betterAuth({
	baseURL: env.ORIGIN,
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'pg', schema: schema }),
	emailAndPassword: { enabled: true },
	plugins: [
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	],
	user: {
		additionalFields: {
			username: { type: 'string', required: false },
			invitedById: { type: 'string', required: false, input: false },
			activeFeedId: { type: 'string', required: false, input: false },
			consentLevel: { type: 'string', required: false, input: false },
			hasCompletedSetup: { type: 'boolean', required: false, defaultValue: false, input: false },
			role: { type: 'string', required: false, defaultValue: 'user', input: false },
			isBanned: { type: 'boolean', required: false, defaultValue: false, input: false },
			doubleTap: { type: 'boolean', required: false, defaultValue: false, input: false }
		}
	}
});

type Session = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

/**
 * Résout la session à partir de `event.locals` (déjà peuplé par `hooks.server.ts`)
 * afin d'éviter des requêtes BDD redondantes, avec fallback sur `auth.api.getSession`.
 */
async function resolveCurrentSession(request?: Request): Promise<Session | null> {
	try {
		const event = getRequestEvent();
		if (event?.locals && 'user' in event.locals && 'session' in event.locals) {
			if (!event.locals.user || !event.locals.session || event.locals.user.isBanned) {
				return null;
			}
			return {
				user: event.locals.user,
				session: event.locals.session
			};
		}
	} catch {
		// Hors contexte RequestEvent SvelteKit, fallback ci-dessous
	}

	if (!request) return null;
	try {
		const session = await auth.api.getSession({ headers: request.headers });
		if (!session || session.user.isBanned) return null;
		return session;
	} catch {
		return null;
	}
}

/**
 * Récupère la session pour une requête de page (+page.server.ts / +layout.server.ts).
 * Redirige vers /login si l'utilisateur n'est pas connecté ou est banni.
 */
export async function requireSession(request?: Request): Promise<Session> {
	const session = await resolveCurrentSession(request);
	if (!session) throw redirect(302, '/login');
	return session;
}

/**
 * Récupère la session pour un endpoint API (+server.ts).
 * Renvoie une erreur HTTP 401 (au lieu d'une redirection) si non connecté ou banni.
 */
export async function requireApiSession(request?: Request): Promise<Session> {
	const session = await resolveCurrentSession(request);
	if (!session) throw error(401, 'Non autorisé');
	return session;
}

/**
 * Exige une session administrateur pour une page (+page.server.ts / +layout.server.ts).
 */
export async function requireAdmin(request?: Request): Promise<Session> {
	const session = await requireSession(request);
	if (session.user.role !== 'admin') {
		throw error(403, 'Accès refusé : droits administrateur requis.');
	}
	return session;
}

/**
 * Exige une session administrateur pour un endpoint API (+server.ts).
 */
export async function requireApiAdmin(request?: Request): Promise<Session> {
	const session = await requireApiSession(request);
	if (session.user.role !== 'admin') {
		throw error(403, 'Accès refusé : droits administrateur requis.');
	}
	return session;
}

/**
 * Récupère la session de manière optionnelle (renvoie null sans lever d'erreur si non connecté).
 */
export async function getOptionalSession(request?: Request): Promise<Session | null> {
	return resolveCurrentSession(request);
}

/**
 * Génère un code d'invitation aléatoire robuste avec fallback compatible tous environnements (HTTP dev inclus).
 */
export function generateInviteCode(prefix = 'INV'): string {
	let randomPart: string;
	try {
		randomPart = nodeCrypto.randomBytes(5).toString('hex').toUpperCase();
	} catch {
		randomPart = (
			Math.random().toString(36).substring(2, 7) + Math.random().toString(36).substring(2, 7)
		)
			.toUpperCase()
			.slice(0, 10);
	}
	return `${prefix}-${randomPart}`;
}
