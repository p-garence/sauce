/**
 * @module lib/server/instanceSettings
 * @description Service de gestion et de mise en cache des constantes et paramètres dynamiques de l'instance.
 */

import { db } from '$lib/server/db';
import {
	instanceSettings,
	iconSets,
	emojiSets,
	user as userTable,
	notifications
} from '$lib/server/db/schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import type { EmojiSet, IconSet, InstanceSettingsData } from '$lib/types';
import { getOrSetCached, deleteCached } from '$lib/server/cache';

export type { InstanceSettingsData };

export const DEFAULT_INSTANCE_SETTINGS: InstanceSettingsData = {
	id: 'default',
	allowedBuiltinIconPacks: ['lucide', 'original'],
	allowedCustomIconSetIds: [],
	allowedCustomIconSets: [],
	defaultIconPack: 'lucide',
	defaultIconSetId: null,
	defaultIconSet: null,
	defaultEmojiSetIds: [],
	defaultEmojiSets: [],
	performanceSettings: {
		postsPerScroll: 8,
		postsPerGrid: 9,
		trendingTagsLimit: 10,
		messagesPerChat: 10,
		notificationsPerLoad: 6,
		commentsPerLoad: 5,
		usersPerPage: 5,
		maxPostsPerRequest: 48,
		maxCommentsPerRequest: 50,
		maxCommentLength: 2000,
		maxUsersSearchLimit: 20,
		adminItemsPerPage: 20
	},
	privacySettings: {
		isPublicInstance: true,
		defaultPostVisibility: 'public',
		defaultStoryVisibility: 'public',
		defaultRequireFollowRequest: false,
		defaultRequireMessageApproval: false,
		defaultShowFollowers: true,
		defaultShowFollowing: true
	},
	mediaSettings: {
		maxMediaSizeMb: 1000,
		defaultStorageQuotaBytes: 2 * 1024 * 1024 * 1024, // 2 Go
		orphanGracePeriodHours: 2,
		storyDurationHours: 24
	},
	contentDefaults: {
		defaultGroups: [{ name: 'Amis proches', color: '#10b981' }],
		defaultFeeds: [
			{
				name: 'Chronologique',
				source: 'public',
				sortMode: 'chrono',
				timeWindow: '7d'
			}
		],
		defaultMaxInvites: 10,
		get defaultGroupName() {
			return this.defaultGroups[0]?.name || 'Amis proches';
		},
		get defaultGroupColor() {
			return this.defaultGroups[0]?.color || '#10b981';
		},
		get defaultFeedConfig() {
			return {
				name: this.defaultFeeds[0]?.name || 'Chronologique',
				source: this.defaultFeeds[0]?.source || 'public',
				groupIds: [],
				excludedGroupIds: [],
				contentTypeFilterMode: 'all',
				contentTypes: [],
				carouselContentTypeFilterMode: 'all',
				carouselContentTypes: [],
				tagFilterMode: 'all',
				includeTags: [],
				sortMode: this.defaultFeeds[0]?.sortMode || 'chrono',
				timeWindow: this.defaultFeeds[0]?.timeWindow || '7d',
				hideSeen: false,
				showStories: true,
				blendFeedAId: null,
				blendFeedBId: null,
				blendRatio: 50
			};
		}
	},
	generalSettings: {
		instanceName: 'Sauce et Ail',
		instanceDescription: 'Réseau social auto-hébergé respectueux de la vie privée',
		maintenanceMode: false
	}
};

const CACHE_KEY = 'instance_settings_default';
const CACHE_TTL_SECONDS = 300; // 5 minutes

/**
 * Récupère la configuration globale de l'instance avec mise en cache mémoire (0.001 ms).
 * En cas d'absence de migration en base, renvoie les valeurs par défaut de manière défensive.
 */
export async function getInstanceSettings(): Promise<InstanceSettingsData> {
	return await getOrSetCached(CACHE_KEY, CACHE_TTL_SECONDS, async () => {
		try {
			const row = await db.query.instanceSettings.findFirst({
				where: eq(instanceSettings.id, 'default'),
				with: {
					defaultIconSet: {
						with: {
							owner: {
								columns: { id: true, username: true, name: true, image: true }
							}
						}
					}
				}
			});

			if (!row) {
				return DEFAULT_INSTANCE_SETTINGS;
			}

			const allowedCustomIds = (row.allowedCustomIconSetIds as string[]) || [];
			let allowedCustomIconSets: IconSet[] = [];
			if (allowedCustomIds.length > 0) {
				try {
					allowedCustomIconSets = (await db.query.iconSets.findMany({
						where: and(
							inArray(iconSets.id, allowedCustomIds),
							eq(iconSets.isDeletedByOwner, false)
						),
						with: {
							owner: {
								columns: { id: true, username: true, name: true, image: true }
							}
						}
					})) as unknown as IconSet[];
				} catch (e) {
					console.error('Erreur chargement allowedCustomIconSets:', e);
				}
			}

			const defaultEmojiIds = (row.defaultEmojiSetIds as string[]) || [];
			let defaultEmojiSets: EmojiSet[] = [];
			if (defaultEmojiIds.length > 0) {
				try {
					defaultEmojiSets = (await db.query.emojiSets.findMany({
						where: and(
							inArray(emojiSets.id, defaultEmojiIds),
							eq(emojiSets.isDeletedByOwner, false)
						),
						with: {
							owner: {
								columns: { id: true, username: true, name: true, image: true }
							}
						}
					})) as unknown as EmojiSet[];
				} catch (e) {
					console.error('Erreur chargement defaultEmojiSets:', e);
				}
			}

			return {
				id: row.id,
				allowedBuiltinIconPacks:
					(row.allowedBuiltinIconPacks as string[]) ||
					DEFAULT_INSTANCE_SETTINGS.allowedBuiltinIconPacks,
				allowedCustomIconSetIds: allowedCustomIds,
				allowedCustomIconSets,
				defaultIconPack: row.defaultIconPack || DEFAULT_INSTANCE_SETTINGS.defaultIconPack,
				defaultIconSetId: row.defaultIconSetId || null,
				defaultIconSet: (row.defaultIconSet as unknown as IconSet) || null,
				defaultEmojiSetIds: defaultEmojiIds,
				defaultEmojiSets,
				performanceSettings: {
					...DEFAULT_INSTANCE_SETTINGS.performanceSettings,
					...(row.performanceSettings || {})
				},
				privacySettings: {
					...DEFAULT_INSTANCE_SETTINGS.privacySettings,
					...(row.privacySettings || {})
				},
				mediaSettings: {
					...DEFAULT_INSTANCE_SETTINGS.mediaSettings,
					...(row.mediaSettings || {})
				},
				contentDefaults: (() => {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					const raw = (row.contentDefaults as any) || {};
					const defaultGroups =
						Array.isArray(raw.defaultGroups) && raw.defaultGroups.length > 0
							? raw.defaultGroups
							: [
									{
										name: raw.defaultGroupName || 'Amis proches',
										color: raw.defaultGroupColor || '#10b981'
									}
								];
					const defaultFeeds =
						Array.isArray(raw.defaultFeeds) && raw.defaultFeeds.length > 0
							? raw.defaultFeeds
							: [
									{
										name: raw.defaultFeedConfig?.name || 'Chronologique',
										source: raw.defaultFeedConfig?.source || 'public',
										sortMode: raw.defaultFeedConfig?.sortMode || 'chrono',
										timeWindow: raw.defaultFeedConfig?.timeWindow || '7d'
									}
								];
					const defaultMaxInvites =
						typeof raw.defaultMaxInvites === 'number'
							? raw.defaultMaxInvites
							: DEFAULT_INSTANCE_SETTINGS.contentDefaults.defaultMaxInvites;

					return {
						defaultGroups,
						defaultFeeds,
						defaultMaxInvites,
						get defaultGroupName() {
							return defaultGroups[0]?.name || 'Amis proches';
						},
						get defaultGroupColor() {
							return defaultGroups[0]?.color || '#10b981';
						},
						get defaultFeedConfig() {
							return {
								name: defaultFeeds[0]?.name || 'Chronologique',
								source: defaultFeeds[0]?.source || 'public',
								groupIds: [],
								excludedGroupIds: [],
								contentTypeFilterMode: 'all',
								contentTypes: [],
								carouselContentTypeFilterMode: 'all',
								carouselContentTypes: [],
								tagFilterMode: 'all',
								includeTags: [],
								sortMode: defaultFeeds[0]?.sortMode || 'chrono',
								timeWindow: defaultFeeds[0]?.timeWindow || '7d',
								hideSeen: false,
								showStories: true,
								blendFeedAId: null,
								blendFeedBId: null,
								blendRatio: 50
							};
						}
					};
				})(),
				generalSettings: {
					...DEFAULT_INSTANCE_SETTINGS.generalSettings,
					...(row.generalSettings || {})
				}
			};
		} catch (e) {
			console.warn(
				'Table instance_settings non disponible ou en cours de migration, utilisation des valeurs par défaut:',
				e
			);
			return DEFAULT_INSTANCE_SETTINGS;
		}
	});
}

/**
 * Invalide le cache local de configuration d'instance.
 */
export function invalidateInstanceSettingsCache() {
	deleteCached(CACHE_KEY);
}

/**
 * Met à jour une section spécifique de la configuration d'instance.
 */
export async function updateInstanceSettingsSection<K extends keyof InstanceSettingsData>(
	section: K,
	data: Partial<InstanceSettingsData[K]>
): Promise<InstanceSettingsData> {
	const current = await getInstanceSettings();

	const merged = {
		...(typeof current[section] === 'object' && current[section] !== null ? current[section] : {}),
		...data
	};

	const updatePayload: Record<string, unknown> = {
		[section]: merged,
		updatedAt: new Date()
	};

	// Détection de la bascule Public / Privé
	if (section === 'privacySettings') {
		const oldPublic = current.privacySettings.isPublicInstance;
		const newPublic = (data as Partial<InstanceSettingsData['privacySettings']>).isPublicInstance;
		if (typeof newPublic === 'boolean' && oldPublic !== newPublic) {
			// Diffuser la notification système à tous les membres
			broadcastInstanceStatusNotification(newPublic).catch((err) =>
				console.error('Erreur diffusion notification statut instance:', err)
			);
		}
	}

	const initialRowPayload: Record<string, unknown> = {
		id: 'default',
		performanceSettings: current.performanceSettings,
		privacySettings: current.privacySettings,
		mediaSettings: current.mediaSettings,
		contentDefaults: current.contentDefaults,
		generalSettings: current.generalSettings,
		[section]: merged,
		updatedAt: new Date()
	};

	await db
		.insert(instanceSettings)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		.values(initialRowPayload as any)
		.onConflictDoUpdate({
			target: instanceSettings.id,
			set: updatePayload
		});

	invalidateInstanceSettingsCache();
	return await getInstanceSettings();
}

/**
 * Définit le statut public ou privé de l'instance et notifie les utilisateurs en cas de changement.
 */
export async function setInstancePublicStatus(isPublic: boolean): Promise<InstanceSettingsData> {
	const current = await getInstanceSettings();
	const updates: Partial<InstanceSettingsData['privacySettings']> = {
		isPublicInstance: isPublic
	};
	if (!isPublic) {
		if (current.privacySettings.defaultPostVisibility === 'public') {
			updates.defaultPostVisibility = 'followers';
		}
		if (current.privacySettings.defaultStoryVisibility === 'public') {
			updates.defaultStoryVisibility = 'followers';
		}
	}
	return await updateInstanceSettingsSection('privacySettings', updates);
}

/**
 * Diffuse une notification système à tous les utilisateurs lors d'un changement de statut de l'instance.
 */
export async function broadcastInstanceStatusNotification(isPublic: boolean) {
	try {
		const users = await db.select({ id: userTable.id }).from(userTable);
		if (users.length === 0) return;

		const title = isPublic
			? "L'instance est de nouveau publique"
			: "L'instance est désormais configurée en mode privé";
		const content = isPublic
			? "Les publications avec visibilité 'Public' sont de nouveau accessibles aux visiteurs du web."
			: 'Les publications ne sont plus consultables publiquement hors connexion. Seuls les membres enregistrés y ont accès.';

		const notifEntries = users.map((u) => ({
			recipientId: u.id,
			actorId: null,
			type: 'system' as const,
			entityId: null,
			content: `${title} : ${content}`
		}));

		await db.insert(notifications).values(notifEntries);
	} catch (err) {
		console.error('Erreur broadcastInstanceStatusNotification:', err);
	}
}

/**
 * Met à jour la configuration des icônes de l'instance.
 */
export async function updateInstanceIconSettings(data: {
	allowedBuiltinIconPacks: string[];
	allowedCustomIconSetIds?: string[];
	defaultIconPack: string;
	defaultIconSetId?: string | null;
}) {
	const validBuiltin = data.allowedBuiltinIconPacks.filter(
		(p): p is 'lucide' | 'original' => p === 'lucide' || p === 'original'
	);
	if (validBuiltin.length === 0) {
		throw new Error("Au moins un pack d'icônes intégré doit être activé.");
	}

	const allowedCustomIds = data.allowedCustomIconSetIds || [];
	const defaultPack = data.defaultIconPack;
	let defaultSetId = data.defaultIconSetId || null;

	if (defaultPack !== 'lucide' && defaultPack !== 'original') {
		defaultSetId = defaultPack;
	}

	if (defaultSetId) {
		const customSet = await db.query.iconSets.findFirst({
			where: and(eq(iconSets.id, defaultSetId), eq(iconSets.isDeletedByOwner, false))
		});
		if (!customSet) {
			throw new Error("Le pack d'icônes sélectionné par défaut est introuvable.");
		}
		if (!allowedCustomIds.includes(defaultSetId)) {
			allowedCustomIds.push(defaultSetId);
		}
	} else if (!validBuiltin.includes(defaultPack as 'lucide' | 'original')) {
		throw new Error("Le pack d'icônes par défaut doit faire partie des packs autorisés.");
	}

	await db
		.insert(instanceSettings)
		.values({
			id: 'default',
			allowedBuiltinIconPacks: validBuiltin,
			allowedCustomIconSetIds: allowedCustomIds,
			defaultIconPack: defaultSetId ? 'custom' : defaultPack,
			defaultIconSetId: defaultSetId
		})
		.onConflictDoUpdate({
			target: instanceSettings.id,
			set: {
				allowedBuiltinIconPacks: validBuiltin,
				allowedCustomIconSetIds: allowedCustomIds,
				defaultIconPack: defaultSetId ? 'custom' : defaultPack,
				defaultIconSetId: defaultSetId,
				updatedAt: new Date()
			}
		});

	try {
		await db.update(iconSets).set({ isInstanceDefault: false });
		if (defaultSetId) {
			await db
				.update(iconSets)
				.set({ isInstanceDefault: true })
				.where(eq(iconSets.id, defaultSetId));
		}
	} catch {
		// Tolérance de panne
	}

	invalidateInstanceSettingsCache();
	return await getInstanceSettings();
}

/**
 * Récupère les packs d'émojis par défaut de l'instance.
 */
export async function getInstanceDefaultEmojiSets(): Promise<EmojiSet[]> {
	try {
		return await db.query.emojiSets.findMany({
			where: and(
				eq(emojiSets.isInstanceDefault, true),
				eq(emojiSets.isPublished, true),
				eq(emojiSets.isDeletedByOwner, false)
			),
			with: {
				owner: {
					columns: { id: true, username: true, name: true, image: true }
				}
			},
			orderBy: [desc(emojiSets.createdAt)]
		});
	} catch {
		return [];
	}
}

/**
 * Bascule l'état par défaut d'une collection d'émojis.
 */
export async function toggleInstanceDefaultEmojiSet(emojiSetId: string, isDefault?: boolean) {
	const set = await db.query.emojiSets.findFirst({
		where: eq(emojiSets.id, emojiSetId)
	});

	if (!set) {
		throw new Error("Collection d'émojis introuvable.");
	}

	if (!set.isPublished || set.isDeletedByOwner) {
		throw new Error(
			"Seules les collections d'émojis publiées et actives peuvent être définies par défaut."
		);
	}

	const newStatus = typeof isDefault === 'boolean' ? isDefault : !set.isInstanceDefault;

	const [updated] = await db
		.update(emojiSets)
		.set({ isInstanceDefault: newStatus })
		.where(eq(emojiSets.id, emojiSetId))
		.returning();

	if (newStatus) {
		try {
			await db.execute(
				sql`UPDATE "user" SET "disabled_emoji_set_ids" = "disabled_emoji_set_ids" - ${emojiSetId} WHERE "disabled_emoji_set_ids" @> ${JSON.stringify([emojiSetId])}::jsonb`
			);
		} catch (e) {
			console.error('Erreur nettoyage disabled_emoji_set_ids:', e);
		}
	}

	invalidateInstanceSettingsCache();
	return updated;
}
