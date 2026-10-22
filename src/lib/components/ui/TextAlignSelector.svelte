<!--
  @component TextAlignSelector
  @domain ui
  @description Bouton cyclique de sélection de l'alignement du texte (gauche, centre, droite).
-->
<script lang="ts">
	let {
		align = $bindable<'left' | 'center' | 'right'>(),
		onSelect = undefined,
		variant = 'inline',
		class: customClass = ''
	}: {
		align?: 'left' | 'center' | 'right';
		onSelect?: (align: 'left' | 'center' | 'right') => void;
		variant?: 'inline' | 'editor';
		class?: string;
	} = $props();

	let effectiveAlign = $derived(align || 'center');

	function cycleAlign() {
		const next: 'left' | 'center' | 'right' =
			effectiveAlign === 'left' ? 'center' : effectiveAlign === 'center' ? 'right' : 'left';
		align = next;
		onSelect?.(next);
	}

	let titleText = $derived(
		effectiveAlign === 'left'
			? 'Aligné à gauche (cliquer pour centrer)'
			: effectiveAlign === 'center'
				? 'Centré (cliquer pour aligner à droite)'
				: 'Aligné à droite (cliquer pour aligner à gauche)'
	);
</script>

<button
	type="button"
	class="btn-align-trigger {variant} {customClass}"
	onpointerdown={(e) => e.preventDefault()}
	onclick={cycleAlign}
	title={titleText}
	aria-label={titleText}
>
	<svg
		width="20"
		height="20"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2.2"
		stroke-linecap="round"
		class="align-icon align-{effectiveAlign}"
	>
		<!-- Ligne 1 : pleine largeur -->
		<line x1="3" y1="6" x2="21" y2="6"></line>
		<!-- Ligne 2 : animée selon l'alignement -->
		<line
			x1={effectiveAlign === 'left' ? 3 : effectiveAlign === 'center' ? 6 : 11}
			y1="12"
			x2={effectiveAlign === 'left' ? 13 : effectiveAlign === 'center' ? 18 : 21}
			y2="12"
		></line>
		<!-- Ligne 3 : animée selon l'alignement -->
		<line
			x1={effectiveAlign === 'left' ? 3 : effectiveAlign === 'center' ? 4 : 7}
			y1="18"
			x2={effectiveAlign === 'left' ? 17 : effectiveAlign === 'center' ? 20 : 21}
			y2="18"
		></line>
	</svg>
</button>

<style>
	.btn-align-trigger {
		background: none;
		border: none;
		color: #64748b;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		transition: all 0.15s ease;
		flex-shrink: 0;
	}

	.btn-align-trigger:hover {
		color: #0ea5e9;
	}

	.btn-align-trigger:active svg {
		transform: scale(0.85);
	}

	.btn-align-trigger svg {
		transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.btn-align-trigger svg line {
		transition:
			x1 0.22s cubic-bezier(0.4, 0, 0.2, 1),
			x2 0.22s cubic-bezier(0.4, 0, 0.2, 1);
	}

	/* Variant: inline (style calqué sur EmojiButton) */
	.btn-align-trigger.inline {
		width: 38px;
		height: 38px;
		border-radius: 50%;
	}

	.btn-align-trigger.inline:hover {
		background: #f0f9ff;
	}

	/* Variant: editor (pour TextToolbar) */
	.btn-align-trigger.editor {
		width: 40px;
		height: 40px;
		border-radius: 8px;
		background: #222;
		border: 1px solid #383838;
		color: #fff;
	}

	.btn-align-trigger.editor:hover {
		background: #2c2c2c;
		border-color: #555;
		color: #fff;
	}

	@media (max-width: 540px) {
		.btn-align-trigger.editor {
			width: 42px;
			height: 42px;
		}
	}
</style>
