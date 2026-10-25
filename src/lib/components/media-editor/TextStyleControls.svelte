<!--
  @component TextStyleControls
  @domain media-editor
  @description Barre de contrôle du style typographique (polices et couleurs) dans l'éditeur de texte.
  @responsibilities
    - Proposer les boutons de bascule pour la police et la couleur
    - Afficher le sélecteur horizontal de polices
    - Afficher la palette horizontale de couleurs
    - Mettre à jour les propriétés visuelles de l'objet TextItem
-->
<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { EDITOR_FONTS, EDITOR_COLORS, type EditorFont } from '$lib/constants';
	import type { TextItem } from './types';

	/**
	 * Propriétés du composant TextStyleControls
	 */
	interface Props {
		/** Élément texte en cours d'édition */
		activeText: TextItem;
		/** Police actuellement active */
		activeFont: EditorFont;
		/** Indique si le volet des polices est déroulé */
		showFontPicker: boolean;
		/** Indique si le volet des couleurs est déroulé */
		showColorPicker: boolean;
		/** Bascule de l'affichage du volet des polices */
		onToggleFontPicker: () => void;
		/** Bascule de l'affichage du volet des couleurs */
		onToggleColorPicker: () => void;
		/** Sélection d'une nouvelle police */
		onSelectFont: (font: EditorFont) => void;
		/** Sélection d'une nouvelle couleur */
		onSelectColor: (color: string) => void;
	}

	let {
		activeText = $bindable(),
		activeFont,
		showFontPicker,
		showColorPicker,
		onToggleFontPicker,
		onToggleColorPicker,
		onSelectFont,
		onSelectColor
	}: Props = $props();
</script>

<div class="style-controls-group">
	<!-- Bouton Police -->
	<button
		type="button"
		class="btn-picker"
		class:active={showFontPicker}
		onpointerdown={(e) => e.preventDefault()}
		onclick={onToggleFontPicker}
	>
		<span class="btn-icon"><Icon name="media.text" size={16} /></span>
		<span class="btn-label">{activeFont.label}</span>
		<span class="caret">{showFontPicker ? '▴' : '▾'}</span>
	</button>

	<!-- Bouton Couleur -->
	<button
		type="button"
		class="btn-picker"
		class:active={showColorPicker}
		onpointerdown={(e) => e.preventDefault()}
		onclick={onToggleColorPicker}
	>
		<span class="color-dot" style="background-color: {activeText.color}"></span>
		<span class="btn-label">Couleur</span>
		<span class="caret">{showColorPicker ? '▴' : '▾'}</span>
	</button>
</div>

<!-- Déroulé des polices directement sous les boutons du haut -->
{#if showFontPicker}
	<div class="quick-options-row fonts-row">
		{#each EDITOR_FONTS as font (font.family)}
			<button
				type="button"
				class="chip-option"
				class:selected={activeText.fontFamily === font.family}
				style="font-family: {font.family}; font-weight: {font.weight};"
				onpointerdown={(e) => e.preventDefault()}
				onclick={() => onSelectFont(font)}
			>
				{font.label}
			</button>
		{/each}
	</div>
{/if}

<!-- Déroulé des couleurs directement sous les boutons du haut -->
{#if showColorPicker}
	<div class="quick-options-row colors-row">
		{#each EDITOR_COLORS as color (color)}
			<button
				type="button"
				class="color-option-dot"
				class:selected={activeText.color === color}
				style="background-color: {color};"
				onpointerdown={(e) => e.preventDefault()}
				onclick={() => onSelectColor(color)}
				aria-label={`Couleur ${color}`}
			></button>
		{/each}
	</div>
{/if}

<style>
	.style-controls-group {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.btn-picker {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		background: rgba(255, 255, 255, 0.12);
		border: 1px solid rgba(255, 255, 255, 0.18);
		color: #ffffff;
		padding: 6px 12px;
		border-radius: 20px;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s ease;
		user-select: none;
	}

	.btn-picker:hover {
		background: rgba(255, 255, 255, 0.22);
	}

	.btn-picker.active {
		background: #ffffff;
		color: #0f172a;
		border-color: #ffffff;
	}

	.btn-icon {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.btn-label {
		max-width: 90px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.color-dot {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		border: 1px solid rgba(255, 255, 255, 0.6);
		display: inline-block;
	}

	.caret {
		font-size: 0.75rem;
		opacity: 0.7;
	}

	.quick-options-row {
		display: flex;
		align-items: center;
		gap: 8px;
		overflow-x: auto;
		padding: 8px 4px;
		margin-top: 6px;
		scrollbar-width: none;
	}

	.quick-options-row::-webkit-scrollbar {
		display: none;
	}

	.chip-option {
		padding: 6px 14px;
		border-radius: 16px;
		background: rgba(255, 255, 255, 0.15);
		border: 1px solid rgba(255, 255, 255, 0.25);
		color: #ffffff;
		font-size: 0.85rem;
		white-space: nowrap;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.chip-option:hover {
		background: rgba(255, 255, 255, 0.25);
	}

	.chip-option.selected {
		background: #ffffff;
		color: #0f172a;
		border-color: #ffffff;
	}

	.color-option-dot {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: 2px solid rgba(255, 255, 255, 0.4);
		cursor: pointer;
		flex-shrink: 0;
		padding: 0;
		transition: transform 0.15s ease;
	}

	.color-option-dot:hover {
		transform: scale(1.15);
	}

	.color-option-dot.selected {
		border-color: #ffffff;
		box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.8);
		transform: scale(1.1);
	}
</style>
