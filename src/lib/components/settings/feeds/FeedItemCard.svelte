<!--
  @component FeedItemCard
  @domain settings/feeds
  @description Carte d'affichage d'un flux configuré avec badges des règles actives et boutons d'action.
  @responsibilities
    - Afficher le nom et le résumé des filtres du flux (source, groupes, tags, type, tri, exclusion)
    - Proposer le bouton de modification vers le formulaire
    - Gérer la suppression sécurisée avec enhance SvelteKit et réinitialisation de la mémoire du flux
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { UserFeed, UserGroup } from '$lib/types';
	import { clearMainFeedState } from '$lib/client/feedMemory.svelte';

	/**
	 * Propriétés du composant FeedItemCard
	 */
	interface Props {
		/** Flux utilisateur à afficher */
		feed: UserFeed;
		/** Tous les flux existants pour identifier les noms en cas de fusion (blend) */
		feeds: UserFeed[];
		/** Groupes de l'utilisateur pour afficher les noms de groupes ciblés ou exclus */
		groups?: UserGroup[];
		/** Autorise la suppression (désactivé s'il ne reste qu'un seul flux) */
		canDelete: boolean;
		/** Callback pour basculer en mode édition */
		onEdit: () => void;
	}

	let {
		feed,
		feeds,
		groups = [],
		canDelete,
		onEdit
	}: Props = $props();

	const AVAILABLE_CONTENT_TYPES = [
		{ id: 'text', label: 'Texte' },
		{ id: 'image', label: 'Image' },
		{ id: 'video', label: 'Vidéo' },
		{ id: 'carousel', label: 'Carrousel' }
	];

	const CAROUSEL_CHILD_TYPES = [
		{ id: 'image', label: 'Image' },
		{ id: 'video', label: 'Vidéo' },
		{ id: 'text', label: 'Texte' }
	];

	function getFeedName(id?: string | null): string {
		if (!id) return '';
		return feeds.find((f) => f.id === id)?.name || 'Flux';
	}

	function getTimeWindowLabel(window?: string | null): string {
		switch (window) {
			case '24h':
				return 'Dernières 24 heures';
			case '30d':
				return '30 derniers jours';
			case 'all':
				return 'Tout les temps';
			case '7d':
			default:
				return '7 derniers jours';
		}
	}
</script>

<div class="feed-card">
	<div class="feed-info">
		<h3>{feed.name}</h3>
		<div class="feed-badges">
			{#if feed.source === 'public'}
				<span class="badge">Tout le réseau</span>
			{:else if feed.source === 'following'}
				<span class="badge">Mes abonnements</span>
			{:else if feed.source === 'groups'}
				{@const selectedGroupNames = groups
					.filter((g) => feed.groupIds?.includes(g.id))
					.map((g) => g.name)}
				<span class="badge badge-group">
					Groupes ({selectedGroupNames.length > 0
						? selectedGroupNames.join(', ')
						: 'Aucun groupe'})
				</span>
			{:else if feed.source === 'blend'}
				<span class="badge badge-blend">
					Fusion ({feed.blendRatio || 50}% {getFeedName(feed.blendFeedAId)} / {100 -
						(feed.blendRatio || 50)}% {getFeedName(feed.blendFeedBId)})
				</span>
			{:else if feed.source === 'rss'}
				<span class="badge badge-rss">
					<Icon name="source.rss" size={12} />
					Flux RSS ({feed.rssUrls?.length || 0})
				</span>
			{/if}

			{#if feed.source !== 'blend' && feed.source !== 'rss' && (feed.tagFilterMode ? feed.tagFilterMode !== 'all' : true) && feed.includeTags && feed.includeTags.length > 0}
				<span
					class="badge badge-tag"
					class:badge-excluded={feed.tagFilterMode === 'exclude'}
				>
					{feed.tagFilterMode === 'exclude' ? 'Sans tags :' : 'Tags :'}
					{feed.includeTags.map((t) => `#${t}`).join(' ')}
				</span>
			{/if}

			{#if feed.source !== 'blend' && feed.source !== 'rss'}
				{#if feed.sortMode === 'trending'}
					<span class="badge badge-trending">Tendance</span>
				{:else if feed.sortMode === 'oldest'}
					<span class="badge badge-oldest">Plus anciens</span>
				{:else if feed.sortMode === 'discussed'}
					<span class="badge badge-discussed">Plus discutés</span>
				{:else if feed.sortMode === 'random'}
					<span class="badge badge-random">Aléatoire</span>
				{:else}
					<span class="badge">Chronologique</span>
				{/if}

				{#if feed.sortMode && feed.sortMode !== 'chrono'}
					<span class="badge badge-time">{getTimeWindowLabel(feed.timeWindow)}</span>
				{/if}
			{/if}

			{#if feed.source !== 'rss' && feed.hideSeen}
				<span class="badge badge-seen">Masque les vus</span>
			{/if}
			{#if feed.source !== 'rss' && feed.showStories === false}
				<span class="badge badge-seen">Sans stories</span>
			{/if}

			{#if feed.source !== 'blend' && feed.source !== 'rss' && feed.contentTypeFilterMode && feed.contentTypeFilterMode !== 'all' && feed.contentTypes && feed.contentTypes.length > 0}
				<span class="badge badge-filter">
					{feed.contentTypeFilterMode === 'include' ? 'Types :' : 'Sans :'}
					{feed.contentTypes
						.map((t) => AVAILABLE_CONTENT_TYPES.find((c) => c.id === t)?.label || t)
						.join(', ')}
				</span>
			{/if}

			{#if feed.source !== 'blend' && feed.source !== 'rss' && feed.carouselContentTypeFilterMode && feed.carouselContentTypeFilterMode !== 'all' && feed.carouselContentTypes && feed.carouselContentTypes.length > 0}
				<span class="badge badge-filter">
					{feed.carouselContentTypeFilterMode === 'include'
						? 'Carrousels avec :'
						: 'Carrousels sans :'}
					{feed.carouselContentTypes
						.map((t) => CAROUSEL_CHILD_TYPES.find((c) => c.id === t)?.label || t)
						.join(', ')}
				</span>
			{/if}

			{#if feed.source !== 'blend' && feed.source !== 'rss' && feed.excludedGroupIds && feed.excludedGroupIds.length > 0}
				{@const excludedNames = groups
					.filter((g) => feed.excludedGroupIds?.includes(g.id))
					.map((g) => g.name)}
				{#if excludedNames.length > 0}
					<span class="badge badge-excluded">
						Exclus : {excludedNames.join(', ')}
					</span>
				{/if}
			{/if}
		</div>
	</div>

	<div class="feed-actions">
		<button class="btn-icon" onclick={onEdit} aria-label="Modifier">
			<Icon name="action.edit" size={16} />
		</button>
		{#if canDelete}
			<form
				method="POST"
				action="?/deleteFeed"
				use:enhance={() => {
					clearMainFeedState();
					return async ({ update }) => {
						await update();
					};
				}}
			>
				<input type="hidden" name="feedId" value={feed.id} />
				<button class="btn-icon danger" type="submit" aria-label="Supprimer">
					<Icon name="action.delete" size={16} />
				</button>
			</form>
		{/if}
	</div>
</div>

<style>
	.feed-card {
		border: 1px solid #eaeaea;
		border-radius: 12px;
		padding: 16px;
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		background: #fafafa;
	}

	.feed-info h3 {
		margin: 0 0 8px 0;
		font-size: 1.1rem;
		color: #1a1a1a;
	}

	.feed-badges {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	.badge {
		font-size: 0.8rem;
		background: #e2e8f0;
		color: #475569;
		padding: 4px 8px;
		border-radius: 12px;
		font-weight: 500;
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}

	.badge-seen {
		background: #fef08a;
		color: #854d0e;
	}

	.badge-group {
		background: #dcfce7;
		color: #166534;
	}

	.badge-blend {
		background: #f3e8ff;
		color: #7e22ce;
		font-weight: 600;
	}

	.badge-rss {
		background: #ffedd5;
		color: #c2410c;
		font-weight: 600;
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}

	.badge-tag {
		background: #e0f2fe;
		color: #0369a1;
	}

	.badge-trending {
		background: #ffedd5;
		color: #c2410c;
		font-weight: 600;
	}

	.badge-discussed {
		background: #ecfdf5;
		color: #047857;
		font-weight: 600;
	}

	.badge-random {
		background: #fdf4ff;
		color: #a21caf;
		font-weight: 600;
	}

	.badge-oldest {
		background: #f1f5f9;
		color: #334155;
		font-weight: 600;
	}

	.badge-time {
		background: #f8fafc;
		color: #475569;
		border: 1px solid #cbd5e1;
		font-weight: 500;
	}

	.badge-filter {
		background: #e0e7ff;
		color: #3730a3;
		font-weight: 600;
	}

	.badge-excluded {
		background: #fee2e2;
		color: #991b1b;
		font-weight: 600;
	}

	.feed-actions {
		display: flex;
		gap: 8px;
		flex-shrink: 0;
	}

	.btn-icon {
		background: white;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		padding: 8px;
		cursor: pointer;
		transition: background 0.2s;
	}

	.btn-icon:hover {
		background: #f1f5f9;
	}

	.btn-icon.danger:hover {
		background: #fee2e2;
		border-color: #fca5a5;
	}
</style>
