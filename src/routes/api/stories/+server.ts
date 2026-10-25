import { json } from '@sveltejs/kit';
import { requireApiSession } from '$lib/server/auth';
import { getStoriesFeed, createStory } from '$lib/server/stories';
import type { RequestHandler } from './$types';
import type { PostVisibility } from '$lib/types';

export const GET: RequestHandler = async ({ request }) => {
	const session = await requireApiSession(request);
	try {
		const bundles = await getStoriesFeed(session.user.id);
		return json({ success: true, bundles });
	} catch (err) {
		console.error('Erreur GET /api/stories:', err);
		return json(
			{ success: false, message: 'Erreur serveur lors de la récupération des stories' },
			{ status: 500 }
		);
	}
};

export const POST: RequestHandler = async ({ request }) => {
	const session = await requireApiSession(request);

	try {
		const formData = await request.formData();
		const file = formData.get('file') as File | null;

		if (!file) {
			return json({ success: false, message: 'Fichier média manquant' }, { status: 400 });
		}

		const caption = (formData.get('caption') as string) || '';
		const visibility = ((formData.get('visibility') as string) || 'public') as PostVisibility;
		const groupId = (formData.get('groupId') as string) || undefined;
		const duration = (formData.get('duration') as '24h' | '48h' | 'custom' | 'never') || '24h';
		const customHours = formData.get('customHours')
			? Number(formData.get('customHours'))
			: undefined;
		const isArchived = formData.get('isArchived') !== 'false';

		const story = await createStory({
			authorId: session.user.id,
			file,
			caption,
			visibility,
			groupId,
			duration,
			customHours,
			isArchived
		});

		return json({ success: true, story });
	} catch (err) {
		console.error('Erreur POST /api/stories:', err);
		return json(
			{ success: false, message: 'Erreur lors de la création de la story' },
			{ status: 500 }
		);
	}
};
