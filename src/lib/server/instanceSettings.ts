import { db } from '$lib/server/db';
import { instanceSettings, iconSets, emojiSets } from '$lib/server/db/schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import type { EmojiSet, IconSet } from '$lib/types';

export interface InstanceSettingsData {
	id: string;
	allowedBuiltinIconPacks: string[];
	allowedCustomIconSetIds: string[];
	allowedCustomIconSets?: IconSet[];
	defaultIconPack: string;
	defaultIconSetId: string | null;
	defaultIconSet?: IconSet | null;
}

const DEFAULT_SETTINGS: InstanceSettingsData = {
	id: 'default',
	allowedBuiltinIconPacks: ['lucide', 'original'],
	allowedCustomIconSetIds: [],
	allowedCustomIconSets: [],
	defaultIconPack: 'lucide',
	defaultIconSetId: null,
	defaultIconSet: null
};

export async function getInstanceSettings(): Promise<InstanceSettingsData> {
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
			return DEFAULT_SETTINGS;
		}

		const allowedCustomIds = (row.allowedCustomIconSetIds as string[]) || [];
		let allowedCustomIconSets: IconSet[] = [];
		if (allowedCustomIds.length > 0) {
			try {
				allowedCustomIconSets = (await db.query.iconSets.findMany({
					where: and(inArray(iconSets.id, allowedCustomIds), eq(iconSets.isDeletedByOwner, false)),
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

		return {
			id: row.id,
			allowedBuiltinIconPacks: (row.allowedBuiltinIconPacks as string[]) || ['lucide', 'original'],
			allowedCustomIconSetIds: allowedCustomIds,
			allowedCustomIconSets,
			defaultIconPack: row.defaultIconPack || 'lucide',
			defaultIconSetId: row.defaultIconSetId || null,
			defaultIconSet: (row.defaultIconSet as unknown as IconSet) || null
		};
	} catch (e) {
		console.warn(
			'Instance settings table not ready or queried without migration, using defaults:',
			e
		);
		return DEFAULT_SETTINGS;
	}
}

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

	// Si defaultPack est un UUID direct (provenant de la liste des packs autorisés)
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
		// Ignorer si colonne pas encore migrée
	}

	return await getInstanceSettings();
}

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

	return updated;
}
