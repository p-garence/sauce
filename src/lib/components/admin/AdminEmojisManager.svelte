<script lang="ts">
	/**
	 * @component AdminEmojisManager
	 * @domain Admin / Appearance
	 * @description Gestion des packs d'emojis de l'instance
	 * @responsibilities
	 * - Afficher la liste des packs d'emojis publiés sur l'instance avec recherche / filtre
	 * - Désigner un ou plusieurs packs comme packs par défaut de l'instance
	 * - Synchroniser l'état local et appeler `/api/admin/appearance/emojis/[id]/toggle-default`
	 */
	import { untrack } from 'svelte';
	import type { EmojiItem, EmojiSet } from '$lib/types';

	interface Props {
		/** Liste des packs d'émojis publiés sur l'instance */
		publishedEmojiSets?: EmojiSet[];
	}

	let { publishedEmojiSets = [] }: Props = $props();

	let emojiSetsList = $state<EmojiSet[]>(untrack(() => [...publishedEmojiSets]));
	let emojiSearch = $state('');
	let togglingEmojiId = $state<string | null>(null);

	const filteredEmojiSets = $derived(
		emojiSetsList.filter((s) => {
			const q = emojiSearch.trim().toLowerCase();
			if (!q) return true;
			const nameMatch = s.name.toLowerCase().includes(q);
			const ownerMatch = s.owner?.username?.toLowerCase().includes(q);
			return nameMatch || ownerMatch;
		})
	);

	async function handleToggleDefaultEmoji(set: EmojiSet) {
		togglingEmojiId = set.id;
		try {
			const res = await fetch(`/api/admin/appearance/emojis/${set.id}/toggle-default`, {
				method: 'POST'
			});
			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.error || 'Erreur lors de la modification');
			}

			// Mise à jour de l'état local
			emojiSetsList = emojiSetsList.map((item) =>
				item.id === set.id ? { ...item, isInstanceDefault: !item.isInstanceDefault } : item
			);
		} catch (err) {
			alert(err instanceof Error ? err.message : 'Erreur inconnue');
		} finally {
			togglingEmojiId = null;
		}
	}
</script>

<section class="card-section">
	<div class="section-header">
		<div>
			<h2 class="section-title">Packs d'Emojis par défaut</h2>
			<p class="section-subtitle">
				Désignez un ou plusieurs packs publiés comme <strong>par défaut</strong>. Ces packs seront
				automatiquement actifs pour l'ensemble des membres (qui pourront les désactiver dans leurs
				paramètres s'ils le souhaitent).
			</p>
		</div>
	</div>

	<div class="search-bar-row">
		<input
			type="text"
			class="search-input"
			placeholder="Filtrer les packs publiés (nom, créateur)..."
			bind:value={emojiSearch}
		/>
	</div>

	{#if filteredEmojiSets.length === 0}
		<div class="empty-state">
			<p>Aucun pack d'emojis publié ne correspond à votre recherche.</p>
		</div>
	{:else}
		<div class="emoji-sets-grid">
			{#each filteredEmojiSets as set (set.id)}
				{@const isDefault = Boolean(set.isInstanceDefault)}
				{@const emojisList = (set.emojis as EmojiItem[]) || []}
				<div class="emoji-card" class:is-default={isDefault}>
					<div class="emoji-card-header">
						<div>
							<h4 class="set-name">{set.name}</h4>
							<span class="set-meta">par @{set.owner?.username || 'anonyme'}</span>
						</div>
						{#if isDefault}
							<span class="badge-default">⭐ Par défaut</span>
						{/if}
					</div>

					{#if set.description}
						<p class="set-desc">{set.description}</p>
					{/if}

					<div class="emojis-preview-row">
						{#each emojisList.slice(0, 8) as emoji (emoji.id)}
							<img src={emoji.url} alt={emoji.name} title=":{emoji.name}:" class="mini-emoji" />
						{/each}
						{#if emojisList.length > 8}
							<span class="more-emojis">+{emojisList.length - 8}</span>
						{/if}
					</div>

					<div class="emoji-card-footer">
						<span class="emojis-count">{emojisList.length} émojis</span>
						<button
							type="button"
							class="btn-toggle-default"
							class:active={isDefault}
							disabled={togglingEmojiId === set.id}
							onclick={() => handleToggleDefaultEmoji(set)}
						>
							{#if togglingEmojiId === set.id}
								...
							{:else if isDefault}
								✓ Retirer des défauts
							{:else}
								⭐ Définir par défaut
							{/if}
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</section>

<style>
	.card-section {
		background: #ffffff;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		padding: 24px;
	}

	.section-header {
		margin-bottom: 20px;
		border-bottom: 1px solid #f3f4f6;
		padding-bottom: 12px;
	}

	.section-title {
		margin: 0 0 4px 0;
		font-size: 1.25rem;
		font-weight: 700;
		color: #111827;
	}

	.section-subtitle {
		margin: 0;
		font-size: 0.9rem;
		color: #6b7280;
		line-height: 1.4;
	}

	.search-bar-row {
		margin-bottom: 16px;
	}

	.search-input {
		width: 100%;
		padding: 10px 14px;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		font-size: 0.9rem;
	}

	.search-input:focus {
		outline: none;
		border-color: #2563eb;
		box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
	}

	.emoji-sets-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 16px;
	}

	.emoji-card {
		border: 1px solid #e5e7eb;
		border-radius: 10px;
		padding: 16px;
		background: #fdfdfd;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		gap: 12px;
		transition: all 0.2s;
	}

	.emoji-card.is-default {
		border-color: #fbbf24;
		background: #fffbeb;
	}

	.emoji-card-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 8px;
	}

	.set-name {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 700;
		color: #111827;
	}

	.set-meta {
		font-size: 0.8rem;
		color: #6b7280;
	}

	.badge-default {
		background: #fef3c7;
		color: #92400e;
		border: 1px solid #fde68a;
		padding: 3px 8px;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 700;
		white-space: nowrap;
	}

	.set-desc {
		margin: 0;
		font-size: 0.85rem;
		color: #4b5563;
		line-height: 1.4;
	}

	.emojis-preview-row {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
		padding: 8px 10px;
		background: rgba(0, 0, 0, 0.03);
		border-radius: 8px;
		min-height: 38px;
	}

	.mini-emoji {
		width: 26px;
		height: 26px;
		object-fit: contain;
	}

	.more-emojis {
		font-size: 0.75rem;
		font-weight: 700;
		color: #6b7280;
		padding: 0 4px;
	}

	.emoji-card-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 4px;
		padding-top: 10px;
		border-top: 1px solid rgba(0, 0, 0, 0.05);
	}

	.emojis-count {
		font-size: 0.8rem;
		color: #6b7280;
		font-weight: 500;
	}

	.btn-toggle-default {
		padding: 6px 12px;
		border-radius: 6px;
		font-size: 0.82rem;
		font-weight: 600;
		cursor: pointer;
		border: 1px solid #d1d5db;
		background: white;
		color: #374151;
		transition: all 0.15s;
	}

	.btn-toggle-default:hover:not(:disabled) {
		background: #f3f4f6;
		border-color: #9ca3af;
	}

	.btn-toggle-default.active {
		background: #fef3c7;
		color: #92400e;
		border-color: #f59e0b;
	}

	.btn-toggle-default.active:hover:not(:disabled) {
		background: #fee2e2;
		color: #dc2626;
		border-color: #f87171;
	}

	.empty-state {
		text-align: center;
		padding: 32px 16px;
		color: #6b7280;
		font-size: 0.95rem;
	}
</style>
