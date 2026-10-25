import { db } from '$lib/server/db';
import { user as userTable, posts } from '$lib/server/db/schema';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { sendNotification } from '$lib/server/notifications';
import { isBlockedBidirectional, canSeePostSql } from '$lib/server/permissions';

/**
 * Extrait les mentions uniques (@username) d'un texte.
 * Supporte les lettres, chiffres, underscores et points.
 */
export function extractMentions(text: string | null | undefined): string[] {
	if (!text) return [];
	const matches = text.match(/(?:^|\s)@([a-zA-Z0-9_.]{3,30})/g);
	if (!matches) return [];

	const usernames = matches.map((m) => m.trim().replace(/^@/, '').toLowerCase());
	return Array.from(new Set(usernames));
}

/**
 * Récupère les IDs et informations des utilisateurs mentionnés existants en base.
 */
export async function getMentionedUsers(usernames: string[]) {
	if (usernames.length === 0) return [];

	const lowerUsernames = usernames.map((u) => u.toLowerCase());

	return db.query.user.findMany({
		where: inArray(sql`LOWER(${userTable.username})`, lowerUsernames),
		columns: {
			id: true,
			username: true,
			name: true,
			image: true,
			profileVisibility: true
		}
	});
}

/**
 * Envoie une notification à chaque personne mentionnée dans un texte.
 * - Évite l'auto-notification (l'auteur ne se notifie pas lui-même).
 * - Dédoublonne les mentions.
 * - Peut restreindre à une liste d'utilisateurs autorisés (ex: membres du chat).
 * - Ne notifie pas les utilisateurs qui ont désactivé les mentions ou avec qui un blocage existe.
 * - Ne notifie pas les utilisateurs qui n'ont pas accès à la publication concernée.
 */
export async function notifyMentions(params: {
	actorId: string;
	text: string | null | undefined;
	entityId: string;
	context: 'post' | 'comment' | 'chat';
	allowedRecipientIds?: string[];
}) {
	const { actorId, text, entityId, context, allowedRecipientIds } = params;
	const usernames = extractMentions(text);
	if (usernames.length === 0) return [];

	const mentionedUsers = await getMentionedUsers(usernames);
	const notifiedUserIds: string[] = [];

	for (const target of mentionedUsers) {
		// Pas d'auto-notification
		if (target.id === actorId) continue;

		// Si l'utilisateur n'autorise pas les mentions, pas de notification
		const allowsMentions = target.profileVisibility?.allowMentions ?? true;
		if (!allowsMentions) continue;

		// Si une liste blanche d'utilisateurs est fournie (ex: membres du chat ou du groupe), vérifier la présence
		if (allowedRecipientIds && !allowedRecipientIds.includes(target.id)) continue;

		// Vérifier les blocages et la visibilité du post si db.select est disponible
		if (typeof db.select === 'function') {
			if (await isBlockedBidirectional(actorId, target.id)) continue;

			if (context === 'post' || context === 'comment') {
				const [visiblePost] = await db
					.select({ id: posts.id })
					.from(posts)
					.where(and(eq(posts.id, entityId), canSeePostSql(target.id)))
					.limit(1);
				if (!visiblePost) continue;
			}
		}

		let contextLabel = 'une publication';
		if (context === 'comment') contextLabel = 'un commentaire';
		if (context === 'chat') contextLabel = 'un message';

		await sendNotification({
			recipientId: target.id,
			actorId,
			type: 'mention',
			entityId,
			content: contextLabel
		});

		notifiedUserIds.push(target.id);
	}

	return notifiedUserIds;
}
