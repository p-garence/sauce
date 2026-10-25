<script lang="ts">
	/**
	 * @component EmojiPickerPopover
	 * @domain UI / Emojis
	 * @description Sélecteur popover d'émojis personnalisés avec favoris et onglets de collections
	 * @responsibilities
	 * - Charger les émojis actifs depuis le contexte de page ou l'API `/api/emoji-sets/active`
	 * - Afficher la barre des favoris de l'utilisateur
	 * - Proposer la navigation par collection si plusieurs packs sont actifs
	 * - Transmettre l'émoji sélectionné au callback `onSelect` et fermer le sélecteur
	 */
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { emojiStore } from '$lib/client/emojiStore.svelte';
	import type { EmojiItem, EmojiSet } from '$lib/types';

	interface Props {
		/** Alignement horizontal du popover ('left' ou 'right') */
		align?: 'left' | 'right';
		/** Placement vertical du popover ('top' ou 'bottom') */
		placement?: 'top' | 'bottom';
		/** Callback lors de la sélection d'un émoji */
		onSelect: (emoji: EmojiItem) => void;
		/** Callback pour fermer le sélecteur */
		onClose: () => void;
	}

	let {
		align = 'right',
		placement = 'top',
		onSelect,
		onClose
	}: Props = $props();

	let activeEmojiSets = $state<EmojiSet[]>([]);
	let allEmojis = $state<EmojiItem[]>([]);
	let userFavoriteEmojis = $state<EmojiItem[]>([]);
	let selectedSetId = $state<string>('all');
	let isLoading = $state(false);

	let userFavorites = $derived.by<EmojiItem[]>(() => {
		if (userFavoriteEmojis.length > 0) return userFavoriteEmojis;
		const fromPage = (page.data?.userFavoriteEmojis as EmojiItem[]) || [];
		if (fromPage.length > 0) return fromPage;
		return allEmojis.slice(0, 6);
	});

	let displayedEmojis = $derived.by<EmojiItem[]>(() => {
		if (selectedSetId === 'all') {
			return allEmojis;
		}
		const set = activeEmojiSets.find((s) => s.id === selectedSetId);
		return set?.emojis || [];
	});

	function loadDataFromPageOrApi() {
		const setsFromPage = (page.data?.activeEmojiSets as EmojiSet[]) || [];
		const favsFromPage = (page.data?.userFavoriteEmojis as EmojiItem[]) || [];
		const allFromPage = (page.data?.activeEmojis as EmojiItem[]) || [];

		if (setsFromPage.length > 0) {
			activeEmojiSets = setsFromPage;
			userFavoriteEmojis = favsFromPage;
			allEmojis =
				allFromPage.length > 0
					? allFromPage
					: setsFromPage.flatMap((s) => (s.emojis as EmojiItem[]) || []);

			emojiStore.registerEmojis(allEmojis);
			return;
		}

		isLoading = true;
		fetch('/api/emoji-sets/active')
			.then((res) => (res.ok ? res.json() : null))
			.then((data) => {
				if (data) {
					activeEmojiSets = data.activeSets || [];
					allEmojis = data.emojis || [];
					userFavoriteEmojis = data.favoriteEmojis || [];
					emojiStore.registerEmojis(allEmojis);
				}
			})
			.catch((e) => console.error('Erreur chargement active emojis:', e))
			.finally(() => {
				isLoading = false;
			});
	}

	onMount(() => {
		loadDataFromPageOrApi();
	});

	function handleEmojiClick(e: MouseEvent, emoji: EmojiItem) {
		e.stopPropagation();
		e.preventDefault();
		onSelect(emoji);
		onClose();
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="emoji-picker-backdrop" onclick={onClose}></div>

<div
	class="emoji-picker-popover align-{align} placement-{placement}"
	role="dialog"
	aria-label="Sélecteur d'émojis"
>
	<div class="emoji-picker-header">
		<span class="picker-title">
			{#if activeEmojiSets.length === 1}
				{activeEmojiSets[0].name}
			{:else}
				Émojis
			{/if}
		</span>
		<button type="button" class="btn-close" onclick={onClose} title="Fermer">✕</button>
	</div>

	{#if isLoading}
		<div class="picker-empty">Chargement des émojis...</div>
	{:else if activeEmojiSets.length === 0}
		<div class="picker-empty">
			<p>Aucun pack d'émojis actif.</p>
			<a href={resolve('/parametres?tab=emojis')} class="btn-manage">Activer un pack dans les Paramètres</a>
		</div>
	{:else}
		<!-- 1. BARRE DE FAVORIS PROPRE À L'UTILISATEUR -->
		{#if userFavorites.length > 0}
			<div class="picker-section favorites-section">
				<span class="section-label">Vos favoris</span>
				<div class="favorites-row">
					{#each userFavorites as emoji (emoji.id || emoji.name)}
						<button
							type="button"
							class="emoji-btn favorite"
							title=":{emoji.name}:"
							onclick={(e) => handleEmojiClick(e, emoji)}
						>
							<img src={emoji.url} alt=":{emoji.name}:" loading="lazy" />
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<!-- 2. ONGLETS DE COLLECTIONS -->
		{#if activeEmojiSets.length > 1}
			<div class="collections-tabs">
				<button
					type="button"
					class="tab-btn"
					class:active={selectedSetId === 'all'}
					onclick={() => (selectedSetId = 'all')}
				>
					Tous ({allEmojis.length})
				</button>
				{#each activeEmojiSets as set (set.id)}
					<button
						type="button"
						class="tab-btn"
						class:active={selectedSetId === set.id}
						onclick={() => (selectedSetId = set.id)}
					>
						{set.name}
					</button>
				{/each}
			</div>
		{/if}

		<!-- 3. GRILLE D'ÉMOJIS -->
		<div class="picker-section full-section">
			<span class="section-label">
				{#if selectedSetId === 'all'}
					Tous les émojis ({displayedEmojis.length})
				{:else}
					{activeEmojiSets.find((s) => s.id === selectedSetId)?.name || 'Émojis'} ({displayedEmojis.length})
				{/if}
			</span>
			<div class="emojis-grid">
				{#each displayedEmojis as emoji (emoji.id || emoji.name)}
					<button
						type="button"
						class="emoji-btn"
						title=":{emoji.name}:"
						onclick={(e) => handleEmojiClick(e, emoji)}
					>
						<img src={emoji.url} alt=":{emoji.name}:" loading="lazy" />
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	/* Backdrop */
	.emoji-picker-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 999;
	}

	/* Popover */
	.emoji-picker-popover {
		position: absolute;
		width: 310px;
		max-width: 90vw;
		max-height: 350px;
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
		display: flex;
		flex-direction: column;
		z-index: 1000;
		overflow: hidden;
		animation: popIn 0.15s ease-out;
	}

	.emoji-picker-popover.placement-top {
		bottom: calc(100% + 8px);
		top: auto;
	}

	.emoji-picker-popover.placement-bottom {
		top: calc(100% + 8px);
		bottom: auto;
	}

	.emoji-picker-popover.align-right {
		right: 0;
		left: auto;
	}

	.emoji-picker-popover.align-left {
		left: 0;
		right: auto;
	}

	@keyframes popIn {
		from {
			opacity: 0;
			transform: scale(0.96) translateY(4px);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}

	.emoji-picker-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 12px;
		border-bottom: 1px solid #f1f5f9;
		background: #f8fafc;
	}

	.picker-title {
		font-size: 0.85rem;
		font-weight: 700;
		color: #1e293b;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.btn-close {
		background: none;
		border: none;
		font-size: 0.85rem;
		color: #94a3b8;
		cursor: pointer;
		padding: 2px 6px;
		border-radius: 4px;
		line-height: 1;
	}

	.btn-close:hover {
		color: #475569;
		background: #e2e8f0;
	}

	.picker-empty {
		padding: 24px 16px;
		text-align: center;
		font-size: 0.85rem;
		color: #64748b;
		display: flex;
		flex-direction: column;
		gap: 8px;
		align-items: center;
	}

	.btn-manage {
		font-size: 0.78rem;
		color: #0ea5e9;
		text-decoration: underline;
		cursor: pointer;
	}

	.picker-section {
		padding: 8px 12px;
	}

	/* Favorites bar */
	.favorites-section {
		border-bottom: 1px solid #f1f5f9;
		background: #fafafa;
	}

	.section-label {
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: #94a3b8;
		margin-bottom: 6px;
		display: block;
	}

	.favorites-row {
		display: flex;
		gap: 6px;
		overflow-x: auto;
		scrollbar-width: none;
	}

	.favorites-row::-webkit-scrollbar {
		display: none;
	}

	/* Collections tabs */
	.collections-tabs {
		display: flex;
		gap: 4px;
		padding: 6px 12px;
		background: #f8fafc;
		border-bottom: 1px solid #e2e8f0;
		overflow-x: auto;
		scrollbar-width: none;
	}

	.collections-tabs::-webkit-scrollbar {
		display: none;
	}

	.tab-btn {
		background: none;
		border: 1px solid transparent;
		padding: 3px 8px;
		border-radius: 6px;
		font-size: 0.75rem;
		font-weight: 600;
		color: #64748b;
		cursor: pointer;
		white-space: nowrap;
		transition: all 0.15s;
	}

	.tab-btn:hover {
		color: #1e293b;
		background: #e2e8f0;
	}

	.tab-btn.active {
		background: #ffffff;
		border-color: #cbd5e1;
		color: #0ea5e9;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
	}

	/* Full list */
	.full-section {
		flex: 1;
		overflow-y: auto;
		max-height: 190px;
	}

	.emojis-grid {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 6px;
	}

	.emoji-btn {
		width: 36px;
		height: 36px;
		border-radius: 6px;
		border: 1px solid transparent;
		background: none;
		padding: 3px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: transform 0.1s, background-color 0.1s, border-color 0.1s;
	}

	.emoji-btn:hover {
		background: #f1f5f9;
		border-color: #cbd5e1;
		transform: scale(1.15);
		z-index: 2;
	}

	.emoji-btn img {
		width: 100%;
		height: 100%;
		object-fit: contain;
		pointer-events: none;
	}
</style>
