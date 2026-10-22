<!--
  @component PostSearch
  @domain post
  @description Barre de recherche et de filtrage de publications.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { searchMemory } from '$lib/client/searchMemory.svelte';
	import type { PostData } from '$lib/types';
	import PostGrid from '$lib/components/post/PostGrid.svelte'; // 👈 Import du composant
	import SortSelect from '$lib/components/ui/SortSelect.svelte';
	import SearchInput from '$lib/components/ui/SearchInput.svelte';
	import { POSTS_PER_GRID } from '$lib/constants';

	let { id = 'default_posts' }: { id?: string } = $props();

	// Initialisation depuis la RAM
	// svelte-ignore state_referenced_locally
	let query = $state(searchMemory[id]?.query || '');
	// svelte-ignore state_referenced_locally
	let results = $state<PostData[]>((searchMemory[id]?.results as PostData[]) || []);
	// svelte-ignore state_referenced_locally
	let nextCursor = $state<string | null>(searchMemory[id]?.nextCursor || null);
	// svelte-ignore state_referenced_locally
	let sortMode = $state<'chrono' | 'popular' | 'popular_week'>(
		(searchMemory[id]?.sortMode as 'chrono' | 'popular' | 'popular_week') || 'chrono'
	);
	let isLoading = $state(false);
	let isLoadingMore = $state(false);
	let timeout: ReturnType<typeof setTimeout>;

	onMount(() => {
		// Au montage, si c'est vide, on fetch les posts par défaut (du réseau)
		if (results.length === 0) fetchPosts(true);
	});

	function saveState() {
		searchMemory[id] = { query, results, nextCursor, sortMode };
	}

	async function fetchPosts(isNewSearch = true) {
		if (isNewSearch) {
			isLoading = true;
			nextCursor = null;
		} else {
			isLoadingMore = true;
		}

		try {
			let url = `/api/search-posts?q=${encodeURIComponent(query)}&sort=${sortMode}&limit=${POSTS_PER_GRID}`;
			if (!isNewSearch && nextCursor) {
				url += `&cursor=${encodeURIComponent(nextCursor)}`;
			}

			const res = await fetch(url);
			if (res.ok) {
				const data = await res.json();
				if (isNewSearch) {
					results = data.posts;
				} else {
					const existingIds = new Set(results.map((p) => p.id));
					const uniqueNewPosts = data.posts.filter((p: PostData) => !existingIds.has(p.id));
					results = [...results, ...uniqueNewPosts];
				}
				nextCursor = data.nextCursor;
				saveState();
			}
		} catch (err) {
			console.error('Erreur', err);
		} finally {
			isLoading = false;
			isLoadingMore = false;
		}
	}

	function handleInput() {
		saveState();
		clearTimeout(timeout);
		timeout = setTimeout(() => fetchPosts(true), 400);
	}

	function handleSortChange() {
		saveState();
		fetchPosts(true); // On relance à zéro si on change le type de tri
	}
</script>

<div class="post-search-component">
	<div class="search-header">
		<SearchInput
			bind:value={query}
			oninput={handleInput}
			onclear={handleInput}
			placeholder="Rechercher des posts, mots-clés..."
			{isLoading}
		/>

		<SortSelect
			bind:value={sortMode}
			onChange={handleSortChange}
			options={[
				{ value: 'chrono', label: 'Plus récents' },
				{ value: 'popular_week', label: 'Top de la semaine' },
				{ value: 'popular', label: 'Plus populaires' }
			]}
		/>
	</div>

	<!-- On utilise PostGrid en lui passant nos résultats, sans 'username' -->
	<PostGrid
		posts={results}
		hasMore={!!nextCursor}
		{isLoadingMore}
		onLoadMore={() => fetchPosts(false)}
	/>
</div>

<style>
	.post-search-component {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.search-header {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
</style>
