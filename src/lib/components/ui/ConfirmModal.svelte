<script lang="ts">
	/**
	 * @component ConfirmModal
	 * @domain ui
	 * @description Modale de confirmation générique accessible avec prise en charge d'états de chargement et de variantes visuelles.
	 *
	 * @responsibilities
	 * - Afficher un dialogue de confirmation standardisé (titre, message ou contenu personnalisé)
	 * - Gérer les boutons d'annulation et de validation (`primary` ou `danger`)
	 */
	import type { Snippet } from 'svelte';
	import Modal from '$lib/components/ui/Modal.svelte';

	interface Props {
		/** Contrôle l'ouverture de la modale */
		isOpen: boolean;
		/** Titre affiché dans l'en-tête de la modale */
		title: string;
		/** Message de confirmation en texte simple (optionnel si children est fourni) */
		message?: string;
		/** Libellé du bouton de confirmation */
		confirmLabel?: string;
		/** Libellé du bouton d'annulation */
		cancelLabel?: string;
		/** Variante visuelle du bouton d'action ('danger' ou 'primary') */
		variant?: 'danger' | 'primary';
		/** Désactive les boutons pendant l'exécution d'une action asynchrone */
		loading?: boolean;
		/** Callback exécuté lors de la confirmation */
		onconfirm: () => void | Promise<void>;
		/** Callback exécuté lors de l'annulation ou fermeture */
		oncancel?: () => void;
		/** Contenu enrichi optionnel dans le corps de la modale */
		children?: Snippet;
	}

	let {
		isOpen = $bindable(false),
		title,
		message,
		confirmLabel = 'Confirmer',
		cancelLabel = 'Annuler',
		variant = 'danger',
		loading = false,
		onconfirm,
		oncancel,
		children
	}: Props = $props();

	function handleCancel() {
		if (loading) return;
		isOpen = false;
		oncancel?.();
	}
</script>

<Modal bind:isOpen {title} onclose={handleCancel}>
	{#if message}
		<p class="confirm-message">{message}</p>
	{/if}
	{#if children}
		{@render children()}
	{/if}

	{#snippet footer()}
		<div class="confirm-actions">
			<button type="button" class="btn-cancel" onclick={handleCancel} disabled={loading}>
				{cancelLabel}
			</button>
			<button type="button" class="btn-confirm {variant}" onclick={onconfirm} disabled={loading}>
				{loading ? 'Chargement...' : confirmLabel}
			</button>
		</div>
	{/snippet}
</Modal>

<style>
	.confirm-message {
		margin: 0;
		font-size: 0.92rem;
		color: #475569;
		line-height: 1.5;
	}

	.confirm-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.65rem;
		width: 100%;
	}

	.btn-cancel {
		padding: 0.55rem 1rem;
		border-radius: 10px;
		border: 1px solid #e2e8f0;
		background: #ffffff;
		color: #475569;
		font-weight: 600;
		font-size: 0.88rem;
		cursor: pointer;
		transition: background 0.15s;
	}

	.btn-cancel:hover:not(:disabled) {
		background: #f8fafc;
	}

	.btn-confirm {
		padding: 0.55rem 1.1rem;
		border-radius: 10px;
		border: none;
		font-weight: 600;
		font-size: 0.88rem;
		color: #ffffff;
		cursor: pointer;
		transition:
			opacity 0.15s,
			transform 0.1s;
	}

	.btn-confirm.danger {
		background: #ef4444;
	}

	.btn-confirm.primary {
		background: #0f172a;
	}

	.btn-confirm:hover:not(:disabled) {
		opacity: 0.92;
	}

	.btn-cancel:disabled,
	.btn-confirm:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}
</style>
