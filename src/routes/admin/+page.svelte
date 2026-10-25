<script lang="ts">
	/**
	 * @component AdminPage
	 * @domain Admin
	 * @description Console d'administration centrale orchestrant les onglets de gestion de l'instance
	 * @responsibilities
	 * - Navigation par onglets (utilisateurs, posts, stories, post système, personnalisation, actions, médias, docs)
	 * - Transmission des données de chargement serveur aux sous-onglets spécialisés
	 */
	import type { PageData } from './$types';
	import AdminUsersTab from '$lib/components/admin/AdminUsersTab.svelte';
	import AdminPostsTab from '$lib/components/admin/AdminPostsTab.svelte';
	import AdminStoriesTab from '$lib/components/admin/AdminStoriesTab.svelte';
	import AdminSystemPost from '$lib/components/admin/AdminSystemPost.svelte';
	import AdminAppearance from '$lib/components/admin/AdminAppearance.svelte';
	import AdminGlobalActionsTab from '$lib/components/admin/AdminGlobalActionsTab.svelte';
	import AdminStorageTab from '$lib/components/admin/AdminStorageTab.svelte';
	import AdminDocsTab from '$lib/components/admin/AdminDocsTab.svelte';

	interface Props {
		/** Données de chargement de la page d'administration */
		data: PageData;
	}

	let { data }: Props = $props();

	type AdminTab =
		'users' | 'posts' | 'stories' | 'system-post' | 'appearance' | 'actions' | 'media' | 'docs';

	let activeTab = $state<AdminTab>('users');
</script>

<div class="admin-container">
	<header class="admin-header">
		<div>
			<h1>Panneau d'Administration</h1>
			<p>Gérez les membres, les publications, le stockage et les paramètres globaux.</p>
		</div>
	</header>

	<!-- NAVIGATION PAR ONGLETS -->
	<nav class="admin-tabs">
		<button
			type="button"
			class="tab-btn"
			class:active={activeTab === 'users'}
			onclick={() => (activeTab = 'users')}
		>
			Utilisateurs ({data.users.length})
		</button>
		<button
			type="button"
			class="tab-btn"
			class:active={activeTab === 'posts'}
			onclick={() => (activeTab = 'posts')}
		>
			Publications ({data.stats.totalPosts})
		</button>
		<button
			type="button"
			class="tab-btn"
			class:active={activeTab === 'stories'}
			onclick={() => (activeTab = 'stories')}
		>
			Stories ({data.stats.totalStories})
		</button>
		<button
			type="button"
			class="tab-btn"
			class:active={activeTab === 'system-post'}
			onclick={() => (activeTab = 'system-post')}
		>
			Post Système
		</button>
		<button
			type="button"
			class="tab-btn"
			class:active={activeTab === 'appearance'}
			onclick={() => (activeTab = 'appearance')}
		>
			🎨 Personnalisation
		</button>
		<button
			type="button"
			class="tab-btn"
			class:active={activeTab === 'actions'}
			onclick={() => (activeTab = 'actions')}
		>
			Actions Globales
		</button>
		<button
			type="button"
			class="tab-btn"
			class:active={activeTab === 'media'}
			onclick={() => (activeTab = 'media')}
		>
			Médias {#if data.orphans && data.orphans.orphanCount > 0}
				<span class="tab-badge">{data.orphans.orphanCount}</span>
			{/if}
		</button>
		<button
			type="button"
			class="tab-btn"
			class:active={activeTab === 'docs'}
			onclick={() => (activeTab = 'docs')}
		>
			Documentation
		</button>
	</nav>

	<!-- CONTENU DE L'ONGLET ACTIF -->
	{#if activeTab === 'users'}
		<AdminUsersTab users={data.users} />
	{:else if activeTab === 'posts'}
		<AdminPostsTab
			initialPosts={data.posts}
			initialCursor={data.postsCursor}
			totalPosts={data.stats.totalPosts}
		/>
	{:else if activeTab === 'stories'}
		<AdminStoriesTab
			initialStories={data.stories}
			initialCursor={data.storiesCursor}
			totalStories={data.stats.totalStories}
		/>
	{:else if activeTab === 'system-post'}
		<section class="tab-section">
			<AdminSystemPost trendingTags={data.trendingTags} />
		</section>
	{:else if activeTab === 'appearance'}
		<section class="tab-section">
			<AdminAppearance
				instanceSettings={data.instanceSettings}
				publishedIconSets={data.publishedIconSets}
				publishedEmojiSets={data.publishedEmojiSets}
			/>
		</section>
	{:else if activeTab === 'actions'}
		<AdminGlobalActionsTab stats={data.stats} />
	{:else if activeTab === 'media'}
		<AdminStorageTab serverStorage={data.serverStorage} orphans={data.orphans} />
	{:else if activeTab === 'docs'}
		<AdminDocsTab />
	{/if}
</div>

<style>
	.admin-container {
		padding: 24px;
		max-width: 1100px;
		margin: 20px auto;
		background: white;
		border-radius: 12px;
		box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
	}

	.admin-header {
		margin-bottom: 20px;
		border-bottom: 1px solid #eaeaea;
		padding-bottom: 16px;
	}

	.admin-header h1 {
		margin: 0 0 4px 0;
		font-size: 1.5rem;
		color: #111827;
	}

	.admin-header p {
		margin: 0;
		color: #6b7280;
		font-size: 0.9rem;
	}

	/* ONGLETS */
	.admin-tabs {
		display: flex;
		gap: 8px;
		border-bottom: 2px solid #e5e7eb;
		margin-bottom: 24px;
		overflow-x: auto;
		flex-wrap: nowrap;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: none;
		padding-bottom: 4px;
	}

	.admin-tabs::-webkit-scrollbar {
		display: none;
	}

	.tab-btn {
		background: none;
		border: none;
		padding: 10px 16px;
		font-size: 0.9rem;
		font-weight: 600;
		color: #6b7280;
		cursor: pointer;
		border-bottom: 3px solid transparent;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		gap: 6px;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.tab-btn:hover {
		color: #1f2937;
	}

	.tab-btn.active {
		color: #2563eb;
		border-bottom-color: #2563eb;
	}

	.tab-badge {
		background: #ef4444;
		color: white;
		font-size: 0.7rem;
		padding: 2px 6px;
		border-radius: 10px;
	}

	@media (max-width: 640px) {
		.admin-container {
			padding: 12px;
			margin: 8px auto;
			border-radius: 8px;
		}

		.admin-header h1 {
			font-size: 1.25rem;
		}

		.tab-btn {
			padding: 8px 12px;
			font-size: 0.82rem;
		}
	}
</style>
