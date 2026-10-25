import { json } from '@sveltejs/kit';
import { requireApiSession } from '$lib/server/auth';
import { assertAdmin } from '$lib/server/admin';
import { getOrphanMedia, deleteOrphanMedia } from '$lib/server/media';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request }) => {
	const session = await requireApiSession(request);
	assertAdmin(session.user);

	const stats = await getOrphanMedia();
	return json(stats);
};

export const DELETE: RequestHandler = async ({ request }) => {
	const session = await requireApiSession(request);
	assertAdmin(session.user);

	let filenames: string[] | undefined;
	try {
		const body = await request.json();
		if (Array.isArray(body?.filenames)) {
			filenames = body.filenames;
		}
	} catch {
		// No JSON body passed -> cleanup all orphans
	}

	const result = await deleteOrphanMedia(filenames);
	return json({ success: true, ...result });
};
