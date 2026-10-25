/**
 * @module server/posts/publish
 * @description Création orchestrée et mise à jour des publications (fichiers, quotas, layout, packs, tags).
 */

import { db } from '$lib/server/db';
import { posts, userGroups, iconSets, emojiSets } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import type { CarouselItem, PostVisibility, PostType } from '$lib/types';
import {
	saveUploadedFile,
	deleteMediaFiles,
	diffRemovedMedia,
	getUserMediaUsage,
	formatBytes
} from '$lib/server/media';
import { syncPostTags, extractHashtags } from '$lib/server/tags';
import { notifyMentions } from '$lib/server/mentions';
import { createPost } from './crud';

export interface PublishPostInput {
	authorId: string;
	caption: string | null;
	explicitTags?: string[];
	visibility: PostVisibility;
	groupId?: string | null;
	layout: Array<
		{ type: 'text'; text: string; align?: 'left' | 'center' | 'right' } | { type: 'media' }
	>;
	files: File[];
	iconSetId?: string | null;
	emojiSetId?: string | null;
}

/**
 * Orchestre la publication complète d'un post utilisateur :
 * validation des permissions de groupe, vérification des quotas de stockage de l'utilisateur,
 * traitement et enregistrement sur disque des fichiers médias (images/vidéos),
 * et persistance du post avec ses slides textuelles et médias.
 *
 * En cas d'erreur lors de l'insertion, les fichiers médias fraîchement écrits sont nettoyés.
 *
 * @param input - Données du formulaire de publication (auteur, visibilité, slides, fichiers File)
 * @throws Error si quota dépassé, groupe non autorisé, ou layout vide
 * @returns Le post créé
 */
export async function publishPost(input: PublishPostInput) {
	const {
		authorId,
		caption,
		explicitTags,
		visibility,
		groupId,
		layout,
		files,
		iconSetId,
		emojiSetId
	} = input;

	const validStandardVisibilities = ['public', 'followers', 'group', 'private', 'network'];
	if (!validStandardVisibilities.includes(visibility)) {
		throw new Error('Problème avec la visibilité');
	}

	if (visibility === 'group') {
		if (!groupId) {
			throw new Error('Veuillez spécifier un groupe valide');
		}
		const group = await db.query.userGroups.findFirst({
			where: and(eq(userGroups.id, groupId), eq(userGroups.ownerId, authorId))
		});
		if (!group) {
			throw new Error('Groupe introuvable ou non autorisé');
		}
	}

	if ((!layout || layout.length === 0) && !iconSetId && !emojiSetId) {
		throw new Error('Le post ne peut pas être vide.');
	}

	if (iconSetId) {
		const ownedIconSet = await db.query.iconSets.findFirst({
			where: and(eq(iconSets.id, iconSetId), eq(iconSets.ownerId, authorId))
		});
		if (!ownedIconSet) {
			throw new Error("Pack d'icônes introuvable ou non autorisé.");
		}
	}

	if (emojiSetId) {
		const ownedEmojiSet = await db.query.emojiSets.findFirst({
			where: and(eq(emojiSets.id, emojiSetId), eq(emojiSets.ownerId, authorId))
		});
		if (!ownedEmojiSet) {
			throw new Error("Collection d'emojis introuvable ou non autorisée.");
		}
	}

	// Vérification du quota utilisateur
	const incomingSize = files.reduce((acc, f) => acc + (f.size || 0), 0);
	const usage = await getUserMediaUsage(authorId);
	if (usage.totalBytes + incomingSize > usage.quotaBytes) {
		const remaining = Math.max(0, usage.quotaBytes - usage.totalBytes);
		throw new Error(`Quota de stockage dépassé. Espace restant : ${formatBytes(remaining)}.`);
	}

	// Reconstruction du carrousel et traitement des médias
	const finalCarousel: CarouselItem[] = [];
	let fileIndex = 0;

	try {
		for (const item of layout || []) {
			if (item.type === 'text') {
				finalCarousel.push({
					type: 'text',
					content: item.text,
					align: item.align
				});
			} else if (item.type === 'media') {
				const file = files[fileIndex++];
				if (!file || file.size === 0) continue;

				const saved = await saveUploadedFile(file);
				finalCarousel.push(saved);
			}
		}

		let postType: PostType | undefined = undefined;
		if (finalCarousel.length === 0) {
			if (iconSetId) postType = 'icon_set';
			else if (emojiSetId) postType = 'emoji_set';
		}

		const post = await createPost({
			authorId,
			content: caption,
			mediaUrls: finalCarousel,
			postType,
			iconSetId: iconSetId || null,
			emojiSetId: emojiSetId || null,
			visibility,
			groupId: visibility === 'group' ? groupId : null,
			tags: explicitTags
		});

		if (iconSetId) {
			await db
				.update(iconSets)
				.set({ isPublished: true })
				.where(and(eq(iconSets.id, iconSetId), eq(iconSets.ownerId, authorId)));
		}
		if (emojiSetId) {
			await db
				.update(emojiSets)
				.set({ isPublished: true })
				.where(and(eq(emojiSets.id, emojiSetId), eq(emojiSets.ownerId, authorId)));
		}

		return post;
	} catch (err) {
		// Rollback physique des fichiers uploadés en cas d'erreur
		await deleteMediaFiles(finalCarousel);
		throw err;
	}
}

export interface UpdatePublishedPostInput {
	postId: string;
	authorId: string;
	caption?: string | null;
	explicitTags?: string[];
	visibility?: string | null;
	groupId?: string | null;
	layout?: Array<{
		type: 'text' | 'image' | 'video' | 'media';
		text?: string;
		content?: string;
		align?: 'left' | 'center' | 'right';
	}>;
	files?: File[];
	iconSetId?: string | null;
	emojiSetId?: string | null;
}

/**
 * Met à jour une publication existante : validation de la propriété, des quotas,
 * des packs d'icônes/émojis, du groupe, traitement des nouveaux fichiers médias,
 * mise à jour DB, synchronisation des tags/mentions et nettoyage des anciens fichiers retirés.
 *
 * @param input Données de modification du post
 * @throws Error si le post est introuvable, non autorisé, ou données invalides
 */
export async function updatePublishedPost(input: UpdatePublishedPostInput) {
	const {
		postId,
		authorId,
		caption,
		explicitTags = [],
		visibility: rawVisibility,
		groupId: rawGroupId,
		layout = [],
		files = [],
		iconSetId: rawIconSetId,
		emojiSetId: rawEmojiSetId
	} = input;

	const existingPost = await db.query.posts.findFirst({
		where: and(eq(posts.id, postId), eq(posts.authorId, authorId))
	});

	if (!existingPost) {
		throw new Error('Post introuvable');
	}

	if (rawIconSetId) {
		const ownedIconSet = await db.query.iconSets.findFirst({
			where: and(eq(iconSets.id, rawIconSetId), eq(iconSets.ownerId, authorId))
		});
		if (!ownedIconSet) {
			throw new Error("Pack d'icônes non autorisé.");
		}
	}

	if (rawEmojiSetId) {
		const ownedEmojiSet = await db.query.emojiSets.findFirst({
			where: and(eq(emojiSets.id, rawEmojiSetId), eq(emojiSets.ownerId, authorId))
		});
		if (!ownedEmojiSet) {
			throw new Error("Collection d'emojis non autorisée.");
		}
	}

	const validVisibilities = ['public', 'network', 'followers', 'private', 'group'] as const;
	const visibility = (validVisibilities as readonly string[]).includes(rawVisibility || '')
		? (rawVisibility as 'public' | 'network' | 'followers' | 'private' | 'group')
		: existingPost.visibility;

	const resolvedGroupId = rawGroupId?.trim() || existingPost.groupId || null;

	if (visibility === 'group') {
		if (!resolvedGroupId) {
			throw new Error('Groupe requis pour cette visibilité.');
		}
		const group = await db.query.userGroups.findFirst({
			where: and(eq(userGroups.id, resolvedGroupId), eq(userGroups.ownerId, authorId))
		});
		if (!group) {
			throw new Error('Groupe non autorisé.');
		}
	}

	// Vérification quota pour les nouveaux fichiers ajoutés
	const incomingSize = files.reduce((acc, f) => acc + (f.size || 0), 0);
	if (incomingSize > 0) {
		const usage = await getUserMediaUsage(authorId);
		if (usage.totalBytes + incomingSize > usage.quotaBytes) {
			const remaining = Math.max(0, usage.quotaBytes - usage.totalBytes);
			throw new Error(`Quota de stockage dépassé. Espace restant : ${formatBytes(remaining)}.`);
		}
	}

	// Liste blanche des médias appartenant déjà à ce post
	const existingMediaItems = (existingPost.mediaUrls as CarouselItem[] | null) || [];
	const existingMediaUrls = new Set(
		existingMediaItems.filter((m) => m.type === 'image' || m.type === 'video').map((m) => m.content)
	);

	const finalCarousel: CarouselItem[] = [];
	let fileIndex = 0;

	for (const item of layout) {
		if (item.type === 'text') {
			const textVal = (item.content || item.text || '').trim();
			if (textVal || (!rawIconSetId && !rawEmojiSetId)) {
				finalCarousel.push({
					type: 'text',
					content: item.content || item.text || '',
					align: item.align
				});
			}
		} else if (item.content && item.content.startsWith('/media/')) {
			if (!existingMediaUrls.has(item.content)) {
				throw new Error('Média existant non autorisé.');
			}
			finalCarousel.push({ type: item.type as 'image' | 'video', content: item.content });
		} else if (item.type === 'media' || !item.content) {
			const file = files[fileIndex++];
			if (file && file.size > 0) {
				const saved = await saveUploadedFile(file);
				finalCarousel.push(saved);
			}
		}
	}

	if (finalCarousel.length === 0 && !rawIconSetId && !rawEmojiSetId) {
		throw new Error('Le post ne peut pas être vide.');
	}

	const hasVideo = finalCarousel.some((i) => i.type === 'video');
	const hasImage = finalCarousel.some((i) => i.type === 'image');
	let postType: 'text' | 'image' | 'video' | 'carousel' | 'icon_set' | 'emoji_set' = 'text';
	if (finalCarousel.length > 1) postType = 'carousel';
	else if (hasVideo) postType = 'video';
	else if (hasImage) postType = 'image';
	else if (finalCarousel.length === 1) postType = 'text';
	else if (rawIconSetId) postType = 'icon_set';
	else if (rawEmojiSetId) postType = 'emoji_set';

	await db
		.update(posts)
		.set({
			content: caption ? caption.trim() : null,
			mediaUrls: finalCarousel,
			postType,
			iconSetId: rawIconSetId || null,
			emojiSetId: rawEmojiSetId || null,
			visibility,
			groupId: visibility === 'group' ? resolvedGroupId : null,
			isFederated: visibility === 'public'
		})
		.where(and(eq(posts.id, postId), eq(posts.authorId, authorId)));

	if (rawIconSetId) {
		await db
			.update(iconSets)
			.set({ isPublished: true })
			.where(and(eq(iconSets.id, rawIconSetId), eq(iconSets.ownerId, authorId)));
	}
	if (rawEmojiSetId) {
		await db
			.update(emojiSets)
			.set({ isPublished: true })
			.where(and(eq(emojiSets.id, rawEmojiSetId), eq(emojiSets.ownerId, authorId)));
	}

	const textSlides = finalCarousel
		.filter((m) => m.type === 'text')
		.map((m) => m.content)
		.join(' ');
	const combinedText = `${caption || ''} ${textSlides}`;
	const extractedTags = extractHashtags(combinedText);
	const allTags = Array.from(new Set([...explicitTags, ...extractedTags]));
	await syncPostTags(postId, allTags);

	await notifyMentions({
		actorId: authorId,
		text: combinedText,
		entityId: postId,
		context: 'post'
	});

	// Nettoyage disque des médias supprimés
	const removedMedia = diffRemovedMedia(
		existingPost.mediaUrls as CarouselItem[] | null,
		finalCarousel
	);
	await deleteMediaFiles(removedMedia);

	return { success: true };
}
