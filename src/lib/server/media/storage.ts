import fs from 'node:fs/promises';
import path from 'node:path';
import { db } from '$lib/server/db';
import { user, posts, stories, messages, iconSets, emojiSets } from '$lib/server/db/schema';
import { eq, isNotNull, and } from 'drizzle-orm';
import type { CarouselItem } from '$lib/types';
import { getInstanceSettings } from '$lib/server/instanceSettings';
import { UPLOAD_DIR } from './config';
import { getMediaFileSize } from './processing';

export interface UserMediaPostItem {
	id: string;
	content: string | null;
	createdAt: Date;
	mediaCount: number;
	totalSizeBytes: number;
	thumbnail: string | null;
	postType: string;
}

export interface UserMediaStoryItem {
	id: string;
	mediaUrl: string;
	mediaType: 'image' | 'video';
	caption: string | null;
	createdAt: Date;
	expiresAt: Date;
	isArchived: boolean;
	isExpired: boolean;
	totalSizeBytes: number;
	visibility: 'public' | 'network' | 'followers' | 'private' | 'group';
	groupId: string | null;
}

export interface UserMediaMessageItem {
	id: string;
	chatId: string;
	chatTitle: string;
	mediaUrl: string;
	mediaType: 'image' | 'video' | 'file' | 'audio';
	mediaName: string | null;
	content: string | null;
	createdAt: Date;
	totalSizeBytes: number;
}

export interface UserMediaIconSetItem {
	id: string;
	name: string;
	iconCount: number;
	totalSizeBytes: number;
	createdAt: Date;
}

export interface UserMediaEmojiSetItem {
	id: string;
	name: string;
	emojiCount: number;
	totalSizeBytes: number;
	createdAt: Date;
}

export interface ServerAppStorageStats {
	totalAppBytes: number;
	freeDiskBytes: number;
	totalDiskBytes: number;
	uploadsCount: number;
}

export interface UserMediaUsage {
	totalBytes: number;
	quotaBytes: number;
	posts: UserMediaPostItem[];
	stories: UserMediaStoryItem[];
	messages: UserMediaMessageItem[];
	iconSets: UserMediaIconSetItem[];
	emojiSets: UserMediaEmojiSetItem[];
	serverStats?: ServerAppStorageStats;
}

/**
 * Calcule les statistiques d'espace disque et de stockage de l'application sur le serveur
 */
export async function getServerAppStorageStats(): Promise<ServerAppStorageStats> {
	try {
		await fs.mkdir(UPLOAD_DIR, { recursive: true });
		const files = await fs.readdir(UPLOAD_DIR);
		let totalAppBytes = 0;
		let uploadsCount = 0;

		for (const file of files) {
			if (file.startsWith('.') || file.startsWith('temp_')) continue;
			try {
				const s = await fs.stat(path.join(UPLOAD_DIR, file));
				if (s.isFile()) {
					totalAppBytes += s.size;
					uploadsCount++;
				}
			} catch {
				// ignore
			}
		}

		let freeDiskBytes = 0;
		let totalDiskBytes = 0;
		try {
			const statFs = await fs.statfs(UPLOAD_DIR);
			freeDiskBytes = statFs.bavail * statFs.bsize;
			totalDiskBytes = statFs.blocks * statFs.bsize;
		} catch {
			// ignore
		}

		return {
			totalAppBytes,
			freeDiskBytes,
			totalDiskBytes,
			uploadsCount
		};
	} catch (err) {
		console.error('Erreur getServerAppStorageStats:', err);
		return {
			totalAppBytes: 0,
			freeDiskBytes: 0,
			totalDiskBytes: 0,
			uploadsCount: 0
		};
	}
}

/**
 * Calcule l'utilisation de stockage totale d'un utilisateur et détaille ses posts et stories avec médias
 */
export async function getUserMediaUsage(userId: string): Promise<UserMediaUsage> {
	const currentUser = await db.query.user.findFirst({
		where: eq(user.id, userId),
		columns: { storageQuotaBytes: true }
	});
	const settings = await getInstanceSettings();
	const quotaBytes =
		currentUser?.storageQuotaBytes ?? settings.mediaSettings.defaultStorageQuotaBytes;

	const userPosts = await db.query.posts.findMany({
		where: eq(posts.authorId, userId),
		columns: {
			id: true,
			content: true,
			mediaUrls: true,
			createdAt: true,
			postType: true
		},
		orderBy: (postsTable, { desc }) => [desc(postsTable.createdAt)]
	});

	let totalUserBytes = 0;
	const mediaPosts: UserMediaPostItem[] = [];

	for (const post of userPosts) {
		const items = (post.mediaUrls as CarouselItem[] | null) || [];
		const mediaItems = items.filter((it) => it.type === 'image' || it.type === 'video');

		if (mediaItems.length === 0) continue;

		let postSizeBytes = 0;
		let firstThumbnail: string | null = null;

		for (const item of mediaItems) {
			const size = await getMediaFileSize(item.content);
			postSizeBytes += size;
			if (!firstThumbnail && item.content) {
				firstThumbnail = item.content;
			}
		}

		totalUserBytes += postSizeBytes;

		mediaPosts.push({
			id: post.id,
			content: post.content,
			createdAt: post.createdAt,
			mediaCount: mediaItems.length,
			totalSizeBytes: postSizeBytes,
			thumbnail: firstThumbnail,
			postType: post.postType
		});
	}

	// Récupération des stories de l'utilisateur (actives et archivées)
	const userStories = await db.query.stories.findMany({
		where: eq(stories.authorId, userId),
		orderBy: (storiesTable, { desc }) => [desc(storiesTable.createdAt)]
	});

	const mediaStories: UserMediaStoryItem[] = [];
	const now = new Date();

	for (const story of userStories) {
		const size = await getMediaFileSize(story.mediaUrl);
		totalUserBytes += size;
		const isExpired = story.expiresAt < now;

		mediaStories.push({
			id: story.id,
			mediaUrl: story.mediaUrl,
			mediaType: story.mediaType as 'image' | 'video',
			caption: story.caption,
			createdAt: story.createdAt,
			expiresAt: story.expiresAt,
			isArchived: story.isArchived ?? true,
			isExpired,
			totalSizeBytes: size,
			visibility: story.visibility as 'public' | 'network' | 'followers' | 'private' | 'group',
			groupId: story.groupId
		});
	}

	// Récupération des fichiers envoyés dans les chats par l'utilisateur
	const userChatMessages = await db.query.messages.findMany({
		where: and(eq(messages.senderId, userId), isNotNull(messages.mediaUrl)),
		orderBy: (messagesTable, { desc }) => [desc(messagesTable.createdAt)],
		with: {
			chat: {
				with: {
					participants: {
						with: {
							user: {
								columns: { id: true, name: true, username: true }
							}
						}
					}
				}
			}
		}
	});

	const mediaMessages: UserMediaMessageItem[] = [];

	for (const msg of userChatMessages) {
		const size = msg.mediaSize || (msg.mediaUrl ? await getMediaFileSize(msg.mediaUrl) : 0);
		totalUserBytes += size;

		let chatTitle = msg.chat?.name || '';
		if (!chatTitle && msg.chat?.participants) {
			const others = msg.chat.participants
				.filter((p) => p.userId !== userId)
				.map((p) => p.user?.name || (p.user?.username ? `@${p.user.username}` : ''))
				.filter(Boolean);
			chatTitle = others.join(', ');
		}
		if (!chatTitle) {
			chatTitle = 'Discussion';
		}

		mediaMessages.push({
			id: msg.id,
			chatId: msg.chatId,
			chatTitle,
			mediaUrl: msg.mediaUrl!,
			mediaType: (msg.mediaType as 'image' | 'video' | 'file' | 'audio') || 'file',
			mediaName: msg.mediaName || (msg.mediaUrl ? path.basename(msg.mediaUrl) : 'Fichier'),
			content: msg.content,
			createdAt: msg.createdAt,
			totalSizeBytes: size
		});
	}

	// Récupération des packs d'icônes personnalisés créés par l'utilisateur
	const userIconSets = await db.query.iconSets.findMany({
		where: eq(iconSets.ownerId, userId),
		orderBy: (table, { desc }) => [desc(table.createdAt)]
	});

	const mediaIconSets: UserMediaIconSetItem[] = [];
	for (const set of userIconSets) {
		const iconsMap = (set.icons as Record<string, string>) || {};
		const iconUrls = Object.values(iconsMap);
		let setSizeBytes = 0;
		for (const url of iconUrls) {
			setSizeBytes += await getMediaFileSize(url);
		}
		totalUserBytes += setSizeBytes;
		mediaIconSets.push({
			id: set.id,
			name: set.name,
			iconCount: iconUrls.length,
			totalSizeBytes: setSizeBytes,
			createdAt: set.createdAt
		});
	}

	// Récupération des sets d'emojis créés par l'utilisateur
	const userCustomEmojiSets = await db.query.emojiSets.findMany({
		where: eq(emojiSets.ownerId, userId),
		orderBy: (table, { desc }) => [desc(table.createdAt)]
	});

	const mediaEmojiSets: UserMediaEmojiSetItem[] = [];
	for (const set of userCustomEmojiSets) {
		const emojiList = (set.emojis as Array<{ url: string }>) || [];
		let setSizeBytes = 0;
		for (const em of emojiList) {
			if (em.url) {
				setSizeBytes += await getMediaFileSize(em.url);
			}
		}
		totalUserBytes += setSizeBytes;
		mediaEmojiSets.push({
			id: set.id,
			name: set.name,
			emojiCount: emojiList.length,
			totalSizeBytes: setSizeBytes,
			createdAt: set.createdAt
		});
	}

	return {
		totalBytes: totalUserBytes,
		quotaBytes,
		posts: mediaPosts,
		stories: mediaStories,
		messages: mediaMessages,
		iconSets: mediaIconSets,
		emojiSets: mediaEmojiSets
	};
}
