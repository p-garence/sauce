import { json } from '@sveltejs/kit';
import { requireApiSession } from '$lib/server/auth';
import { deleteStory, updateStory } from '$lib/server/stories';
import type { RequestHandler } from './$types';
import type { PostVisibility } from '$lib/types';

export const DELETE: RequestHandler = async ({ params, request }) => {
	const session = await requireApiSession(request);
	const storyId = params.id;

	if (!storyId) {
		return json({ success: false, message: 'ID de story manquant' }, { status: 400 });
	}

	try {
		const deleted = await deleteStory(storyId, session.user.id);
		if (!deleted) {
			return json(
				{ success: false, message: 'Story introuvable ou non autorisé' },
				{ status: 403 }
			);
		}
		return json({ success: true });
	} catch (err) {
		console.error('Erreur DELETE /api/stories/[id]:', err);
		return json({ success: false }, { status: 500 });
	}
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	const session = await requireApiSession(request);
	const storyId = params.id;

	if (!storyId) {
		return json({ success: false, message: 'ID de story manquant' }, { status: 400 });
	}

	try {
		const body = await request.json();
		const { visibility, groupId, isArchived, duration, customHours, expiresAt } = body;

		const allowedVisibilities: PostVisibility[] = [
			'public',
			'network',
			'followers',
			'private',
			'group'
		];
		const validVisibility =
			visibility && allowedVisibilities.includes(visibility)
				? (visibility as PostVisibility)
				: undefined;

		const validDurations = ['24h', '48h', 'custom', 'never', 'keep'] as const;
		type StoryDuration = (typeof validDurations)[number];
		const validDuration =
			duration && validDurations.includes(duration as StoryDuration)
				? (duration as StoryDuration)
				: undefined;

		const result = await updateStory(storyId, session.user.id, {
			visibility: validVisibility,
			groupId: groupId !== undefined ? groupId || null : undefined,
			isArchived: typeof isArchived === 'boolean' ? isArchived : undefined,
			duration: validDuration,
			customHours:
				typeof customHours === 'number' && !Number.isNaN(customHours) ? customHours : undefined,
			expiresAt: expiresAt ? new Date(expiresAt) : undefined
		});

		if (!result.success) {
			return json({ success: false, message: result.message }, { status: 400 });
		}

		return json({ success: true, story: result.story });
	} catch (err) {
		console.error('Erreur PATCH /api/stories/[id]:', err);
		return json({ success: false, message: 'Erreur lors de la modification' }, { status: 500 });
	}
};
