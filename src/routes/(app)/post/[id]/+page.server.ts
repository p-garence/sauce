import { error } from '@sveltejs/kit';
import { getPostById } from '$lib/server/posts';
import { isValidUuid } from '$lib/utils/validation';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, parent }) => {
	if (!isValidUuid(params.id)) {
		throw error(404, "Post introuvable ou vous n'avez pas les droits pour le voir.");
	}

	const { sessionUser } = await parent();
	const post = await getPostById(params.id, sessionUser?.id ?? null);

	if (!post) {
		throw error(404, "Post introuvable ou vous n'avez pas les droits pour le voir.");
	}

	return {
		post
	};
};
