import { fail, error } from '@sveltejs/kit';
import { requireSession } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { posts, iconSets, emojiSets } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { getTagsForPosts, getTrendingTags } from '$lib/server/tags';
import { TRENDING_TAGS_LIMIT } from '$lib/constants';
import type { PageServerLoad, Actions } from './$types';
import type { CarouselItem } from '$lib/types';
import { isValidUuid, parseTagsInput } from '$lib/utils/validation';
import { updatePublishedPost } from '$lib/server/posts';

export const load: PageServerLoad = async ({ params, parent }) => {
	if (!isValidUuid(params.id)) {
		throw error(404, 'Post introuvable');
	}

	const { sessionUser } = await parent();

	const [post, userOwnedIconSets, userOwnedEmojiSets] = await Promise.all([
		db.query.posts.findFirst({
			where: eq(posts.id, params.id),
			with: {
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
		}),
		db.query.iconSets.findMany({
			where: and(eq(iconSets.ownerId, sessionUser.id), eq(iconSets.isDeletedByOwner, false)),
			with: {
				owner: { columns: { id: true, username: true, name: true, image: true } }
			}
		}),
		db.query.emojiSets.findMany({
			where: and(eq(emojiSets.ownerId, sessionUser.id), eq(emojiSets.isDeletedByOwner, false)),
			with: {
				owner: { columns: { id: true, username: true, name: true, image: true } }
			}
		})
	]);

	if (!post) throw error(404, 'Post introuvable');
	if (post.authorId !== sessionUser.id) throw error(403, 'Accès refusé');

	const tagsMap = await getTagsForPosts([post.id]);
	const trendingTags = await getTrendingTags(TRENDING_TAGS_LIMIT, 7, sessionUser.id);

	return {
		post: {
			id: post.id,
			content: post.content || '',
			postType: post.postType,
			mediaUrls: (post.mediaUrls as CarouselItem[] | null) || [],
			visibility: post.visibility,
			groupId: post.groupId,
			iconSetId: post.iconSetId,
			emojiSetId: post.emojiSetId,
			iconSet: post.iconSet,
			emojiSet: post.emojiSet,
			tags: tagsMap[post.id] || []
		},
		trendingTags,
		userOwnedIconSets,
		userOwnedEmojiSets
	};
};

export const actions: Actions = {
	default: async ({ request, params }) => {
		const postId = params.id;
		if (!isValidUuid(postId)) {
			return fail(404, { message: 'Post introuvable' });
		}

		const session = await requireSession(request);
		const formData = await request.formData();

		const caption = (formData.get('caption') as string)?.trim() || null;
		const explicitTags = parseTagsInput(formData.get('tags'));
		const rawIconSetId = (formData.get('iconSetId') as string)?.trim() || null;
		const rawEmojiSetId = (formData.get('emojiSetId') as string)?.trim() || null;
		const rawVisibility = formData.get('visibility') as string;
		const rawGroupId = (formData.get('groupId') as string)?.trim() || null;

		const layoutJson = formData.get('layout') as string;
		let layout = [];
		if (layoutJson) {
			try {
				layout = JSON.parse(layoutJson);
			} catch {
				return fail(400, { message: 'Données invalides.' });
			}
		}

		const files = formData.getAll('media') as File[];

		try {
			await updatePublishedPost({
				postId,
				authorId: session.user.id,
				caption,
				explicitTags,
				visibility: rawVisibility,
				groupId: rawGroupId,
				layout,
				files,
				iconSetId: rawIconSetId,
				emojiSetId: rawEmojiSetId
			});

			return { success: true };
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde.';
			if (message.includes('Quota')) {
				return fail(413, { message });
			}
			if (message.includes('non autorisé') || message.includes('introuvable')) {
				return fail(403, { message });
			}
			return fail(400, { message });
		}
	}
};
