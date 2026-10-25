<!--
  @component SettingsFeeds
  @domain settings/feeds
  @description Panneau de gestion des flux personnalisés (listage, création, modification, suppression).
  @responsibilities
    - Lister les flux configurés par l'utilisateur
    - Orchestrer le basculement entre la consultation et l'édition d'un flux
    - Piloter l'ouverture du formulaire de création d'un nouveau flux
-->
<script lang="ts">
	import SettingsCard from '$lib/components/settings/ui/SettingsCard.svelte';
	import type { UserGroup, UserFeed } from '$lib/types';
	import FeedConfigForm from './feeds/FeedConfigForm.svelte';
	import FeedItemCard from './feeds/FeedItemCard.svelte';

	/**
	 * Propriétés du panneau SettingsFeeds
	 */
	interface Props {
		/** Liste des flux configurés de l'utilisateur */
		feeds: UserFeed[];
		/** Groupes de l'utilisateur pour le filtrage par groupe */
		groups?: UserGroup[];
		/** Liste des hashtags tendances suggérés */
		trendingTags?: { name: string; count?: number }[];
		/** Données de retour d'action de formulaire SvelteKit */
		form?: { success?: boolean; message?: string } | null;
	}

	let { feeds, groups = [], trendingTags = [], form }: Props = $props();

	let editingFeedId = $state<string | null>(null);
</script>

<SettingsCard
	title="Gérer mes flux"
	description="Créez des flux personnalisés pour filtrer les sources, les tags, les tendances ou fusionner deux flux."
>
	{#if form?.message}
		<div class="error-box">{form.message}</div>
	{/if}

	<div class="feed-list">
		{#each feeds as feed (feed.id)}
			{#if editingFeedId === feed.id}
				<div class="feed-card editing">
					<FeedConfigForm
						{feed}
						{feeds}
						{groups}
						{trendingTags}
						onCancel={() => (editingFeedId = null)}
						onSuccess={() => (editingFeedId = null)}
					/>
				</div>
			{:else}
				<FeedItemCard
					{feed}
					{feeds}
					{groups}
					canDelete={feeds.length > 1}
					onEdit={() => (editingFeedId = feed.id)}
				/>
			{/if}
		{/each}
	</div>

	<!-- FORMULAIRE DE CRÉATION -->
	{#if editingFeedId !== 'new'}
		<button class="btn-create" onclick={() => (editingFeedId = 'new')}>
			+ Créer un nouveau flux
		</button>
	{:else}
		<div class="feed-card new-feed">
			<h3>Nouveau Flux</h3>
			<FeedConfigForm
				feed={null}
				{feeds}
				{groups}
				{trendingTags}
				onCancel={() => (editingFeedId = null)}
				onSuccess={() => (editingFeedId = null)}
			/>
		</div>
	{/if}
</SettingsCard>

<style>
	.error-box {
		background: #fee2e2;
		color: #dc2626;
		padding: 12px;
		border-radius: 6px;
		margin-bottom: 16px;
		font-size: 0.9rem;
	}

	.feed-list {
		display: flex;
		flex-direction: column;
		gap: 16px;
		margin-bottom: 24px;
	}

	.feed-card {
		border: 1px solid #eaeaea;
		border-radius: 12px;
		padding: 16px;
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		background: #fafafa;
	}

	.feed-card.editing {
		background: #ffffff;
		border-color: #0ea5e9;
		box-shadow: 0 4px 12px rgba(14, 165, 233, 0.08);
	}

	.feed-card.new-feed {
		background: #fff;
		border: 2px dashed #0ea5e9;
		flex-direction: column;
		gap: 16px;
	}

	.feed-card.new-feed h3 {
		margin: 0;
		font-size: 1.15rem;
		color: #0f172a;
	}

	.btn-create {
		width: 100%;
		padding: 16px;
		background: #f0f9ff;
		color: #0ea5e9;
		border: 2px dashed #bae6fd;
		border-radius: 12px;
		font-weight: bold;
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-create:hover {
		background: #e0f2fe;
	}
</style>
