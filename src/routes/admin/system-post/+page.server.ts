/**
 * @module routes/admin/system-post/+page.server
 * @description Contrôleur serveur pour la composition et la publication d'un post système avec notification push globale.
 */

import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { assertAdmin, ensureSystemUser } from '$lib/server/admin';
import { createPost } from '$lib/server/posts';
import {
	saveUploadedFile,
	deleteMediaFiles,
	getUserMediaUsage,
	formatBytes
} from '$lib/server/media';
import { broadcastSystemNotification } from '$lib/server/notifications';
import { getTrendingTags } from '$lib/server/tags';
import { TRENDING_TAGS_LIMIT } from '$lib/constants';
import type { CarouselItem } from '$lib/types';

function getErrorMessage(err: unknown): string {
	return err instanceof Error ? err.message : 'Une erreur est survenue';
}

export const load: PageServerLoad = async ({ locals }) => {
	assertAdmin(locals.user);
	const trendingTags = await getTrendingTags(TRENDING_TAGS_LIMIT, 7, locals.user?.id);
	return {
		trendingTags
	};
};

export const actions: Actions = {
	createSystemPost: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') return fail(403);

		try {
			const formData = await request.formData();

			// 1. Message de notification
			const notificationMessage = (formData.get('notificationMessage') as string)?.trim();
			if (!notificationMessage) {
				return fail(400, {
					success: false,
					message: 'Le message de la notification est obligatoire.'
				});
			}

			// 2. Légende & tags
			const caption = (formData.get('caption') as string)?.trim() || null;
			const tagsJson = formData.get('tags') as string;
			let explicitTags: string[] = [];
			if (tagsJson) {
				try {
					explicitTags = JSON.parse(tagsJson);
				} catch {
					explicitTags = tagsJson
						.split(',')
						.map((t) => t.trim())
						.filter(Boolean);
				}
			}

			// 3. Structure du carrousel et fichiers
			const layoutJson = formData.get('layout') as string;
			const layout = JSON.parse(layoutJson || '[]') as Array<
				{ type: 'text'; text: string } | { type: 'media' }
			>;
			const files = formData.getAll('media') as File[];

			if (layout.length === 0) {
				return fail(400, { success: false, message: 'Le post ne peut pas être vide.' });
			}

			// Vérification du quota
			const incomingSize = files.reduce((acc, f) => acc + (f.size || 0), 0);
			const usage = await getUserMediaUsage(locals.user.id);
			if (usage.totalBytes + incomingSize > usage.quotaBytes) {
				const remaining = Math.max(0, usage.quotaBytes - usage.totalBytes);
				return fail(413, {
					success: false,
					message: `Quota de stockage dépassé. Espace restant : ${formatBytes(remaining)}.`
				});
			}

			// 4. Traitement des médias et sauvegarde
			const finalCarousel: CarouselItem[] = [];
			let fileIndex = 0;

			try {
				for (const item of layout) {
					if (item.type === 'text') {
						finalCarousel.push({ type: 'text', content: item.text });
					} else if (item.type === 'media') {
						const file = files[fileIndex++];
						if (!file || file.size === 0) continue;

						const saved = await saveUploadedFile(file);
						finalCarousel.push(saved);
					}
				}

				const systemUser = await ensureSystemUser();
				const newPost = await createPost({
					authorId: systemUser.id,
					content: caption,
					mediaUrls: finalCarousel,
					visibility: 'public',
					tags: explicitTags,
					isSystem: true
				});

				// Diffuser la notification à tous les utilisateurs
				await broadcastSystemNotification({
					postId: newPost.id,
					message: notificationMessage
				});

				return { success: true, postId: newPost.id };
			} catch (err) {
				await deleteMediaFiles(finalCarousel);
				throw err;
			}
		} catch (err: unknown) {
			console.error('Erreur création post système:', err);
			return fail(500, { success: false, message: getErrorMessage(err) });
		}
	}
};
