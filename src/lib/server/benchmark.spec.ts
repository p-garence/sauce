import { describe, it, expect } from 'vitest';
import { db } from '$lib/server/db';
import { posts, user, chatParticipants, messages, notifications } from '$lib/server/db/schema';
import { getFilteredPosts, getProfilePosts } from '$lib/server/posts';
import { getTrendingTags } from '$lib/server/tags';
import { sql } from 'drizzle-orm';

interface BenchmarkResult {
	name: string;
	iterations: number;
	avgMs: number;
	minMs: number;
	maxMs: number;
}

async function runBenchmark(
	name: string,
	fn: () => Promise<unknown>,
	iterations = 5
): Promise<BenchmarkResult> {
	// Warmup run
	try {
		await fn();
	} catch (e) {
		console.warn(`Warmup failed for ${name}:`, e);
	}

	const times: number[] = [];
	for (let i = 0; i < iterations; i++) {
		const start = performance.now();
		await fn();
		times.push(performance.now() - start);
	}

	const avgMs = times.reduce((a, b) => a + b, 0) / times.length;
	const minMs = Math.min(...times);
	const maxMs = Math.max(...times);

	return {
		name,
		iterations,
		avgMs: Math.round(avgMs * 100) / 100,
		minMs: Math.round(minMs * 100) / 100,
		maxMs: Math.round(maxMs * 100) / 100
	};
}

import { ensureOptimizationIndexes } from './db/indexes';

describe('Performance Benchmarks', () => {
	it('measures key database & query performance', async () => {
		// S'assurer que les tables et index d'optimisation existent
		await ensureOptimizationIndexes();

		// 1. Récupérer un utilisateur existant pour les tests
		const [firstUser] = await db.select({ id: user.id }).from(user).limit(1);
		const testUserId = firstUser?.id ?? '00000000-0000-0000-0000-000000000000';

		const results: BenchmarkResult[] = [];

		// Benchmark 1 : Flux chronologique (queryPosts avec 15 posts)
		results.push(
			await runBenchmark('1. Chrono Feed (queryPosts 15 items)', async () => {
				await getFilteredPosts(testUserId, null, 15);
			})
		);

		// Benchmark 2 : Profil utilisateur (getProfilePosts 18 items)
		results.push(
			await runBenchmark('2. Profile Grid (getProfilePosts 18 items)', async () => {
				await getProfilePosts(testUserId, testUserId, 18);
			})
		);

		// Benchmark 3 : Unread Chat check (api/chat/unread query)
		results.push(
			await runBenchmark('3. Unread Chats (api/chat/unread query)', async () => {
				await db.execute(sql`
					SELECT DISTINCT cp.chat_id
					FROM ${chatParticipants} cp
					INNER JOIN ${messages} m ON m.chat_id = cp.chat_id
					WHERE cp.user_id = ${testUserId}
					  AND cp.is_hidden = false
					  AND m.sender_id != ${testUserId}
					  AND m.created_at > cp.last_read_at
					  AND m.created_at > cp.cleared_at
					  AND (
						cp.is_muted = false
						OR EXISTS (
							SELECT 1 FROM ${notifications} n
							WHERE n.recipient_id = ${testUserId}
							  AND n.type = 'mention'
							  AND n.entity_id = cp.chat_id
							  AND n.created_at > cp.last_read_at
							  AND n.is_read = false
						)
					  )
				`);
			})
		);

		// Benchmark 4 : Notifications non lues (COUNT rapide)
		results.push(
			await runBenchmark('4. Notifications Count (api/notifications unread)', async () => {
				await db.execute(sql`
					SELECT count(*)::int as count 
					FROM ${notifications} 
					WHERE recipient_id = ${testUserId} AND is_read = false
				`);
			})
		);

		// Benchmark 5 : Trending tags (recherche et découverte)
		results.push(
			await runBenchmark('5. Trending Tags (getTrendingTags 10)', async () => {
				await getTrendingTags(10);
			})
		);

		// Benchmark 6 : Media visibility check (Nouvelle recherche indexée GIN JSONB)
		const mockMediaUrl = '/media/test-sample-file.webp';
		const targetJson = JSON.stringify([{ content: mockMediaUrl }]);
		results.push(
			await runBenchmark('6. Media Check (Optimized GIN JSONB)', async () => {
				await db
					.select({ id: posts.id, visibility: posts.visibility })
					.from(posts)
					.where(sql`${posts.mediaUrls} @> ${targetJson}::jsonb`)
					.limit(1);
			})
		);

		// Benchmark 7 : Media visibility check (Ancien Sequential Scan LIKE pour comparaison)
		results.push(
			await runBenchmark('7. Media Check (Legacy Sequential LIKE)', async () => {
				await db
					.select({ id: posts.id, visibility: posts.visibility })
					.from(posts)
					.where(sql`${posts.mediaUrls}::text LIKE ${'%' + mockMediaUrl + '%'}`)
					.limit(1);
			})
		);

		console.log('\n======================================================');
		console.log('       RÉSULTATS DU BENCHMARK DE PERFORMANCE (OPTIMISÉ)');
		console.log('======================================================');
		console.table(
			results.map((r) => ({
				'Scénario de Requête': r.name,
				'Moyenne (ms)': `${r.avgMs} ms`,
				'Min (ms)': `${r.minMs} ms`,
				'Max (ms)': `${r.maxMs} ms`,
				Itérations: r.iterations
			}))
		);
		console.log('======================================================\n');

		expect(results.length).toBe(7);
	});
});
