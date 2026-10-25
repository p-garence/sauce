<script lang="ts">
	/**
	 * @component EmojiButton
	 * @domain UI / Emojis
	 * @description Bouton déclencheur ouvrant le sélecteur popover d'émojis
	 * @responsibilities
	 * - Proposer différentes variantes graphiques (inline, toolbar, compact, editor)
	 * - Piloter l'état d'ouverture/fermeture du popover
	 * - Déléguer la gestion et la sélection des collections d'émojis à EmojiPickerPopover
	 */
	import EmojiPickerPopover from '$lib/components/ui/EmojiPickerPopover.svelte';
	import type { EmojiItem } from '$lib/types';

	interface Props {
		/** Callback déclenché lors de la sélection d'un émoji */
		onSelect: (emoji: EmojiItem) => void;
		/** Désactiver le bouton */
		disabled?: boolean;
		/** Variante graphique du bouton déclencheur */
		variant?: 'toolbar' | 'inline' | 'compact' | 'editor';
		/** Alignement horizontal du sélecteur */
		align?: 'left' | 'right';
		/** Placement vertical du sélecteur */
		placement?: 'top' | 'bottom';
		/** Classes CSS additionnelles */
		class?: string;
	}

	let {
		onSelect,
		disabled = false,
		variant = 'inline',
		align = 'right',
		placement = 'top',
		class: customClass = ''
	}: Props = $props();

	let isOpen = $state(false);

	function toggleOpen(e: MouseEvent) {
		e.stopPropagation();
		e.preventDefault();
		isOpen = !isOpen;
	}

	function closePicker() {
		isOpen = false;
	}

	function handleSelect(emoji: EmojiItem) {
		onSelect(emoji);
		closePicker();
	}
</script>

<div class="emoji-button-container {customClass}">
	<button
		type="button"
		class="btn-emoji-trigger {variant}"
		class:active={isOpen}
		title="Émojis personnalisés"
		onpointerdown={(e) => e.preventDefault()}
		onclick={toggleOpen}
		{disabled}
		aria-haspopup="dialog"
		aria-expanded={isOpen}
	>
		<svg
			viewBox="0 0 24 24"
			width={variant === 'compact' ? 16 : variant === 'toolbar' ? 18 : 20}
			height={variant === 'compact' ? 16 : variant === 'toolbar' ? 18 : 20}
			stroke="currentColor"
			stroke-width="2"
			fill="none"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<circle cx="12" cy="12" r="10" />
			<path d="M8 14s1.5 2 4 2 4-2 4-2" />
			<line x1="9" y1="9" x2="9.01" y2="9" />
			<line x1="15" y1="9" x2="15.01" y2="9" />
		</svg>
	</button>

	{#if isOpen}
		<EmojiPickerPopover
			{align}
			{placement}
			onSelect={handleSelect}
			onClose={closePicker}
		/>
	{/if}
</div>

<style>
	.emoji-button-container {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	/* Trigger variants */
	.btn-emoji-trigger {
		background: none;
		border: none;
		color: #64748b;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		transition: all 0.15s ease;
	}

	.btn-emoji-trigger:hover:not(:disabled) {
		color: #0ea5e9;
	}

	.btn-emoji-trigger.active {
		color: #0ea5e9;
		background: #e0f2fe;
	}

	.btn-emoji-trigger:disabled {
		color: #cbd5e1;
		cursor: not-allowed;
	}

	/* Variant: inline (pour barre de commentaire) */
	.btn-emoji-trigger.inline {
		width: 38px;
		height: 38px;
		border-radius: 50%;
	}
	.btn-emoji-trigger.inline:hover:not(:disabled) {
		background: #f0f9ff;
	}

	/* Variant: toolbar (pour barre d'action du chat) */
	.btn-emoji-trigger.toolbar {
		width: 34px;
		height: 34px;
		border-radius: 8px;
	}
	.btn-emoji-trigger.toolbar:hover:not(:disabled) {
		background: #f1f5f9;
	}

	/* Variant: compact (pour formulaire d'édition) */
	.btn-emoji-trigger.compact {
		width: 26px;
		height: 26px;
		border-radius: 4px;
	}
	.btn-emoji-trigger.compact:hover:not(:disabled) {
		background: #e2e8f0;
	}

	/* Variant: editor (pour éditeur d'images TextEditOverlay) */
	.btn-emoji-trigger.editor {
		width: 36px;
		height: 36px;
		border-radius: 10px;
		background: #252525;
		border: 1px solid #444;
		color: #fff;
	}
	.btn-emoji-trigger.editor:hover:not(:disabled) {
		background: #333;
		border-color: #0095f6;
		color: #fff;
	}
	.btn-emoji-trigger.editor.active {
		background: #333;
		border-color: #0095f6;
		color: #0095f6;
	}
</style>
