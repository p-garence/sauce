import { db } from '$lib/server/db';
import { instances } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { TrustLevel } from '$lib/server/db/schema/enums';

/**
 * Get all registered federated instances.
 */
export async function getInstances() {
	return db.query.instances.findMany({
		orderBy: [desc(instances.addedAt)]
	});
}

/**
 * Register a new instance domain.
 */
export async function registerInstance(domain: string, trustLevel: TrustLevel = 'known') {
	const cleanDomain = domain
		.trim()
		.toLowerCase()
		.replace(/^https?:\/\//, '')
		.replace(/\/.*$/, '');
	if (!cleanDomain) throw new Error('Domaine non valide.');

	const [created] = await db
		.insert(instances)
		.values({
			domain: cleanDomain,
			trustLevel
		})
		.onConflictDoNothing()
		.returning();

	if (!created) {
		const [existing] = await db.select().from(instances).where(eq(instances.domain, cleanDomain));
		return existing;
	}

	return created;
}

/**
 * Update trust level of an instance.
 */
export async function updateInstanceTrust(id: string, trustLevel: TrustLevel) {
	const [updated] = await db
		.update(instances)
		.set({ trustLevel })
		.where(eq(instances.id, id))
		.returning();

	if (!updated) throw new Error('Instance introuvable.');
	return updated;
}

/**
 * Delete an instance from the federation directory.
 */
export async function deleteInstance(id: string) {
	await db.delete(instances).where(eq(instances.id, id));
	return { success: true, deletedInstanceId: id };
}
