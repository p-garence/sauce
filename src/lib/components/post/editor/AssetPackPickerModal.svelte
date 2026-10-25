<script lang="ts">
	/**
	 * @component AssetPackPickerModal
	 * @domain post
	 * @description Modale de sélection d'un pack d'icônes ou d'émojis personnalisés appartenant à l'utilisateur pour l'attacher à une publication.
	 *
	 * @responsibilities
	 * - Afficher la liste à onglets des packs d'icônes et collections d'émojis créés par l'utilisateur.
	 * - Permettre la sélection rapide avec prévisualisation des éléments du pack.
	 * - Rediriger vers les paramètres de gestion de packs si la bibliothèque est vide.
	 */

	import { resolve } from '$app/paths';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { EmojiItem, EmojiSet, IconSet } from '$lib/types';

	interface Props {
		/** Indique si la modale est actuellement ouverte */
		isOpen: boolean;
		/** Packs d'icônes possédés par l'utilisateur */
		userOwnedIconSets?: IconSet[];
		/** Collections d'émojis possédées par l'utilisateur */
		userOwnedEmojiSets?: EmojiSet[];
		/** Callback déclenché lors du choix d'un pack d'icônes */
		onSelectIconSet: (set: IconSet) => void;
		/** Callback déclenché lors du choix d'un pack d'émojis */
		onSelectEmojiSet: (set: EmojiSet) => void;
		/** Callback de fermeture de la modale */
		onClose: () => void;
	}

	let {
		isOpen,
		userOwnedIconSets = [],
		userOwnedEmojiSets = [],
		onSelectIconSet,
		onSelectEmojiSet,
		onClose
	}: Props = $props();

	let activeTab = $state<'icons' | 'emojis'>('icons');
</script>

{#if isOpen}
	<div
		class="modal-backdrop"
		role="button"
		tabindex="0"
		onclick={onClose}
		onkeydown={(e) => e.key === 'Escape' && onClose()}
	>
		<div
			class="modal-card"
			role="dialog"
			aria-modal="true"
			tabindex="0"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<div class="modal-header">
				<h3 class="modal-title">Joindre un pack</h3>
				<button type="button" class="btn-close-modal" onclick={onClose} aria-label="Fermer">
					<Icon name="action.close" size={18} />
				</button>
			</div>

			<div class="modal-tabs">
				<button
					type="button"
					class="modal-tab"
					class:active={activeTab === 'icons'}
					onclick={() => (activeTab = 'icons')}
				>
					<Icon name="status.palette" size={16} />
					<span>Packs d'icônes ({userOwnedIconSets.length})</span>
				</button>
				<button
					type="button"
					class="modal-tab"
					class:active={activeTab === 'emojis'}
					onclick={() => (activeTab = 'emojis')}
				>
					<Icon name="status.tag" size={16} />
					<span>Packs d'emojis ({userOwnedEmojiSets.length})</span>
				</button>
			</div>

			<div class="modal-body">
				{#if activeTab === 'icons'}
					{#if userOwnedIconSets.length === 0}
						<div class="empty-packs-notice">
							<p>Vous n'avez pas encore créé de pack d'icônes.</p>
							<a href={resolve('/parametres?tab=icons')} class="link-settings">Gérer mes icônes</a>
						</div>
					{:else}
						<div class="packs-picker-list">
							{#each userOwnedIconSets as set (set.id)}
								{@const iconsCount = Object.keys(set.icons || {}).length}
								<div class="picker-item-card">
									<div class="picker-item-info">
										<strong class="picker-item-name">{set.name}</strong>
										<span class="picker-item-meta"
											>{iconsCount} icône{iconsCount > 1 ? 's' : ''}</span
										>
										{#if set.description}
											<p class="picker-item-desc">{set.description}</p>
										{/if}
										<div class="picker-thumbs-row">
											{#each Object.entries(set.icons || {}).slice(0, 6) as [k, u] (k)}
												<img src={u} alt={k} class="picker-thumb" />
											{/each}
										</div>
									</div>
									<button
										type="button"
										class="btn-select-pack"
										onclick={() => onSelectIconSet(set)}
									>
										Choisir
									</button>
								</div>
							{/each}
						</div>
					{/if}
				{:else}
					{#if userOwnedEmojiSets.length === 0}
						<div class="empty-packs-notice">
							<p>Vous n'avez pas encore créé de collection d'emojis.</p>
							<a href={resolve('/parametres?tab=emojis')} class="link-settings">Gérer mes emojis</a>
						</div>
					{:else}
						<div class="packs-picker-list">
							{#each userOwnedEmojiSets as set (set.id)}
								{@const emList = (set.emojis as EmojiItem[]) || []}
								<div class="picker-item-card">
									<div class="picker-item-info">
										<strong class="picker-item-name">{set.name}</strong>
										<span class="picker-item-meta"
											>{emList.length} emoji{emList.length > 1 ? 's' : ''}</span
										>
										{#if set.description}
											<p class="picker-item-desc">{set.description}</p>
										{/if}
										<div class="picker-thumbs-row">
											{#each emList.slice(0, 6) as em (em.id || em.name || em.url)}
												<img src={em.url} alt={em.name} class="picker-thumb" />
											{/each}
										</div>
									</div>
									<button
										type="button"
										class="btn-select-pack"
										onclick={() => onSelectEmojiSet(set)}
									>
										Choisir
									</button>
								</div>
							{/each}
						</div>
					{/if}
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.45);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 16px;
	}

	.modal-card {
		background: #ffffff;
		border-radius: 16px;
		max-width: 500px;
		width: 100%;
		max-height: 80vh;
		display: flex;
		flex-direction: column;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
		overflow: hidden;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		border-bottom: 1px solid #e2e8f0;
	}

	.modal-title {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 700;
		color: #0f172a;
	}

	.btn-close-modal {
		background: none;
		border: none;
		color: #64748b;
		cursor: pointer;
		padding: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 6px;
	}

	.btn-close-modal:hover {
		background: #f1f5f9;
		color: #0f172a;
	}

	.modal-tabs {
		display: flex;
		border-bottom: 1px solid #e2e8f0;
		background: #f8fafc;
	}

	.modal-tab {
		flex: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 12px;
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		font-size: 0.88rem;
		font-weight: 600;
		color: #64748b;
		cursor: pointer;
	}

	.modal-tab.active {
		color: #0284c7;
		border-bottom-color: #0284c7;
		background: #ffffff;
	}

	.modal-body {
		padding: 16px 20px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.empty-packs-notice {
		text-align: center;
		padding: 32px 16px;
		color: #64748b;
		font-size: 0.9rem;
	}

	.link-settings {
		display: inline-block;
		margin-top: 8px;
		color: #0284c7;
		font-weight: 600;
		text-decoration: underline;
	}

	.packs-picker-list {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.picker-item-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		background: #f8fafc;
		gap: 12px;
	}

	.picker-item-info {
		display: flex;
		flex-direction: column;
		gap: 4px;
		flex: 1;
		min-width: 0;
	}

	.picker-item-name {
		font-size: 0.95rem;
		color: #0f172a;
	}

	.picker-item-meta {
		font-size: 0.78rem;
		color: #64748b;
	}

	.picker-item-desc {
		margin: 0;
		font-size: 0.8rem;
		color: #475569;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.picker-thumbs-row {
		display: flex;
		gap: 6px;
		margin-top: 2px;
	}

	.picker-thumb {
		width: 24px;
		height: 24px;
		object-fit: contain;
	}

	.btn-select-pack {
		padding: 6px 14px;
		background: #0ea5e9;
		color: #ffffff;
		border: none;
		border-radius: 6px;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		flex-shrink: 0;
		transition: background 0.15s;
	}

	.btn-select-pack:hover {
		background: #0284c7;
	}
</style>
