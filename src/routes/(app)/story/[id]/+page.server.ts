import { error, redirect } from '@sveltejs/kit';
import { getStoryBundleForStory } from '$lib/server/stories';
import { isValidUuid } from '$lib/utils/validation';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, parent }) => {
	const storyId = params.id;

	if (!isValidUuid(storyId)) {
		throw error(404, 'Story introuvable');
	}

	const { sessionUser } = await parent();
	if (!sessionUser) throw redirect(302, '/login');

	const result = await getStoryBundleForStory(storyId, sessionUser.id);

	if (!result.success) {
		if (result.reason === 'expired') {
			return {
				isAvailable: false,
				reason: 'expired',
				message: 'Cette story a expiré.'
			};
		}
		if (result.reason === 'forbidden') {
			return {
				isAvailable: false,
				reason: 'forbidden',
				message: 'Vous n’avez pas accès à cette story privée.'
			};
		}
		throw error(404, 'Story introuvable');
	}

	return {
		isAvailable: true,
		bundle: result.bundle,
		initialStoryIndex: result.initialStoryIndex,
		currentUserId: sessionUser.id
	};
};
