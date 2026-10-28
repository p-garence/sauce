/**
 * @module routes/admin/settings/+page.server
 * @description Contrôleur serveur pour la gestion dynamique des paramètres et constantes de l'instance.
 */

import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { assertAdmin } from '$lib/server/admin';
import {
	getInstanceSettings,
	updateInstanceSettingsSection,
	setInstancePublicStatus
} from '$lib/server/instanceSettings';
import type {
	InstancePrivacySettings,
	InstancePerformanceSettings,
	InstanceMediaSettings,
	InstanceContentDefaults,
	FeedSource,
	FeedSortMode,
	FeedTimeWindow
} from '$lib/types';
import { VALID_FEED_SOURCES, VALID_FEED_SORT_MODES, VALID_FEED_TIME_WINDOWS } from '$lib/constants';

export const load: PageServerLoad = async ({ locals }) => {
	assertAdmin(locals.user);
	const instanceSettings = await getInstanceSettings();

	return {
		instanceSettings
	};
};

export const actions: Actions = {
	savePrivacy: async ({ request, locals }) => {
		assertAdmin(locals.user);
		const form = await request.formData();

		try {
			const current = (await getInstanceSettings()).privacySettings;
			const defaultPostVis = form.get('defaultPostVisibility') as string;
			const defaultStoryVis = form.get('defaultStoryVisibility') as string;

			const allowedVis: Array<'public' | 'network' | 'followers' | 'private'> =
				current.isPublicInstance
					? ['public', 'network', 'followers', 'private']
					: ['network', 'followers', 'private'];

			const newPrivacy: InstancePrivacySettings = {
				...current,
				defaultPostVisibility: (allowedVis as string[]).includes(defaultPostVis)
					? (defaultPostVis as 'public' | 'network' | 'followers' | 'private')
					: current.isPublicInstance
						? 'public'
						: 'followers',
				defaultStoryVisibility: (allowedVis as string[]).includes(defaultStoryVis)
					? (defaultStoryVis as 'public' | 'network' | 'followers' | 'private')
					: current.isPublicInstance
						? 'public'
						: 'followers',
				defaultRequireFollowRequest: form.get('defaultRequireFollowRequest') === 'on',
				defaultRequireMessageApproval: form.get('defaultRequireMessageApproval') === 'on',
				defaultShowFollowers: form.get('defaultShowFollowers') === 'on',
				defaultShowFollowing: form.get('defaultShowFollowing') === 'on'
			};

			await updateInstanceSettingsSection('privacySettings', newPrivacy);
			return { success: true, message: 'Paramètres de confidentialité enregistrés.' };
		} catch (err) {
			console.error('Erreur savePrivacy:', err);
			return fail(400, { message: 'Impossible d’enregistrer les paramètres de confidentialité.' });
		}
	},

	savePerformance: async ({ request, locals }) => {
		assertAdmin(locals.user);
		const form = await request.formData();

		try {
			const current = (await getInstanceSettings()).performanceSettings;

			const parseNum = (key: string, min: number, max: number, fallback: number) => {
				const raw = form.get(key);
				if (raw === null || raw === '') return fallback;
				const val = parseInt(raw as string, 10);
				return Number.isNaN(val) ? fallback : Math.max(min, Math.min(max, val));
			};

			const newPerformance: InstancePerformanceSettings = {
				postsPerScroll: parseNum('postsPerScroll', 1, 50, current.postsPerScroll),
				postsPerGrid: parseNum('postsPerGrid', 1, 50, current.postsPerGrid),
				trendingTagsLimit: parseNum('trendingTagsLimit', 1, 50, current.trendingTagsLimit),
				messagesPerChat: parseNum('messagesPerChat', 5, 100, current.messagesPerChat),
				notificationsPerLoad: parseNum('notificationsPerLoad', 5, 50, current.notificationsPerLoad),
				commentsPerLoad: parseNum('commentsPerLoad', 1, 50, current.commentsPerLoad),
				usersPerPage: parseNum('usersPerPage', 1, 50, current.usersPerPage),
				adminItemsPerPage: parseNum('adminItemsPerPage', 5, 100, current.adminItemsPerPage),
				maxPostsPerRequest: parseNum('maxPostsPerRequest', 10, 100, current.maxPostsPerRequest),
				maxCommentsPerRequest: parseNum(
					'maxCommentsPerRequest',
					10,
					100,
					current.maxCommentsPerRequest
				),
				maxCommentLength: parseNum('maxCommentLength', 100, 10000, current.maxCommentLength),
				maxUsersSearchLimit: parseNum('maxUsersSearchLimit', 5, 100, current.maxUsersSearchLimit)
			};

			await updateInstanceSettingsSection('performanceSettings', newPerformance);
			return { success: true, message: 'Paramètres de performance enregistrés.' };
		} catch (err) {
			console.error('Erreur savePerformance:', err);
			return fail(400, { message: 'Impossible d’enregistrer les paramètres de performance.' });
		}
	},

	saveMedia: async ({ request, locals }) => {
		assertAdmin(locals.user);
		const form = await request.formData();

		try {
			const current = (await getInstanceSettings()).mediaSettings;

			const rawMax = form.get('maxMediaSizeMb');
			const maxMediaSizeMb =
				rawMax !== null && rawMax !== ''
					? Math.max(1, Math.min(5000, parseInt(rawMax as string, 10) || current.maxMediaSizeMb))
					: current.maxMediaSizeMb;

			const rawQuota = form.get('defaultStorageQuotaGb');
			const quotaGb = rawQuota !== null && rawQuota !== '' ? parseFloat(rawQuota as string) : NaN;
			const defaultStorageQuotaBytes =
				!Number.isNaN(quotaGb) && quotaGb > 0
					? Math.round(quotaGb * 1024 * 1024 * 1024)
					: current.defaultStorageQuotaBytes;

			const rawOrphan = form.get('orphanGracePeriodHours');
			const orphanGracePeriodHours =
				rawOrphan !== null && rawOrphan !== ''
					? Math.max(
							1,
							Math.min(168, parseInt(rawOrphan as string, 10) || current.orphanGracePeriodHours)
						)
					: current.orphanGracePeriodHours;

			const rawStory = form.get('storyDurationHours');
			const storyDurationHours =
				rawStory !== null && rawStory !== ''
					? Math.max(
							1,
							Math.min(168, parseInt(rawStory as string, 10) || current.storyDurationHours)
						)
					: current.storyDurationHours;

			const newMedia: InstanceMediaSettings = {
				maxMediaSizeMb,
				defaultStorageQuotaBytes,
				orphanGracePeriodHours,
				storyDurationHours
			};

			await updateInstanceSettingsSection('mediaSettings', newMedia);
			return { success: true, message: 'Paramètres multimédias enregistrés.' };
		} catch (err) {
			console.error('Erreur saveMedia:', err);
			return fail(400, { message: 'Impossible d’enregistrer les paramètres multimédias.' });
		}
	},

	saveDefaults: async ({ request, locals }) => {
		assertAdmin(locals.user);
		const form = await request.formData();

		try {
			const current = (await getInstanceSettings()).contentDefaults;

			const rawInvites = form.get('defaultMaxInvites');
			const defaultMaxInvites =
				rawInvites !== null && rawInvites !== ''
					? Math.max(
							0,
							Math.min(500, parseInt(rawInvites as string, 10) || current.defaultMaxInvites)
						)
					: current.defaultMaxInvites;

			let defaultGroups = current.defaultGroups;
			const groupsJson = form.get('groupsJson') as string;
			if (groupsJson) {
				try {
					const parsed = JSON.parse(groupsJson);
					if (Array.isArray(parsed) && parsed.length > 0) {
						defaultGroups = parsed
							.filter((g) => g && typeof g.name === 'string' && g.name.trim().length > 0)
							.map((g) => ({
								name: g.name.trim(),
								color:
									typeof g.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(g.color)
										? g.color
										: '#10b981'
							}));
					}
				} catch {
					// Conservation de defaultGroups existants
				}
			}

			let defaultFeeds = current.defaultFeeds;
			const feedsJson = form.get('feedsJson') as string;
			if (feedsJson) {
				try {
					const parsed = JSON.parse(feedsJson);
					if (Array.isArray(parsed) && parsed.length > 0) {
						defaultFeeds = parsed
							.filter((f) => f && typeof f.name === 'string' && f.name.trim().length > 0)
							.map((f) => ({
								name: f.name.trim(),
								source: (VALID_FEED_SOURCES as readonly string[]).includes(f.source)
									? (f.source as FeedSource)
									: 'public',
								sortMode: (VALID_FEED_SORT_MODES as readonly string[]).includes(f.sortMode)
									? (f.sortMode as FeedSortMode)
									: 'chrono',
								timeWindow: (VALID_FEED_TIME_WINDOWS as readonly string[]).includes(f.timeWindow)
									? (f.timeWindow as FeedTimeWindow)
									: '7d'
							}));
					}
				} catch {
					// Conservation de defaultFeeds existants
				}
			}

			const newDefaults: InstanceContentDefaults = {
				defaultGroups:
					defaultGroups.length > 0 ? defaultGroups : [{ name: 'Amis proches', color: '#10b981' }],
				defaultFeeds:
					defaultFeeds.length > 0
						? defaultFeeds
						: [
								{
									name: 'Chronologique',
									source: 'public',
									sortMode: 'chrono',
									timeWindow: '7d'
								}
							],
				defaultMaxInvites
			};

			await updateInstanceSettingsSection('contentDefaults', newDefaults);
			return { success: true, message: 'Contenus par défaut enregistrés.' };
		} catch (err) {
			console.error('Erreur saveDefaults:', err);
			return fail(400, { message: 'Impossible d’enregistrer les contenus par défaut.' });
		}
	},

	toggleInstanceMode: async ({ request, locals }) => {
		assertAdmin(locals.user);
		const form = await request.formData();

		try {
			const isPublic = form.get('isPublic') === 'true';
			await setInstancePublicStatus(isPublic);

			return {
				success: true,
				message: isPublic
					? 'L’instance est désormais configurée en mode Public. Les utilisateurs ont été notifiés.'
					: 'L’instance est désormais configurée en mode Privé. Les utilisateurs ont été notifiés.'
			};
		} catch (err) {
			console.error('Erreur toggleInstanceMode:', err);
			return fail(400, { message: 'Impossible de modifier le statut de l’instance.' });
		}
	}
};
