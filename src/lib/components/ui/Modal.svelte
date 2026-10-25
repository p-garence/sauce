<!--
  @component Modal
  @domain ui
  @description Boîte de dialogue modale accessible avec fermeture Échap et clic sur l'arrière-plan.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	let {
		isOpen = $bindable(false),
		title,
		onclose,
		children,
		footer
	}: {
		isOpen: boolean;
		title?: string;
		onclose?: () => void;
		children?: Snippet;
		footer?: Snippet;
	} = $props();

	function handleClose() {
		isOpen = false;
		if (onclose) onclose();
	}

	function handleBackdrop(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			handleClose();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && isOpen) {
			handleClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<div class="modal-backdrop" role="presentation" onclick={handleBackdrop}>
		<div
			class="modal-panel"
			role="dialog"
			aria-modal="true"
			aria-labelledby={title ? 'modal-title' : undefined}
		>
			<header class="modal-header">
				{#if title}
					<h3 id="modal-title" class="modal-title">{title}</h3>
				{/if}
				<button type="button" class="modal-close-btn" onclick={handleClose} aria-label="Fermer">
					<Icon name="action.close" size={18} />
				</button>
			</header>

			<div class="modal-body">
				{#if children}
					{@render children()}
				{/if}
			</div>

			{#if footer}
				<footer class="modal-footer">
					{@render footer()}
				</footer>
			{/if}
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: var(--z-modal, 9999);
		padding: 16px;
	}

	.modal-panel {
		background: #ffffff;
		border-radius: 16px;
		width: 100%;
		max-width: 520px;
		box-shadow:
			0 20px 25px -5px rgba(0, 0, 0, 0.1),
			0 8px 10px -6px rgba(0, 0, 0, 0.1);
		display: flex;
		flex-direction: column;
		max-height: 90vh;
		overflow: hidden;
		animation: modal-appear 0.2s cubic-bezier(0.16, 1, 0.3, 1);
	}

	@keyframes modal-appear {
		from {
			opacity: 0;
			transform: scale(0.95);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		border-bottom: 1px solid #f1f5f9;
	}

	.modal-title {
		margin: 0;
		font-size: 1.15rem;
		font-weight: 600;
		color: #0f172a;
	}

	.modal-close-btn {
		background: none;
		border: none;
		font-size: 1.1rem;
		color: #64748b;
		cursor: pointer;
		padding: 4px 8px;
		border-radius: 8px;
		transition:
			background-color 0.2s,
			color 0.2s;
	}

	.modal-close-btn:hover {
		background: #f1f5f9;
		color: #0f172a;
	}

	.modal-body {
		padding: 20px;
		overflow-y: auto;
		flex: 1;
	}

	.modal-footer {
		padding: 12px 20px;
		border-top: 1px solid #f1f5f9;
		background: #fafafa;
		display: flex;
		justify-content: flex-end;
		gap: 12px;
	}
</style>
