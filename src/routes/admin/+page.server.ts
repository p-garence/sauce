/**
 * @module routes/admin/+page.server
 * @description Contrôleur serveur de la console d'administration (gestion utilisateurs, modération, seeding, stockage).
 */

import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { createPost } from '$lib/server/posts';
import {
	assertAdmin,
	ensureSystemUser,
	getAdminUsers,
	getAdminPosts,
	getAdminStories,
	getAdminStats,
	toggleUserBan,
	updateUserRole,
	deleteUserByAdmin,
	updateUserNameByAdmin,
	addInvitesToUser,
	updateUserQuota,
	deletePostByAdmin,
	deleteStoryByAdmin,
	seedTestPosts,
	seedInviteKeys,
	seedTestUsers
} from '$lib/server/admin';
import {
	getOrphanMedia,
	deleteOrphanMedia,
	getServerAppStorageStats,
	saveUploadedFile,
	deleteMediaFiles,
	getUserMediaUsage,
	formatBytes
} from '$lib/server/media';
import { encodeCursor } from '$lib/server/cursor';
import { db } from '$lib/server/db';
import { iconSets, emojiSets } from '$lib/server/db/schema';
import { broadcastSystemNotification } from '$lib/server/notifications';
import { getTrendingTags } from '$lib/server/tags';
import { TRENDING_TAGS_LIMIT, ADMIN_ITEMS_PER_PAGE } from '$lib/constants';
import type { CarouselItem } from '$lib/types';
import { eq, and, desc } from 'drizzle-orm';
import { getInstanceSettings } from '$lib/server/instanceSettings';

function getErrorMessage(err: unknown): string {
	return err instanceof Error ? err.message : 'Une erreur est survenue';
}

export const load: PageServerLoad = async ({ locals }) => {
	assertAdmin(locals.user);
	const [
		allUsers,
		postsData,
		storiesData,
		stats,
		orphanStats,
		serverStorage,
		trendingTags,
		instanceSettingsData,
		publishedIconSets,
		publishedEmojiSets
	] = await Promise.all([
		getAdminUsers(),
		getAdminPosts({ limit: ADMIN_ITEMS_PER_PAGE, adminUserId: locals.user?.id }),
		getAdminStories({ limit: ADMIN_ITEMS_PER_PAGE, adminUserId: locals.user?.id }),
		getAdminStats(),
		getOrphanMedia(),
		getServerAppStorageStats(),
		getTrendingTags(TRENDING_TAGS_LIMIT, 7, locals.user?.id),
		getInstanceSettings(),
		db.query.iconSets.findMany({
			where: and(eq(iconSets.isPublished, true), eq(iconSets.isDeletedByOwner, false)),
			with: {
				owner: {
					columns: { id: true, username: true, name: true, image: true }
				}
			},
			orderBy: [desc(iconSets.createdAt)]
		}),
		db.query.emojiSets.findMany({
			where: and(eq(emojiSets.isPublished, true), eq(emojiSets.isDeletedByOwner, false)),
			with: {
				owner: {
					columns: { id: true, username: true, name: true, image: true }
				}
			},
			orderBy: [desc(emojiSets.createdAt)]
		})
	]);
	return {
		users: allUsers,
		posts: postsData.posts,
		postsCursor: encodeCursor(postsData.nextCursor),
		stories: storiesData.stories,
		storiesCursor: encodeCursor(storiesData.nextCursor),
		stats,
		orphans: orphanStats,
		serverStorage,
		trendingTags,
		instanceSettings: instanceSettingsData,
		publishedIconSets,
		publishedEmojiSets
	};
};

export const actions: Actions = {
	toggleBan: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') return fail(403);
		const formData = await request.formData();
		const targetId = formData.get('userId') as string;
		const currentBanStatus = formData.get('isBanned') === 'true';

		try {
			await toggleUserBan(locals.user.id, targetId, !currentBanStatus);
			return { success: true };
		} catch (err: unknown) {
			return fail(400, { message: getErrorMessage(err) });
		}
	},

	generatePosts: async ({ locals }) => {
		if (!locals.user || locals.user.role !== 'admin') return fail(403);

		try {
			const count = await seedTestPosts(locals.user.id, 30);
			return { success: true, message: `${count} posts générés pour l'utilisateur !` };
		} catch (error) {
			console.error('Erreur génération posts:', error);
			return fail(500, { success: false, message: 'Erreur lors de la génération' });
		}
	},

	makeAdmin: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') return fail(403);
		const formData = await request.formData();
		const targetId = formData.get('userId') as string;

		try {
			await updateUserRole(locals.user.id, targetId, 'admin');
			return { success: true };
		} catch (err: unknown) {
			return fail(400, { message: getErrorMessage(err) });
		}
	},

	deleteUser: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') return fail(403);
		const formData = await request.formData();
		const targetId = formData.get('userId') as string;

		try {
			await deleteUserByAdmin(locals.user.id, targetId);
			return { success: true };
		} catch (err: unknown) {
			return fail(400, { message: getErrorMessage(err) });
		}
	},

	updateName: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') return fail(403);
		const formData = await request.formData();
		const targetId = formData.get('userId') as string;
		const newName = formData.get('newName') as string;

		try {
			await updateUserNameByAdmin(locals.user.id, targetId, newName);
			return { success: true };
		} catch (err: unknown) {
			return fail(400, { message: getErrorMessage(err) });
		}
	},

	addInvites: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') return fail(403);
		const formData = await request.formData();
		const targetId = formData.get('userId') as string;

		try {
			await addInvitesToUser(locals.user.id, targetId, 5);
			return { success: true };
		} catch (err: unknown) {
			return fail(400, { message: getErrorMessage(err) });
		}
	},

	updateQuota: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') return fail(403);
		const formData = await request.formData();
		const targetId = formData.get('userId') as string;
		const quotaGB = parseFloat(formData.get('quotaGB') as string);

		if (isNaN(quotaGB) || quotaGB < 0) {
			return fail(400, { message: 'Quota en Go invalide.' });
		}

		const quotaBytes = Math.round(quotaGB * 1024 * 1024 * 1024);

		try {
			await updateUserQuota(locals.user.id, targetId, quotaBytes);
			return { success: true };
		} catch (err: unknown) {
			return fail(400, { message: getErrorMessage(err) });
		}
	},

	cleanupOrphans: async ({ locals }) => {
		if (!locals.user || locals.user.role !== 'admin') return fail(403);

		try {
			const result = await deleteOrphanMedia();
			return { success: true, ...result };
		} catch (err: unknown) {
			return fail(400, { message: getErrorMessage(err) });
		}
	},

	deletePost: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') return fail(403);
		const formData = await request.formData();
		const postId = formData.get('postId') as string;

		try {
			await deletePostByAdmin(locals.user.id, postId);
			return { success: true };
		} catch (err: unknown) {
			return fail(400, { message: getErrorMessage(err) });
		}
	},

	deleteStory: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') return fail(403);
		const formData = await request.formData();
		const storyId = formData.get('storyId') as string;

		try {
			await deleteStoryByAdmin(locals.user.id, storyId);
			return { success: true };
		} catch (err: unknown) {
			return fail(400, { message: getErrorMessage(err) });
		}
	},

	generateKeys: async ({ locals }) => {
		if (!locals.user || locals.user.role !== 'admin') return fail(403);
		try {
			const keys = await seedInviteKeys(locals.user.id, 10);
			return { success: true, message: `${keys.length} clés d’invitation générées !` };
		} catch (err: unknown) {
			return fail(500, { message: getErrorMessage(err) });
		}
	},

	generateUsers: async ({ locals }) => {
		if (!locals.user || locals.user.role !== 'admin') return fail(403);
		try {
			const count = await seedTestUsers(30);
			return { success: true, message: `${count} utilisateurs de test créés avec succès !` };
		} catch (err: unknown) {
			console.error('Erreur génération utilisateurs:', err);
			return fail(500, { message: getErrorMessage(err) });
		}
	},

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
