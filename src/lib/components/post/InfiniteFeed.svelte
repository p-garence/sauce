<!--
  @component InfiniteFeed
  @domain post
  @description Conteneur de défilement infini paginé par curseur pour les listes de publications.
-->
<script lang="ts">
	import Feed from './Feed.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { PostData } from '$lib/types';

	let {
		posts = [],
		hasMore = false,
		isLoadingMore = false,
		onLoadMore,
		isRefreshing = false,
		onRefresh = undefined,
		endMessage = 'Vous êtes à jour ! 🎉'
	}: {
		posts: PostData[];
		hasMore?: boolean;
		isLoadingMore?: boolean;
		onLoadMore?: () => void;
		isRefreshing?: boolean;
		onRefresh?: () => void;
		endMessage?: string;
	} = $props();

	let showFabUp = $state(false);

	$effect(() => {
		const handleScroll = () => {
			showFabUp = window.scrollY > 800;
		};
		window.addEventListener('scroll', handleScroll, { passive: true });
		return () => window.removeEventListener('scroll', handleScroll);
	});
</script>

{#if onRefresh}
	<div class="refresh-zone">
		<button onclick={onRefresh} class="refresh-btn" disabled={isRefreshing}>
			{isRefreshing ? 'Actualisation en cours...' : '↻ Nouveaux posts'}
		</button>
	</div>
{/if}

<Feed {posts} />

<!-- Le parent gère la logique, le composant gère juste l'affichage du bouton -->
{#if hasMore && onLoadMore}
	<div class="load-more-container">
		<button class="load-more-btn" onclick={onLoadMore} disabled={isLoadingMore}>
			{isLoadingMore ? 'Chargement en cours...' : 'Charger plus'}
		</button>
	</div>
{:else if posts.length > 0}
	<div class="end-message">
		<p>{endMessage}</p>
	</div>
{/if}

{#if onRefresh && showFabUp}
	<button class="fab-up" onclick={onRefresh} aria-label="Remonter et rafraîchir">
		<Icon name="action.up" size={22} color="white" />
	</button>
{/if}

<style>
	/* Zone de rafraîchissement (Haut) */
	.refresh-zone {
		padding: 8px 12px;
		display: flex;
		justify-content: center;
		background: #fdfdfd;
		border-bottom: 1px solid #f1f1f1;
	}
	.refresh-btn {
		background: #f1f5f9;
		border: none;
		color: #0ea5e9;
		font-weight: 600;
		padding: 8px 16px;
		border-radius: 20px;
		cursor: pointer;
		font-size: 0.9rem;
		transition: background 0.2s;
	}
	.refresh-btn:hover:not(:disabled) {
		background: #e2e8f0;
	}
	.refresh-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* 👇 NOUVEAUX STYLES POUR LE BOUTON MANUEL (Bas) */
	.load-more-container {
		padding: 32px 16px;
		display: flex;
		justify-content: center;
	}
	.load-more-btn {
		background: white;
		color: #1a1a1a;
		border: 1px solid #cbd5e1;
		padding: 12px 24px;
		border-radius: 24px;
		font-weight: bold;
		font-size: 0.95rem;
		cursor: pointer;
		transition: all 0.2s;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
	}
	.load-more-btn:hover:not(:disabled) {
		background: #f8fafc;
		border-color: #94a3b8;
	}
	.load-more-btn:disabled {
		opacity: 0.6;
		cursor: wait;
		background: #f1f5f9;
	}

	.end-message {
		color: #666;
		font-size: 0.9rem;
		text-align: center;
		padding: 20px;
	}

	/* Bouton flottant (FAB) */
	.fab-up {
		position: fixed;
		bottom: calc(var(--nav-height, 60px) + env(safe-area-inset-bottom, 0px) + 20px);
		right: 20px;
		width: 48px;
		height: 48px;
		background-color: #1a1a1a;
		color: white;
		border: none;
		border-radius: 50%;
		font-size: 1.2rem;
		cursor: pointer;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 90;
		transition: transform 0.2s;
	}
	.fab-up:active {
		transform: scale(0.9);
	}
	@media (min-width: 600px) {
		.fab-up {
			right: calc(50% - 280px);
		}
	}
</style>
