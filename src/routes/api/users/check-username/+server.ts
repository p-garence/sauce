import { json } from '@sveltejs/kit';
import { requireApiSession } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { sql } from 'drizzle-orm';
import { isValidUsername } from '$lib/utils/validation';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, request }) => {
	const session = await requireApiSession(request);
	const requestedUsername = (url.searchParams.get('username') || '').trim();

	if (!requestedUsername) {
		return json({ available: false, reason: 'Veuillez saisir un nom d\'utilisateur.' }, { status: 400 });
	}

	if (!isValidUsername(requestedUsername)) {
		return json({
			available: false,
			reason: 'Le pseudo doit comporter entre 3 et 30 caractères (lettres, chiffres et tirets bas uniquement).'
		});
	}

	// Si c'est le pseudo actuel de l'utilisateur connecté
	const currentUsername = (session.user as { username?: string }).username || '';
	if (requestedUsername.toLowerCase() === currentUsername.toLowerCase()) {
		return json({ available: true, isCurrent: true });
	}

	try {
		const [existing] = await db
			.select({ id: user.id })
			.from(user)
			.where(sql`LOWER(${user.username}) = LOWER(${requestedUsername})`)
			.limit(1);

		if (existing && existing.id !== session.user.id) {
			return json({ available: false, reason: 'Ce nom d\'utilisateur est déjà pris.' });
		}

		return json({ available: true });
	} catch (error) {
		console.error('Erreur check-username:', error);
		return json({ error: 'Erreur interne du serveur' }, { status: 500 });
	}
};
