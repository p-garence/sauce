<!--
  @component EmojiFavoritesCard
  @domain settings/emojis
  @description Carte de gestion des 6 émojis favoris personnels avec modale de recherche et de sélection rapide.
  @responsibilities
    - Présenter la grille des 6 emplacements favoris
    - Permettre la suppression d'un favori
    - Ouvrir la modale de sélection / remplacement avec recherche temps réel
    - Gérer la sélection et déclencher la mise à jour des favoris
-->
<script lang="ts">
	import SettingsCard from '$lib/components/settings/ui/SettingsCard.svelte';
	import type { EmojiItem } from '$lib/types';

	/**
	 * Propriétés du composant EmojiFavoritesCard
	 */
	interface Props {
		/** Identifiants des émojis favoris actuels de l'utilisateur (longueur max 6) */
		userFavoriteEmojiIds: string[];
		/** Tous les émojis connus de la bibliothèque pour résoudre les noms et URLs */
		allLibraryEmojis: EmojiItem[];
		/** Groupes de collections pour le sélecteur modal */
		pickerCollections: {
			id: string;
			name: string;
			isOwned: boolean;
			emojis: EmojiItem[];
		}[];
		/** Callback appelé lors de la sélection d'un nouvel émoji favori */
		onFavoriteSelected: (targetId: string | null, newEmojiId: string) => Promise<void> | void;
		/** Callback appelé pour retirer un favori */
		onFavoriteRemoved: (emojiId: string) => Promise<void> | void;
	}

	let {
		userFavoriteEmojiIds,
		allLibraryEmojis,
		pickerCollections,
		onFavoriteSelected,
		onFavoriteRemoved
	}: Props = $props();

	let isPickerModalOpen = $state(false);
	let targetReplacingEmojiId = $state<string | null>(null);

	let targetReplacingEmoji = $derived(
		targetReplacingEmojiId
			? allLibraryEmojis.find((e) => e.id === targetReplacingEmojiId) || null
			: null
	);

	let favoriteSlots = $derived.by(() => {
		const slots: { id: string | null; emoji: EmojiItem | null }[] = [];
		for (let i = 0; i < 6; i++) {
			const favId = userFavoriteEmojiIds[i];
			if (favId) {
				const em = allLibraryEmojis.find((e) => e.id === favId);
				slots.push({
					id: favId,
					emoji: em || { id: favId, name: 'emoji', url: '' }
				});
			} else {
				slots.push({ id: null, emoji: null });
			}
		}
		return slots;
	});

	function openEmojiPicker(slotEmojiId: string | null = null) {
		targetReplacingEmojiId = slotEmojiId;
		isPickerModalOpen = true;
	}

	function closeEmojiPicker() {
		isPickerModalOpen = false;
		targetReplacingEmojiId = null;
	}

	async function handleSelectEmoji(newEmojiId: string) {
		await onFavoriteSelected(targetReplacingEmojiId, newEmojiId);
		closeEmojiPicker();
	}
</script>

<SettingsCard title="Mes émojis favoris">
	<p class="editor-desc">6 émojis personnels en accès rapide.</p>

	<div class="fav-slots-grid">
		{#each favoriteSlots as slot, idx (idx)}
			{#if slot.emoji}
				<div class="fav-slot-card filled">
					<button
						type="button"
						class="fav-slot-btn"
						onclick={() => slot.id && openEmojiPicker(slot.id)}
						title="Cliquer pour remplacer cet émoji"
					>
						{#if slot.emoji.url}
							<img src={slot.emoji.url} alt="Émoji favori" class="fav-slot-img" />
						{/if}
						<span class="fav-slot-replace-hint">Remplacer</span>
					</button>
					<button
						type="button"
						class="btn-remove-slot"
						title="Retirer des favoris"
						onclick={() => slot.id && onFavoriteRemoved(slot.id)}
					>
						✕
					</button>
				</div>
			{:else}
				<button
					type="button"
					class="fav-slot-card empty"
					onclick={() => openEmojiPicker(null)}
					title="Ajouter un émoji favori"
				>
					<span class="empty-slot-plus">+</span>
					<span class="empty-slot-label">Emplacement {idx + 1}</span>
					<span class="empty-slot-sub">Ajouter</span>
				</button>
			{/if}
		{/each}
	</div>
</SettingsCard>

<!-- Modal de sélection d'émojis favoris -->
{#if isPickerModalOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={closeEmojiPicker}>
		<div class="modal-content picker-modal-content" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<div>
					<h3>
						{#if targetReplacingEmoji}
							Remplacer l'émoji favori
						{:else}
							Choisir un émoji favori
						{/if}
					</h3>
					<p class="picker-modal-subtitle">
						{#if targetReplacingEmoji}
							Sélectionnez un nouvel émoji parmi vos collections pour remplacer cet emplacement.
						{:else}
							Sélectionnez un émoji parmi vos collections pour l'ajouter à vos favoris rapides.
						{/if}
					</p>
				</div>
				<button type="button" class="btn-close-modal" onclick={closeEmojiPicker}>✕</button>
			</div>

			<div class="picker-body-scroll">
				{#if pickerCollections.length === 0}
					<div class="picker-empty-hint">
						Aucune collection d'émojis disponible dans votre bibliothèque.
					</div>
				{:else}
					{#each pickerCollections as col (col.id)}
						<div class="picker-collection-group">
							<div class="picker-group-header">
								<span class="picker-group-title">{col.name}</span>
								<span class="picker-group-badge">{col.isOwned ? 'Ma collection' : 'Sauvegardée'}</span>
								<span class="picker-group-count">({col.emojis.length})</span>
							</div>

							<div class="picker-grid">
								{#each col.emojis as emoji (col.id + '_' + emoji.id)}
									{@const isCurrentFav = userFavoriteEmojiIds.includes(emoji.id)}
									<button
										type="button"
										class="picker-item-btn"
										class:is-already-fav={isCurrentFav}
										title={isCurrentFav ? 'Actuellement en favori' : 'Choisir cet émoji'}
										onclick={() => handleSelectEmoji(emoji.id)}
									>
										<img src={emoji.url} alt="Émoji" class="picker-item-img" />
										{#if isCurrentFav}
											<span class="picker-item-badge">Favori</span>
										{/if}
									</button>
								{/each}
							</div>
						</div>
					{/each}
				{/if}
			</div>

			<div class="modal-footer">
				<button type="button" class="btn-action-secondary" onclick={closeEmojiPicker}>
					Annuler
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.editor-desc {
		margin: 0 0 16px 0;
		font-size: 0.88rem;
		color: #475569;
		line-height: 1.4;
	}

	.fav-slots-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(105px, 1fr));
		gap: 12px;
		margin-top: 12px;
	}

	.fav-slot-card {
		border-radius: 12px;
		min-height: 60px;
		display: flex;
		flex-direction: column;
		position: relative;
		transition: all 0.2s ease;
		background: #ffffff;
	}

	.fav-slot-card.filled {
		border: 1px solid #cbd5e1;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
	}

	.fav-slot-card.filled:hover {
		border-color: #0ea5e9;
		box-shadow: 0 4px 6px -1px rgba(14, 165, 233, 0.15);
	}

	.fav-slot-btn {
		width: 100%;
		height: 100%;
		background: none;
		border: none;
		padding: 10px 8px 8px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		gap: 4px;
		border-radius: 12px;
	}

	.fav-slot-img {
		width: 44px;
		height: 44px;
		object-fit: contain;
	}

	.fav-slot-replace-hint {
		font-size: 0.65rem;
		color: #0284c7;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		opacity: 0.8;
	}

	.fav-slot-btn:hover .fav-slot-replace-hint {
		opacity: 1;
		text-decoration: underline;
	}

	.btn-remove-slot {
		position: absolute;
		top: 4px;
		right: 4px;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		border: 1px solid #e2e8f0;
		background: #ffffff;
		color: #94a3b8;
		font-size: 0.65rem;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.15s ease;
		padding: 0;
	}

	.btn-remove-slot:hover {
		background: #fee2e2;
		color: #dc2626;
		border-color: #fca5a5;
	}

	.fav-slot-card.empty {
		border: 2px dashed #cbd5e1;
		background: #f8fafc;
		cursor: pointer;
		align-items: center;
		justify-content: center;
		padding: 12px 8px;
		gap: 2px;
	}

	.fav-slot-card.empty:hover {
		border-color: #0ea5e9;
		background: #f0f9ff;
	}

	.empty-slot-plus {
		font-size: 1.4rem;
		line-height: 1;
		color: #94a3b8;
		font-weight: 300;
	}

	.fav-slot-card.empty:hover .empty-slot-plus {
		color: #0ea5e9;
	}

	.empty-slot-label {
		font-size: 0.7rem;
		font-weight: 600;
		color: #64748b;
	}

	.empty-slot-sub {
		font-size: 0.65rem;
		color: #94a3b8;
	}

	/* Modal Backdrop & Content */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.45);
		backdrop-filter: blur(4px);
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px;
	}

	.modal-content {
		width: 100%;
		background: #ffffff;
		border-radius: 16px;
		overflow: hidden;
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.18);
	}

	.picker-modal-content {
		max-width: 580px;
		max-height: 85vh;
		display: flex;
		flex-direction: column;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px;
		border-bottom: 1px solid #f1f5f9;
	}

	.modal-header h3 {
		margin: 0;
		font-size: 1rem;
		font-weight: 700;
		color: #0f172a;
	}

	.picker-modal-subtitle {
		margin: 2px 0 0 0;
		font-size: 0.8rem;
		color: #64748b;
		font-weight: normal;
	}

	.btn-close-modal {
		background: none;
		border: none;
		font-size: 1rem;
		color: #94a3b8;
		cursor: pointer;
	}

	.picker-body-scroll {
		padding: 16px;
		overflow-y: auto;
		max-height: calc(85vh - 180px);
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.picker-empty-hint {
		padding: 24px 16px;
		text-align: center;
		color: #64748b;
		font-size: 0.88rem;
		line-height: 1.5;
	}

	.picker-collection-group {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.picker-group-header {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.85rem;
	}

	.picker-group-title {
		font-weight: 700;
		color: #0f172a;
	}

	.picker-group-badge {
		font-size: 0.7rem;
		padding: 2px 8px;
		background: #f1f5f9;
		border-radius: 6px;
		color: #475569;
		font-weight: 600;
	}

	.picker-group-count {
		font-size: 0.75rem;
		color: #94a3b8;
	}

	.picker-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
		gap: 8px;
	}

	.picker-item-btn {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		padding: 8px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		position: relative;
		gap: 4px;
		transition: all 0.15s ease;
	}

	.picker-item-btn:hover {
		border-color: #0ea5e9;
		background: #f0f9ff;
		transform: translateY(-1px);
	}

	.picker-item-btn.is-already-fav {
		border-color: #facc15;
		background: #fefce8;
	}

	.picker-item-img {
		width: 36px;
		height: 36px;
		object-fit: contain;
	}

	.picker-item-badge {
		position: absolute;
		top: 2px;
		right: 2px;
		background: #facc15;
		color: #854d0e;
		font-size: 0.58rem;
		font-weight: 700;
		padding: 1px 4px;
		border-radius: 4px;
	}

	.modal-footer {
		padding: 12px 16px;
		border-top: 1px solid #f1f5f9;
		display: flex;
		justify-content: flex-end;
		background: #ffffff;
	}

	.btn-action-secondary {
		padding: 8px 16px;
		background: #f1f5f9;
		color: #475569;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		font-size: 0.85rem;
		cursor: pointer;
	}
</style>
