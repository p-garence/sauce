import { json } from '@sveltejs/kit';
import { requireApiAdmin } from '$lib/server/auth';
import { getAdminStories } from '$lib/server/admin';
import { decodeCursor, encodeCursor } from '$lib/server/cursor';
import { ADMIN_ITEMS_PER_PAGE, MAX_ADMIN_ITEMS_PER_REQUEST, clampLimit } from '$lib/constants';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, url }) => {
	const session = await requireApiAdmin(request);

	const cursorStr = url.searchParams.get('cursor');
	const cursorData = decodeCursor(cursorStr);
	const limit = clampLimit(
		url.searchParams.get('limit'),
		ADMIN_ITEMS_PER_PAGE,
		MAX_ADMIN_ITEMS_PER_REQUEST
	);

	try {
		const result = await getAdminStories({
			limit,
			cursor: cursorData,
			adminUserId: session.user.id
		});

		return json({
			stories: result.stories,
			nextCursor: encodeCursor(result.nextCursor)
		});
	} catch (error) {
		console.error('Erreur get admin stories:', error);
		return json({ error: 'Erreur serveur' }, { status: 500 });
	}
};
