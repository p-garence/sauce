import { json } from '@sveltejs/kit';
import { requireApiSession } from '$lib/server/auth';
import { deleteChatMessage, updateChatMessage } from '$lib/server/chat';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ params, request }) => {
	const session = await requireApiSession(request);
	const messageId = params.id;

	if (!messageId) {
		return json({ success: false, message: 'ID de message manquant' }, { status: 400 });
	}

	try {
		const body = await request.json().catch(() => ({}));
		const content = typeof body.content === 'string' ? body.content : '';
		const updatedMessage = await updateChatMessage(messageId, session.user.id, content);
		return json({ success: true, message: updatedMessage });
	} catch (err: unknown) {
		console.error('Erreur PATCH /api/chat/messages/[id]:', err);
		const message = err instanceof Error ? err.message : 'Erreur lors de la modification';
		return json({ success: false, message }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, request }) => {
	const session = await requireApiSession(request);
	const messageId = params.id;

	if (!messageId) {
		return json({ success: false, message: 'ID de message manquant' }, { status: 400 });
	}

	try {
		const deletedMessage = await deleteChatMessage(messageId, session.user.id);
		return json({ success: true, message: deletedMessage });
	} catch (err: unknown) {
		console.error('Erreur DELETE /api/chat/messages/[id]:', err);
		const message = err instanceof Error ? err.message : 'Erreur lors de la suppression';
		return json({ success: false, message }, { status: 500 });
	}
};
