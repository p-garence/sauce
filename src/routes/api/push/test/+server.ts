import { json } from '@sveltejs/kit';
import { requireApiSession } from '$lib/server/auth';
import { sendPushNotification } from '$lib/server/push';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const session = await requireApiSession(request);

	await sendPushNotification(session.user.id, {
		title: '🔔 Notification de test',
		body: 'Les notifications Push fonctionnent parfaitement sur votre appareil ! 🎉',
		url: '/parametres',
		tag: 'test-push'
	});

	return json({ success: true, message: 'Notification de test envoyée !' });
};
