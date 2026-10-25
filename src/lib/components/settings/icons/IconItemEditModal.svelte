<!--
  @component IconItemEditModal
  @domain settings/icons
  @description Modale d'édition ciblée d'une icône individuelle dans le thème personnalisé.
  @responsibilities
    - Afficher l'aperçu agrandi de l'icône sélectionnée
    - Permettre le téléversement d'un SVG ou d'une image de remplacement
    - Permettre de basculer vers le thème personnalisé
    - Permettre de rétablir l'icône par défaut
-->
<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconId } from '$lib/icons/types';
	import { iconTheme } from '$lib/client/iconTheme.svelte';

	interface IconEntry {
		id: IconId;
		label: string;
	}

	/**
	 * Propriétés du composant IconItemEditModal
	 */
	interface Props {
		/** Entrée d'icône en cours d'édition */
		icon: IconEntry;
		/** Callback pour fermer la modale */
		onClose: () => void;
		/** Callback lors du choix d'un fichier */
		onFileSelected: (e: Event) => void;
		/** Callback pour rétablir l'icône par défaut */
		onReset: (iconId: IconId) => void;
	}

	let {
		icon,
		onClose,
		onFileSelected,
		onReset
	}: Props = $props();

	let fileInputRef = $state<HTMLInputElement | null>(null);
	let isUploading = $state(false);

	async function handleFileChange(e: Event) {
		isUploading = true;
		try {
			await onFileSelected(e);
		} finally {
			isUploading = false;
		}
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="modal-backdrop" onclick={onClose}>
	<div class="modal-content" onclick={(e) => e.stopPropagation()}>
		<div class="modal-header">
			<h3>Modifier l'icône : {icon.label}</h3>
			<button type="button" class="btn-close-modal" onclick={onClose}>✕</button>
		</div>

		<div class="modal-body">
			<div class="preview-bubble">
				<Icon name={icon.id} size={48} />
			</div>

			{#if iconTheme.pack === 'sauce' && iconTheme.getCustomIcon(icon.id)}
				<span class="status-pill custom">✓ Personnalisée (Active)</span>
			{:else if iconTheme.getCustomIcon(icon.id)}
				<span class="status-pill in-memory">En mémoire (Active en mode Custom)</span>
			{:else}
				<span class="status-pill default">Rendu par défaut</span>
			{/if}

			<input
				type="file"
				accept="image/svg+xml,image/png,image/jpeg,image/webp,.svg,.png"
				bind:this={fileInputRef}
				onchange={handleFileChange}
				style="display: none;"
			/>

			<div class="modal-actions">
				<button
					type="button"
					class="btn-action-primary"
					disabled={isUploading}
					onclick={() => fileInputRef?.click()}
				>
					{isUploading ? 'Téléversement...' : 'Choisir un SVG ou une image'}
				</button>

				{#if iconTheme.pack !== 'sauce' && iconTheme.getCustomIcon(icon.id)}
					<button
						type="button"
						class="btn-action-switch-custom"
						onclick={() => iconTheme.setPack('sauce')}
					>
						Basculer sur le thème custom
					</button>
				{/if}

				{#if iconTheme.getCustomIcon(icon.id)}
					<button
						type="button"
						class="btn-action-secondary"
						onclick={() => onReset(icon.id)}
					>
						Rétablir le défaut
					</button>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
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
		max-width: 360px;
		background: #ffffff;
		border-radius: 16px;
		overflow: hidden;
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.18);
		animation: modalPop 0.15s ease-out;
	}

	@keyframes modalPop {
		from {
			opacity: 0;
			transform: scale(0.92);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
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

	.btn-close-modal {
		background: none;
		border: none;
		font-size: 1rem;
		color: #94a3b8;
		cursor: pointer;
		padding: 4px 8px;
		border-radius: 6px;
	}

	.btn-close-modal:hover {
		color: #0f172a;
		background: #f1f5f9;
	}

	.modal-body {
		padding: 24px 16px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
	}

	.preview-bubble {
		width: 80px;
		height: 80px;
		border-radius: 20px;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #0f172a;
	}

	.status-pill {
		font-size: 0.78rem;
		font-weight: 600;
		padding: 3px 10px;
		border-radius: 12px;
	}

	.status-pill.custom {
		background: #dcfce7;
		color: #15803d;
	}

	.status-pill.in-memory {
		background: #e0f2fe;
		color: #0369a1;
	}

	.status-pill.default {
		background: #f1f5f9;
		color: #64748b;
	}

	.modal-actions {
		display: flex;
		flex-direction: column;
		gap: 10px;
		width: 100%;
		margin-top: 8px;
	}

	.btn-action-primary {
		width: 100%;
		padding: 12px;
		background: #0ea5e9;
		color: #ffffff;
		border: none;
		border-radius: 10px;
		font-size: 0.9rem;
		font-weight: 700;
		cursor: pointer;
		transition: background-color 0.15s ease;
	}

	.btn-action-primary:hover:not(:disabled) {
		background: #0284c7;
	}

	.btn-action-primary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-action-switch-custom {
		width: 100%;
		padding: 10px;
		background: #f0fdf4;
		color: #16a34a;
		border: 1px solid #bbf7d0;
		border-radius: 10px;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-action-switch-custom:hover {
		background: #dcfce7;
	}

	.btn-action-secondary {
		width: 100%;
		padding: 10px;
		background: #f8fafc;
		color: #ef4444;
		border: 1px solid #fecaca;
		border-radius: 10px;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-action-secondary:hover {
		background: #fee2e2;
	}
</style>
