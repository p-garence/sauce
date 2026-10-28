import { json } from '@sveltejs/kit';
import { requireApiAdmin } from '$lib/server/auth';
import { getAdminPosts } from '$lib/server/admin';
import { decodeCursor, encodeCursor } from '$lib/server/cursor';
import { getInstanceSettings } from '$lib/server/instanceSettings';
import { clampLimit } from '$lib/constants';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, url }) => {
	const session = await requireApiAdmin(request);
	const settings = await getInstanceSettings();

	const cursorStr = url.searchParams.get('cursor');
	const cursorData = decodeCursor(cursorStr);
	const limit = clampLimit(
		url.searchParams.get('limit'),
		settings.performanceSettings.adminItemsPerPage,
		settings.performanceSettings.maxPostsPerRequest
	);

	try {
		const result = await getAdminPosts({
			limit,
			cursor: cursorData,
			adminUserId: session.user.id
		});

		return json({
			posts: result.posts,
			nextCursor: encodeCursor(result.nextCursor)
		});
	} catch (error) {
		console.error('Erreur get admin posts:', error);
		return json({ error: 'Erreur serveur' }, { status: 500 });
	}
};
