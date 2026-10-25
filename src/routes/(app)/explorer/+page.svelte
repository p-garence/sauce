<script lang="ts">
	import type { UserSearchResult } from '$lib/types';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import UserSearch from '$lib/components/profile/UserSearch.svelte';
	import PostSearch from '$lib/components/post/PostSearch.svelte'; // 👈 Nouveau composant
	import TopNav from '$lib/components/navigation/TopNav.svelte';

	let activeTab = $state<'posts' | 'users'>('posts');

	export const snapshot = {
		capture: () => activeTab,
		restore: (value: 'posts' | 'users') => {
			activeTab = value;
		}
	};

	function handleUserSelect(user: UserSearchResult) {
		goto(resolve(`/profil/${user.username}`), { state: { showBack: true } });
	}
</script>

<div class="explorer-page">
	<TopNav title="Explorer" />

	<div class="tabs">
		<button class="tab" class:active={activeTab === 'posts'} onclick={() => (activeTab = 'posts')}>
			Publications
		</button>
		<button class="tab" class:active={activeTab === 'users'} onclick={() => (activeTab = 'users')}>
			Personnes
		</button>
	</div>

	<div class="search-container">
		{#if activeTab === 'posts'}
			<!-- L'ID différent garantit une mémoire séparée -->
			<PostSearch id="explorer_posts" />
		{:else}
			<UserSearch id="explorer_users" onSelect={handleUserSelect} />
		{/if}
	</div>
</div>

<style>
	.explorer-page {
		width: 100%;
		background: var(--bg-surface, #ffffff);
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	/* CSS des onglets */
	.tabs {
		display: flex;
		border-bottom: 1px solid var(--border-color, #eaeaea);
		background: var(--bg-surface, #ffffff);
		position: sticky;
		top: calc(var(--nav-height, 60px) + env(safe-area-inset-top)); /* Juste sous le header */
		z-index: 10;
	}
	.tab {
		flex: 1;
		padding: 12px;
		border: none;
		background: none;
		font-weight: 600;
		font-size: 0.95rem;
		color: var(--text-muted, #94a3b8);
		cursor: pointer;
		border-bottom: 2px solid transparent;
		transition: all 0.2s;
	}
	.tab.active {
		color: var(--primary, #0ea5e9);
		border-bottom-color: var(--primary, #0ea5e9);
	}

	.search-container {
		padding: var(--space-4, 16px);
		flex: 1;
	}
</style>
