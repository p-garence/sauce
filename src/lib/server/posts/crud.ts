import { and, sql, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	posts,
	postLikes,
	hiddenPosts,
	follows,
	userSavedIconSets,
	userSavedEmojiSets,
	user as userTable
} from '$lib/server/db/schema';
import type {
	CarouselItem,
	PostData,
	PostType,
	PostVisibility,
	IconSet,
	EmojiSet
} from '$lib/types';
import { getTagsForPosts, attachTagsToPost, extractHashtags } from '$lib/server/tags';
import { notifyMentions } from '$lib/server/mentions';
import { canSeePost } from './helpers';

/**
 * Crée un nouveau post en base de données, détermine automatiquement son type
 * (text, image, video, carousel), associe les hashtags détectés et notifie les mentions @username.
 *
 * @param params - Données de création (auteur, contenu, slides médias, visibilité, groupe optionnel, etc.)
 * @returns Le post créé avec son identifiant { id: string }
 */
export async function createPost(params: {
	authorId: string;
	content: string | null;
	mediaUrls: CarouselItem[];
	visibility: PostVisibility;
	groupId?: string | null;
	createdAt?: Date; // Optionnel : utile pour l'admin qui génère des posts dans le passé
	tags?: string[];
	isSystem?: boolean;
	postType?: PostType;
	iconSetId?: string | null;
	emojiSetId?: string | null;
}) {
	const {
		authorId,
		content,
		mediaUrls,
		visibility,
		groupId,
		createdAt,
		tags: explicitTags,
		isSystem,
		iconSetId,
		emojiSetId
	} = params;

	// Détermination automatique du type si non spécifié
	let postType: PostType = params.postType || 'text';
	if (!params.postType) {
		const hasVideo = mediaUrls.some((m) => m.type === 'video');
		const hasImage = mediaUrls.some((m) => m.type === 'image');

		if (mediaUrls.length > 1) {
			postType = 'carousel';
		} else if (hasVideo) {
			postType = 'video';
		} else if (hasImage) {
			postType = 'image';
		}
	}

	// Insertion
	const [newPost] = await db
		.insert(posts)
		.values({
			authorId,
			content,
			mediaUrls,
			postType,
			iconSetId: iconSetId ?? null,
			emojiSetId: emojiSetId ?? null,
			visibility: visibility,
			groupId: visibility === 'group' ? (groupId ?? null) : null,
			isFederated: visibility === 'public',
			isSystem: isSystem ?? false,
			createdAt: createdAt ?? new Date()
		})
		.returning({ id: posts.id });

	// Extraction et association automatique des hashtags
	const textSlides = mediaUrls
		.filter((m) => m.type === 'text')
		.map((m) => m.content)
		.join(' ');
	const combinedText = `${content || ''} ${textSlides}`;
	const extracted = extractHashtags(combinedText);
	const allTags = Array.from(new Set([...extracted, ...(explicitTags || [])]));

	if (allTags.length > 0) {
		await attachTagsToPost(newPost.id, allTags);
	}

	// Notification des mentions @username dans le post
	await notifyMentions({
		actorId: authorId,
		text: combinedText,
		entityId: newPost.id,
		context: 'post'
	});

	return newPost;
}

/**
 * Récupère un post par son identifiant unique UUID en vérifiant les droits d'accès
 * du spectateur (canSeePost), et en agrégeant l'auteur, les tags et les statuts isLiked/isHidden.
 *
 * @param postId - Identifiant UUID du post
 * @param currentUserId - Identifiant optionnel de l'utilisateur qui consulte le post
 * @returns Le post complet PostData ou null si introuvable ou non autorisé
 */
export async function getPostById(
	postId: string,
	currentUserId?: string | null
): Promise<PostData | null> {
	if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(postId)) {
		return null;
	}

	const post = await db.query.posts.findFirst({
		where: and(eq(posts.id, postId), canSeePost(currentUserId)),
		extras: {
			isLiked: currentUserId
				? sql<boolean>`EXISTS (SELECT 1 FROM ${postLikes} pl WHERE pl.post_id = ${posts.id} AND pl.user_id = ${currentUserId})`.as(
						'is_liked'
					)
				: sql<boolean>`false`.as('is_liked'),
			isHidden: currentUserId
				? sql<boolean>`EXISTS (SELECT 1 FROM ${hiddenPosts} hp WHERE hp.post_id = ${posts.id} AND hp.user_id = ${currentUserId})`.as(
						'is_hidden'
					)
				: sql<boolean>`false`.as('is_hidden')
		},
		with: {
			author: { columns: { id: true, username: true, name: true, image: true } },
			iconSet: {
				with: {
					owner: { columns: { id: true, username: true, name: true, image: true } }
				}
			},
			emojiSet: {
				with: {
					owner: { columns: { id: true, username: true, name: true, image: true } }
				}
			}
		}
	});

	if (!post) return null;

	let isFollowing = false;
	if (currentUserId && post.authorId !== currentUserId) {
		const [followCheck] = await db
			.select({ id: follows.followingId })
			.from(follows)
			.where(
				and(
					eq(follows.followerId, currentUserId),
					eq(follows.followingId, post.authorId),
					eq(follows.status, 'accepted')
				)
			);
		isFollowing = !!followCheck;
	}

	const tagsMap = await getTagsForPosts([post.id]);

	let iconSetData: IconSet | null = (post.iconSet as unknown as IconSet) || null;
	if (iconSetData && currentUserId) {
		const [saved, currentUser] = await Promise.all([
			db.query.userSavedIconSets.findFirst({
				where: and(
					eq(userSavedIconSets.userId, currentUserId),
					eq(userSavedIconSets.iconSetId, iconSetData.id)
				)
			}),
			db.query.user.findFirst({
				where: eq(userTable.id, currentUserId),
				columns: { activeIconSetId: true }
			})
		]);
		iconSetData = {
			...iconSetData,
			isSaved: Boolean(saved),
			isActive: currentUser?.activeIconSetId === iconSetData.id
		};
	}

	let emojiSetData: EmojiSet | null = (post.emojiSet as unknown as EmojiSet) || null;
	if (emojiSetData && currentUserId) {
		const [savedEmoji, currentUser] = await Promise.all([
			db.query.userSavedEmojiSets.findFirst({
				where: and(
					eq(userSavedEmojiSets.userId, currentUserId),
					eq(userSavedEmojiSets.emojiSetId, emojiSetData.id)
				)
			}),
			db.query.user.findFirst({
				where: eq(userTable.id, currentUserId),
				columns: { activeEmojiSetId: true, activeEmojiSetIds: true }
			})
		]);
		let activeIds = (currentUser?.activeEmojiSetIds as string[]) || [];
		if (activeIds.length === 0 && currentUser?.activeEmojiSetId) {
			activeIds = [currentUser.activeEmojiSetId];
		}
		emojiSetData = {
			...emojiSetData,
			isSaved: Boolean(savedEmoji),
			isActive: activeIds.includes(emojiSetData.id)
		};
	}

	return {
		id: post.id,
		isSystem: Boolean(post.isSystem),
		author: {
			name: post.isSystem ? 'Le serveur' : post.author.name || 'Utilisateur Inconnu',
			id: post.author.id,
			username: post.isSystem ? 'serveur' : post.author.username || 'Inconnu',
			avatar: post.isSystem ? null : post.author.image,
			isFollowing
		},
		content: post.content,
		postType: post.postType,
		mediaUrls: post.mediaUrls as CarouselItem[] | null,
		iconSetId: post.iconSetId,
		emojiSetId: post.emojiSetId,
		iconSet: iconSetData,
		emojiSet: emojiSetData,
		likesCount: post.likesCount || 0,
		commentsCount: post.commentsCount || 0,
		createdAt: post.createdAt,
		visibility: post.visibility || 'private',
		groupId: post.groupId || null,
		isLiked: Boolean(post.isLiked),
		isHidden: Boolean(post.isHidden),
		tags: tagsMap[post.id] || []
	};
}
