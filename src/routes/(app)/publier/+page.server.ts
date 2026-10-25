import { fail, redirect, isRedirect } from '@sveltejs/kit';
import { requireSession } from '$lib/server/auth';
import { publishPost } from '$lib/server/posts';
import type { PostVisibility } from '$lib/types';
import type { Actions, PageServerLoad } from './$types';
import { getTrendingTags } from '$lib/server/tags';
import { TRENDING_TAGS_LIMIT } from '$lib/constants';
import { db } from '$lib/server/db';
import { iconSets, emojiSets } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { parseTagsInput } from '$lib/utils/validation';

export const load: PageServerLoad = async ({ parent, url }) => {
	const { sessionUser } = await parent();
	const trendingTags = await getTrendingTags(TRENDING_TAGS_LIMIT, 7, sessionUser.id);

	const initialIconSetId = url.searchParams.get('iconSetId');
	const initialEmojiSetId = url.searchParams.get('emojiSetId');

	let initialIconSet = null;
	if (initialIconSetId) {
		initialIconSet = await db.query.iconSets.findFirst({
			where: and(eq(iconSets.id, initialIconSetId), eq(iconSets.ownerId, sessionUser.id)),
			with: {
				owner: { columns: { id: true, username: true, name: true, image: true } }
			}
		});
	}

	let initialEmojiSet = null;
	if (initialEmojiSetId) {
		initialEmojiSet = await db.query.emojiSets.findFirst({
			where: and(eq(emojiSets.id, initialEmojiSetId), eq(emojiSets.ownerId, sessionUser.id)),
			with: {
				owner: { columns: { id: true, username: true, name: true, image: true } }
			}
		});
	}

	const [userOwnedIconSets, userOwnedEmojiSets] = await Promise.all([
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

	return {
		sessionUser,
		trendingTags,
		initialIconSet,
		initialEmojiSet,
		userOwnedIconSets,
		userOwnedEmojiSets
	};
};

export const actions: Actions = {
	default: async ({ request }) => {
		const session = await requireSession(request);

		try {
			const formData = await request.formData();

			const caption = (formData.get('caption') as string)?.trim() || null;
			const explicitTags = parseTagsInput(formData.get('tags'));
			const visibility = formData.get('visibility') as PostVisibility;
			const groupId = (formData.get('groupId') as string)?.trim() || null;

			const iconSetId = (formData.get('iconSetId') as string)?.trim() || null;
			const emojiSetId = (formData.get('emojiSetId') as string)?.trim() || null;

			const layoutJson = formData.get('layout') as string;
			const layout = JSON.parse(layoutJson || '[]') as Array<
				{ type: 'text'; text: string } | { type: 'media' }
			>;
			const files = formData.getAll('media') as File[];

			await publishPost({
				authorId: session.user.id,
				caption,
				explicitTags,
				visibility,
				groupId,
				layout,
				files,
				iconSetId,
				emojiSetId
			});
		} catch (error) {
			if (isRedirect(error)) throw error;
			const message = (error as Error)?.message || 'Erreur lors de la publication.';
			return fail(400, { success: false, message });
		}

		throw redirect(303, '/flux');
	}
};
