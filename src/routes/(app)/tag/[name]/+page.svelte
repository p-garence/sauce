<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { SvelteURLSearchParams, SvelteDate } from 'svelte/reactivity';
	import PageHeader from '$lib/components/navigation/PageHeader.svelte';
	import PostGrid from '$lib/components/post/PostGrid.svelte';
	import { POSTS_PER_GRID } from '$lib/constants';
	import type { PostData, PostSortMode, SerializedPost } from '$lib/types';

	let { data } = $props();

	let sortMode = $state<PostSortMode>('chrono');
	let posts = $state<PostData[]>([]);
	let nextCursor = $state<string | null>(null);
	let isLoadingMore = $state(false);

	$effect(() => {
		sortMode = data.sortMode || 'chrono';
		posts = data.posts || [];
		nextCursor = data.postsCursor;
	});

	const hasMore = $derived(!!nextCursor);
	const postCount = $derived(data.tag?.postCount ?? posts.length);

	async function changeSort(newSort: PostSortMode) {
		if (sortMode === newSort && posts.length > 0) return;
		sortMode = newSort;

		const params = new SvelteURLSearchParams(page.url.searchParams);
		params.set('sort', newSort);
		// @ts-expect-error path resolution with query
		const newPath = resolve(`${page.url.pathname}?${params.toString()}`);
		goto(newPath, { replaceState: true, keepFocus: true, noScroll: true });

		try {
			isLoadingMore = true;
			const res = await fetch(
				`/api/tag-posts?tag=${encodeURIComponent(data.tagName)}&sort=${newSort}&numberOfPost=${POSTS_PER_GRID}`
			);
			if (res.ok) {
				const json = await res.json();
				posts = json.posts.map((p: SerializedPost) => ({
					...p,
					createdAt: new SvelteDate(p.createdAt)
				}));
				nextCursor = json.nextCursor;
			}
		} catch (err) {
			console.error('Erreur changement de tri tag:', err);
		} finally {
			isLoadingMore = false;
		}
	}

	async function loadMore() {
		if (isLoadingMore || !nextCursor) return;
		isLoadingMore = true;

		try {
			const res = await fetch(
				`/api/tag-posts?tag=${encodeURIComponent(data.tagName)}&sort=${sortMode}&cursor=${encodeURIComponent(nextCursor)}&numberOfPost=${POSTS_PER_GRID}`
			);
			if (res.ok) {
				const json = await res.json();
				const formatted = json.posts.map((p: SerializedPost) => ({
					...p,
					createdAt: new SvelteDate(p.createdAt)
				}));
				posts = [...posts, ...formatted];
				nextCursor = json.nextCursor;
			}
		} catch (err) {
			console.error('Erreur chargement tag posts:', err);
		} finally {
			isLoadingMore = false;
		}
	}
</script>

<div class="tag-page">
	<PageHeader title="#{data.tagName}" back_location="/flux" />

	<header class="tag-header">
		<div class="tag-icon-circle">#</div>
		<div class="tag-details">
			<h1 class="tag-title">#{data.tagName}</h1>
			<p class="tag-stats">
				{postCount} publication{postCount > 1 ? 's' : ''}
			</p>
		</div>
	</header>

	<div class="tag-tabs">
		<button
			class="tab-btn {sortMode === 'chrono' ? 'active' : ''}"
			onclick={() => changeSort('chrono')}
		>
			Plus récents
		</button>
		<button
			class="tab-btn {sortMode === 'popular' ? 'active' : ''}"
			onclick={() => changeSort('popular')}
		>
			Plus populaires
		</button>
	</div>

	<main class="tag-content">
		<PostGrid {posts} {sortMode} {hasMore} {isLoadingMore} onLoadMore={loadMore} />
	</main>
</div>

<style>
	.tag-page {
		width: 100%;
		max-width: var(--max-content-width, 600px);
		margin: 0 auto;
		background: var(--bg-surface, #ffffff);
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		padding-bottom: calc(var(--nav-height, 60px) + env(safe-area-inset-bottom) + 20px);
	}

	.tag-header {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 20px 16px;
		background: linear-gradient(to bottom, #f8fafc, #ffffff);
		border-bottom: 1px solid var(--border-color, #f1f5f9);
	}

	.tag-icon-circle {
		width: 54px;
		height: 54px;
		border-radius: 50%;
		background: linear-gradient(135deg, #0ea5e9, #0284c7);
		color: #ffffff;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.8rem;
		font-weight: 800;
		box-shadow: 0 4px 12px rgba(14, 165, 233, 0.25);
		flex-shrink: 0;
	}

	.tag-details {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.tag-title {
		margin: 0;
		font-size: 1.35rem;
		font-weight: 800;
		color: #0f172a;
		word-break: break-all;
	}

	.tag-stats {
		margin: 0;
		font-size: 0.85rem;
		color: #64748b;
		font-weight: 500;
	}

	.tag-tabs {
		display: flex;
		border-bottom: 1px solid var(--border-color, #e2e8f0);
		background: #ffffff;
		position: sticky;
		top: 52px;
		z-index: 10;
	}

	.tab-btn {
		flex: 1;
		padding: 14px 8px;
		border: none;
		background: none;
		font-size: 0.95rem;
		font-weight: 600;
		color: #64748b;
		cursor: pointer;
		position: relative;
		transition: color 0.15s;
		text-align: center;
	}

	.tab-btn:hover {
		color: #0f172a;
	}

	.tab-btn.active {
		color: var(--primary, #0ea5e9);
	}

	.tab-btn.active::after {
		content: '';
		position: absolute;
		bottom: 0;
		left: 20%;
		right: 20%;
		height: 3px;
		background: var(--primary, #0ea5e9);
		border-radius: 3px 3px 0 0;
	}

	.tag-content {
		width: 100%;
		flex: 1;
	}
</style>
