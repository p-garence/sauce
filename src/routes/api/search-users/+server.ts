import { json } from '@sveltejs/kit';
import { requireApiSession } from '$lib/server/auth';
import type { RequestHandler } from './$types';
import { searchOrGetNetworkUsers } from '$lib/server/users';
import { decodeCursor, encodeCursor } from '$lib/server/cursor';
import { getInstanceSettings } from '$lib/server/instanceSettings';
import { clampLimit } from '$lib/constants';

export const GET: RequestHandler = async ({ request, url }) => {
	const session = await requireApiSession(request);
	const settings = await getInstanceSettings();
	const currentUserId = session.user.id;

	const q = url.searchParams.get('q') || '';
	const cursorStr = url.searchParams.get('cursor');
	const cursor = decodeCursor(cursorStr);
	const limit = clampLimit(
		url.searchParams.get('limit'),
		settings.performanceSettings.usersPerPage,
		settings.performanceSettings.maxUsersSearchLimit
	);

	const excludeParam = url.searchParams.get('exclude') || '';
	const excludeIds = excludeParam
		? excludeParam
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean)
				.slice(0, 100)
		: [];

	const { users, nextCursor } = await searchOrGetNetworkUsers(
		currentUserId,
		q,
		limit,
		cursor,
		excludeIds
	);

	return json({
		users,
		nextCursor: encodeCursor(nextCursor)
	});
};
