import { redirect } from '@sveltejs/kit';
import { requireSession } from '$lib/server/auth';
import { getOrCreateDirectChat } from '$lib/server/chat';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, request }) => {
	const session = await requireSession(request);

	const chatId = await getOrCreateDirectChat(session.user.id, params.username);

	throw redirect(303, `/chat/${chatId}`);
};
