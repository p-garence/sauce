<script lang="ts">
	import type { TextItem } from './types';
	import Icon from '$lib/components/ui/Icon.svelte';
	import TextAlignSelector from '$lib/components/ui/TextAlignSelector.svelte';

	interface Props {
		activeText: TextItem;
		onEdit: () => void;
		onToggleBackground: () => void;
		onDelete: () => void;
		onValidate: () => void;
	}

	let { activeText, onEdit, onToggleBackground, onDelete, onValidate }: Props = $props();
</script>

<div class="controls text-toolbar">
	<!-- Ligne 1 : Bouton Modifier le texte, Fond, Alignement, Supprimer, Valider -->
	<div class="toolbar-row pickers-row">
		<button type="button" class="btn-tool" onclick={onEdit} title="Modifier le texte et le style">
			<span class="tool-icon"><Icon name="action.edit" size={16} /></span>
			<span class="tool-label">Modifier</span>
		</button>

		<button
			type="button"
			class="btn-icon"
			class:active={activeText.hasBackground}
			onclick={onToggleBackground}
			title="Fond contrasté"
		>
			<span class="square-icon-box"></span>
		</button>

		<TextAlignSelector bind:align={activeText.align} variant="editor" />

		<div class="tools-spacer"></div>

		<button type="button" class="btn-icon danger" onclick={onDelete} title="Supprimer le texte">
			<span><Icon name="action.delete" size={16} /></span>
		</button>

		<button
			type="button"
			class="btn-validate"
			onclick={onValidate}
			title="Valider le texte sur l'image"
		>
			<span class="validate-icon"><Icon name="action.check" size={16} color="white" /></span>
			<span class="validate-label">Valider</span>
		</button>
	</div>

	<!-- Ligne 2 : Curseurs superposés (Rotation, Taille, Cadre) -->
	<div class="adjustments-column">
		<div class="slider-box" title="Rotation du texte">
			<span class="slider-tag">Rotation</span>
			<input
				type="range"
				min="-180"
				max="180"
				step="1"
				value={activeText.rotation}
				oninput={(e) => {
					activeText.rotation = parseInt(e.currentTarget.value, 10);
				}}
			/>
			<button
				type="button"
				class="btn-zero-reset"
				onclick={() => {
					activeText.rotation = 0;
				}}
				title="Remettre à 0°"
			>
				{activeText.rotation}°
			</button>
		</div>

		<div class="slider-box" title="Taille de la police">
			<span class="slider-tag">Taille</span>
			<input
				type="range"
				min="0.015"
				max="0.18"
				step="0.003"
				value={activeText.relFontSize}
				oninput={(e) => {
					activeText.relFontSize = parseFloat(e.currentTarget.value);
				}}
			/>
		</div>

		<div class="slider-box" title="Largeur du cadre de texte">
			<span class="slider-tag">Cadre</span>
			<input
				type="range"
				min="0.15"
				max="0.75"
				step="0.01"
				value={Math.min(0.75, activeText.relWidth)}
				oninput={(e) => {
					activeText.relWidth = Math.min(0.75, parseFloat(e.currentTarget.value));
				}}
			/>
			<span class="slider-val"
				>{Math.round((Math.min(0.75, activeText.relWidth) / 0.75) * 100)}%</span
			>
		</div>
	</div>
</div>

<style>
	input[type='range'] {
		flex: 1;
		min-width: 0;
		-webkit-appearance: none;
		appearance: none;
		background: transparent;
	}
	input[type='range']:focus {
		outline: none;
	}
	input[type='range']::-webkit-slider-runnable-track {
		height: 2px;
		background: #555;
		border: none;
		border-radius: 2px;
	}
	input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 18px;
		height: 18px;
		background: #fff;
		border-radius: 50%;
		margin-top: -8px;
		cursor: pointer;
		border: none;
	}
	input[type='range']::-moz-range-track {
		height: 2px;
		background: #555;
		border: none;
		border-radius: 2px;
	}
	input[type='range']::-moz-range-thumb {
		width: 18px;
		height: 18px;
		background: #fff;
		border-radius: 50%;
		border: none;
		cursor: pointer;
	}

	.controls {
		flex-shrink: 0;
		background: #000;
		border-top: 1px solid #222;
	}

	.text-toolbar {
		display: flex;
		flex-direction: column;
		padding: 10px 14px calc(10px + env(safe-area-inset-bottom, 0px));
		gap: 10px;
		background: #111;
		position: relative;
	}

	@media (min-width: 600px) {
		.text-toolbar {
			padding: 10px 14px;
		}
	}

	.toolbar-row {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
	}

	.pickers-row {
		display: flex;
		gap: 10px;
	}

	.adjustments-column {
		display: flex;
		flex-direction: column;
		gap: 6px;
		width: 100%;
	}

	.tools-spacer {
		flex: 1;
	}

	.btn-tool {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		background: #1c1c1c;
		border: 1px solid #333;
		color: #fff;
		padding: 8px 12px;
		border-radius: 18px;
		font-size: 0.88rem;
		font-weight: 500;
		cursor: pointer;
		min-height: 40px;
		transition: all 0.15s ease;
		white-space: nowrap;
	}
	.btn-tool:hover {
		background: #282828;
		border-color: #555;
	}

	.tool-icon {
		font-size: 1rem;
	}

	.btn-icon {
		width: 40px;
		height: 40px;
		border-radius: 8px;
		background: #222;
		border: 1px solid #383838;
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		font-size: 1rem;
		flex-shrink: 0;
		transition: all 0.2s;
	}
	.btn-icon:hover {
		background: #2c2c2c;
		border-color: #555;
	}
	.btn-icon.active {
		background: #2c2c2c;
		border-color: #0095f6;
	}
	.btn-icon.danger {
		color: #ef4444;
	}
	.btn-icon.danger:hover {
		background: rgba(239, 68, 68, 0.15);
		border-color: #ef4444;
	}

	.btn-validate {
		height: 40px;
		padding: 0 14px;
		border-radius: 8px;
		background: #0095f6;
		border: none;
		color: #fff;
		font-weight: 600;
		font-size: 0.95rem;
		display: flex;
		align-items: center;
		gap: 6px;
		cursor: pointer;
		flex-shrink: 0;
		transition: background 0.2s;
	}
	.btn-validate:hover {
		background: #1877f2;
	}

	.slider-box {
		width: 100%;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		gap: 8px;
		background: #1c1c1c;
		padding: 6px 10px;
		border-radius: 8px;
		border: 1px solid #2a2a2a;
	}

	.slider-tag {
		font-size: 0.8rem;
		color: #aaa;
		font-weight: 500;
		user-select: none;
		flex-shrink: 0;
		min-width: 68px;
	}

	.btn-zero-reset {
		background: #2a2a2a;
		border: 1px solid #444;
		color: #ccc;
		font-size: 0.72rem;
		padding: 2px 5px;
		border-radius: 4px;
		cursor: pointer;
		white-space: nowrap;
		flex-shrink: 0;
	}
	.btn-zero-reset:hover {
		color: #fff;
		border-color: #666;
	}
	.square-icon-box {
		display: inline-block;
		width: 14px;
		height: 14px;
		border: 2px solid currentColor;
		border-radius: 3px;
	}

	.slider-val {
		color: #bbb;
		font-size: 0.72rem;
		min-width: 38px;
		text-align: right;
		flex-shrink: 0;
		font-variant-numeric: tabular-nums;
	}

	@media (max-width: 540px) {
		.tool-label,
		.validate-label {
			display: none;
		}

		.btn-tool {
			padding: 8px;
			min-width: 42px;
			width: 42px;
			height: 42px;
			justify-content: center;
			border-radius: 10px;
		}

		.btn-validate {
			padding: 0 12px;
			min-width: 42px;
			height: 42px;
			justify-content: center;
			border-radius: 10px;
		}

		.btn-icon {
			width: 42px;
			height: 42px;
		}

		.pickers-row {
			gap: 8px;
		}
	}
</style>
