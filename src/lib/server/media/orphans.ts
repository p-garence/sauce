import fs from 'node:fs/promises';
import path from 'node:path';
import { db } from '$lib/server/db';
import { user, posts, messages, comments } from '$lib/server/db/schema';
import { isNotNull, ilike, or } from 'drizzle-orm';
import type { CarouselItem, EmojiItem } from '$lib/types';
import { UPLOAD_DIR } from './config';

export interface OrphanMediaItem {
	filename: string;
	url: string;
	sizeBytes: number;
	createdAt: Date;
}

export interface OrphanMediaStats {
	totalOrphanBytes: number;
	orphanCount: number;
	orphans: OrphanMediaItem[];
}

/**
 * Extrait tous les noms de fichiers médias (/media/<nom_de_fichier>) référencés dans une chaîne,
 * que ce soit une URL, du Markdown, du JSON, ou du texte brut.
 */
export function extractMediaFilenames(text: string | null | undefined): string[] {
	if (!text) return [];
	const filenames = new Set<string>();

	// 1. Détection via regex pour toute occurrence de /media/<nom_de_fichier>
	const regex = /\/media\/([a-zA-Z0-9_.-]+)/g;
	let match: RegExpExecArray | null;
	while ((match = regex.exec(text)) !== null) {
		const cleanName = match[1].split(/[?#]/)[0];
		if (cleanName) {
			filenames.add(cleanName);
		}
	}

	// 2. Si le texte entier est un chemin direct ou un nom de fichier simple avec une extension
	if (!text.includes(' ') && !text.includes('\n') && !text.includes('\t')) {
		const base = path.basename(text.split(/[?#]/)[0]);
		if (base && !base.startsWith('.') && base.includes('.')) {
			filenames.add(base);
		}
	}

	return Array.from(filenames);
}

/**
 * Détecte les fichiers présents sur le disque dans `UPLOAD_DIR` qui ne sont plus référencés
 * par aucune publication, story, message de chat, commentaire ou avatar utilisateur.
 *
 * @param gracePeriodMs Période de grâce (en ms) durant laquelle un fichier récent n'est pas
 * considéré comme orphelin (par défaut 2 heures), afin de protéger les envois et brouillons en cours.
 */
export async function getOrphanMedia(
	gracePeriodMs: number = 2 * 3600 * 1000
): Promise<OrphanMediaStats> {
	try {
		await fs.mkdir(UPLOAD_DIR, { recursive: true });
		const diskFiles = await fs.readdir(UPLOAD_DIR);

		// 1. Collecter tous les médias référencés en base
		const referencedFiles = new Set<string>();

		// A. Publications (mediaUrls JSON)
		const allPosts = await db.query.posts.findMany({
			where: isNotNull(posts.mediaUrls),
			columns: { mediaUrls: true }
		});
		for (const post of allPosts) {
			const items = (post.mediaUrls as CarouselItem[] | null) || [];
			for (const item of items) {
				if ((item.type === 'image' || item.type === 'video') && item.content) {
					for (const name of extractMediaFilenames(item.content)) {
						referencedFiles.add(name);
					}
				}
			}
		}

		// B. Publications (contenu texte/markdown contenant /media/)
		const postsWithMediaContent = await db.query.posts.findMany({
			where: ilike(posts.content, '%/media/%'),
			columns: { content: true }
		});
		for (const post of postsWithMediaContent) {
			for (const name of extractMediaFilenames(post.content)) {
				referencedFiles.add(name);
			}
		}

		// C. Avatars utilisateurs
		const allUsers = await db.query.user.findMany({
			where: isNotNull(user.image),
			columns: { image: true }
		});
		for (const u of allUsers) {
			for (const name of extractMediaFilenames(u.image)) {
				referencedFiles.add(name);
			}
		}

		// D. Stories (actives et archivées)
		const allStories = await db.query.stories.findMany({
			columns: { mediaUrl: true }
		});
		for (const s of allStories) {
			for (const name of extractMediaFilenames(s.mediaUrl)) {
				referencedFiles.add(name);
			}
		}

		// E. Messages de conversations (story replies, photos partagées, fichiers)
		const chatMessages = await db.query.messages.findMany({
			where: or(ilike(messages.content, '%/media/%'), isNotNull(messages.mediaUrl)),
			columns: { content: true, mediaUrl: true }
		});
		for (const msg of chatMessages) {
			if (msg.content) {
				for (const name of extractMediaFilenames(msg.content)) {
					referencedFiles.add(name);
				}
			}
			if (msg.mediaUrl) {
				for (const name of extractMediaFilenames(msg.mediaUrl)) {
					referencedFiles.add(name);
				}
			}
		}

		// F. Commentaires (si médias intégrés en markdown)
		const commentItems = await db.query.comments.findMany({
			where: ilike(comments.content, '%/media/%'),
			columns: { content: true }
		});
		for (const c of commentItems) {
			for (const name of extractMediaFilenames(c.content)) {
				referencedFiles.add(name);
			}
		}

		// G. Packs d'icônes personnalisés (iconSets.icons JSON)
		const allIconSets = await db.query.iconSets.findMany({
			columns: { icons: true }
		});
		for (const set of allIconSets) {
			const iconsMap = (set.icons as Record<string, string> | null) || {};
			for (const url of Object.values(iconsMap)) {
				for (const name of extractMediaFilenames(url)) {
					referencedFiles.add(name);
				}
			}
		}

		// H. Collections d'émojis personnalisés (emojiSets.emojis JSON)
		const allEmojiSets = await db.query.emojiSets.findMany({
			columns: { emojis: true }
		});
		for (const set of allEmojiSets) {
			const emojiList = (set.emojis as EmojiItem[] | null) || [];
			for (const emoji of emojiList) {
				if (emoji?.url) {
					for (const name of extractMediaFilenames(emoji.url)) {
						referencedFiles.add(name);
					}
				}
			}
		}

		// 2. Détecter les fichiers orphelins sur le disque
		const orphans: OrphanMediaItem[] = [];
		let totalOrphanBytes = 0;
		const now = Date.now();

		for (const file of diskFiles) {
			// Ignorer les fichiers cachés ou les fichiers temporaires en cours
			if (file.startsWith('.') || file.startsWith('temp_')) continue;

			if (!referencedFiles.has(file)) {
				const filePath = path.join(UPLOAD_DIR, file);
				try {
					const stats = await fs.stat(filePath);
					// Période de grâce : si le fichier a été modifié il y a moins de `gracePeriodMs`,
					// il peut s'agir d'un upload en cours ou d'un brouillon non encore sauvegardé.
					if (now - stats.mtime.getTime() < gracePeriodMs) {
						continue;
					}

					if (stats.isFile()) {
						totalOrphanBytes += stats.size;
						orphans.push({
							filename: file,
							url: `/media/${file}`,
							sizeBytes: stats.size,
							createdAt: stats.mtime
						});
					}
				} catch {
					// Fichier potentiellement supprimé entre-temps
				}
			}
		}

		// Trier les plus lourds en premier
		orphans.sort((a, b) => b.sizeBytes - a.sizeBytes);

		return {
			totalOrphanBytes,
			orphanCount: orphans.length,
			orphans
		};
	} catch (err) {
		console.error('Erreur getOrphanMedia:', err);
		return {
			totalOrphanBytes: 0,
			orphanCount: 0,
			orphans: []
		};
	}
}

/**
 * Supprime les fichiers orphelins du disque.
 * Si une liste de filenames est fournie, supprime uniquement ceux-ci.
 * Sinon, supprime tous les orphelins détectés (hors période de grâce).
 */
export async function deleteOrphanMedia(
	filenames?: string[],
	gracePeriodMs?: number
): Promise<{ deletedCount: number; freedBytes: number }> {
	const { orphans } = await getOrphanMedia(gracePeriodMs);
	const orphanMap = new Map(orphans.map((o) => [o.filename, o.sizeBytes]));

	const targets =
		filenames && filenames.length > 0
			? filenames.filter((name) => orphanMap.has(name))
			: orphans.map((o) => o.filename);

	let deletedCount = 0;
	let freedBytes = 0;

	for (const name of targets) {
		try {
			const filePath = path.join(UPLOAD_DIR, name);
			const size = orphanMap.get(name) || 0;
			await fs.unlink(filePath);
			deletedCount++;
			freedBytes += size;
		} catch (err) {
			if ((err as NodeJS.ErrnoException)?.code !== 'ENOENT') {
				console.error('Erreur suppression orphelin:', name, err);
			}
		}
	}

	return { deletedCount, freedBytes };
}
