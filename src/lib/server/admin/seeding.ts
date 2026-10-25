/**
 * @module server/admin/seeding
 * @description Génération de données de test pour l'administration (utilisateurs, posts, clés d'invitation).
 */

import { db } from '$lib/server/db';
import { user, inviteKeys } from '$lib/server/db/schema';
import { createPost } from '$lib/server/posts';
import { generateInviteCode } from '$lib/server/auth';

const ADJECTIVES = [
	'Curieux',
	'Creatif',
	'Voyageur',
	'Geek',
	'Explorateur',
	'Artiste',
	'Nomade',
	'Reveur',
	'Zen',
	'Audacieux'
];

const NOUNS = [
	'Loutre',
	'Panda',
	'Renard',
	'Aigle',
	'Faucon',
	'Loup',
	'Dauphin',
	'Koala',
	'Hibou',
	'Tigre'
];

/**
 * Génère des utilisateurs de test aléatoires.
 *
 * @param count Nombre d'utilisateurs à créer (défaut 30)
 * @returns Nombre d'utilisateurs créés
 */
export async function seedTestUsers(count = 30): Promise<number> {
	const usersToInsert = [];

	for (let i = 0; i < count; i++) {
		const randAdj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
		const randNoun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
		const randNum = Math.floor(100 + Math.random() * 900);
		const timestamp = Date.now().toString().slice(-4);
		const username = `${randNoun.toLowerCase()}_${randAdj.toLowerCase()}_${randNum}_${timestamp}_${i}`;
		const name = `${randNoun} ${randAdj} ${randNum}`;
		const id = `test_${Math.random().toString(36).substring(2, 10)}_${Date.now()}_${i}`;
		const email = `${username}@test-social.local`;

		usersToInsert.push({
			id,
			name,
			email,
			emailVerified: true,
			username,
			hasCompletedSetup: true,
			role: 'user' as const,
			isBanned: false,
			maxInvites: 5,
			bio: `Utilisateur de test #${i + 1} (${randAdj} ${randNoun}).`,
			createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
		});
	}

	await db.insert(user).values(usersToInsert);
	return usersToInsert.length;
}

/**
 * Génère des publications de test pour un utilisateur donné avec dates passées aléatoires.
 *
 * @param authorId Identifiant de l'auteur des posts
 * @param count Nombre de posts à générer (défaut 30)
 * @returns Nombre de posts créés
 */
export async function seedTestPosts(authorId: string, count = 30): Promise<number> {
	const promises = [];
	for (let i = 0; i < count; i++) {
		const randomPastDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
		promises.push(
			createPost({
				authorId,
				content: `Publication de test #${i + 1} 🚀 générée automatiquement.`,
				mediaUrls: [{ type: 'text', content: `Ceci est le post test numéro ${i + 1}.` }],
				visibility: 'public',
				createdAt: randomPastDate
			})
		);
	}

	await Promise.all(promises);
	return count;
}

/**
 * Génère un lot de clés d'invitation avec un préfixe spécifique.
 *
 * @param createdById Identifiant de l'administrateur créateur
 * @param count Nombre de clés à créer (défaut 10)
 * @param prefix Préfixe du code d'invitation (défaut 'ADMIN')
 * @returns Liste des clés créées
 */
export async function seedInviteKeys(
	createdById: string,
	count = 10,
	prefix = 'ADMIN'
): Promise<string[]> {
	const keysToInsert = [];
	const generatedCodes: string[] = [];

	for (let i = 0; i < count; i++) {
		const code = generateInviteCode(prefix);
		generatedCodes.push(code);
		keysToInsert.push({
			key: code,
			createdBy: createdById
		});
	}

	await db.insert(inviteKeys).values(keysToInsert);
	return generatedCodes;
}
