<script lang="ts">
	import { EDITOR_COLORS } from '$lib/constants';
	import Icon from '$lib/components/ui/Icon.svelte';

	interface Props {
		brushColor: string;
		brushRelSize: number;
		canUndo: boolean;
		canClear: boolean;
		onColorChange: (color: string) => void;
		onSizeChange: (size: number) => void;
		onUndo: () => void;
		onClear: () => void;
		onFinish: () => void;
	}

	let {
		brushColor,
		brushRelSize,
		canUndo,
		canClear,
		onColorChange,
		onSizeChange,
		onUndo,
		onClear,
		onFinish
	}: Props = $props();

	let showColorPicker = $state(false);
</script>

<div class="controls draw-toolbar">
	<!-- Ligne 1 : Épaisseur du pinceau -->
	<div class="slider-row">
		<span class="slider-tag">Taille</span>
		<input
			type="range"
			min="0.004"
			max="0.06"
			step="0.002"
			value={brushRelSize}
			oninput={(e) => onSizeChange(parseFloat(e.currentTarget.value))}
		/>
	</div>

	<!-- Ligne 2 : Outils de dessin sous le slider -->
	<div class="tools-under-slider">
		<!-- Couleur du pinceau -->
		<div class="picker-wrapper">
			<button
				type="button"
				class="btn-tool"
				onclick={() => (showColorPicker = !showColorPicker)}
				title="Couleur du pinceau"
			>
				<span class="color-bullet" style="background-color: {brushColor}"></span>
				<span class="tool-label">Couleur</span>
				<span class="caret">▾</span>
			</button>
			{#if showColorPicker}
				<div class="popover-menu color-popover">
					<div class="color-palette-grid">
						{#each EDITOR_COLORS as color (color)}
							<button
								type="button"
								class="palette-dot"
								class:selected={brushColor === color}
								style="background-color: {color};"
								onclick={() => {
									onColorChange(color);
									showColorPicker = false;
								}}
								aria-label={`Couleur ${color}`}
							></button>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<button
			type="button"
			class="btn-tool"
			onclick={onUndo}
			disabled={!canUndo}
			title="Annuler le dernier trait"
		>
			<span class="tool-icon"><Icon name="media.prev" size={16} /></span>
			<span class="tool-label">Annuler</span>
		</button>

		<button
			type="button"
			class="btn-tool"
			onclick={onClear}
			disabled={!canClear}
			title="Tout effacer"
		>
			<span class="tool-icon"><Icon name="action.delete" size={16} /></span>
			<span class="tool-label">Effacer</span>
		</button>

		<div class="tools-spacer"></div>

		<button type="button" class="btn-validate" onclick={onFinish} title="Terminer le dessin">
			<span class="validate-icon"><Icon name="action.check" size={16} color="white" /></span>
			<span class="validate-label">Terminer</span>
		</button>
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

	.draw-toolbar {
		display: flex;
		flex-direction: column;
		padding: 10px 16px calc(10px + env(safe-area-inset-bottom, 0px));
		gap: 10px;
	}

	@media (min-width: 600px) {
		.draw-toolbar {
			padding: 10px 16px;
		}
	}

	.slider-row {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
	}

	.slider-tag {
		font-size: 1.15rem;
		flex-shrink: 0;
	}

	.tools-under-slider {
		display: flex;
		align-items: center;
		gap: 8px;
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
	.btn-tool:hover:not(:disabled) {
		background: #282828;
		border-color: #555;
	}
	.btn-tool:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.tool-icon {
		font-size: 1rem;
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

	.picker-wrapper {
		position: relative;
	}

	.caret {
		font-size: 0.75rem;
		color: #888;
	}

	.color-bullet {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		border: 1.5px solid #fff;
		display: inline-block;
	}

	.popover-menu {
		position: absolute;
		bottom: calc(100% + 8px);
		left: 0;
		background: #1c1c1c;
		border: 1px solid #333;
		border-radius: 12px;
		box-shadow: 0 12px 36px rgba(0, 0, 0, 0.75);
		z-index: 100;
		padding: 10px;
	}

	.color-palette-grid {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 8px;
	}

	.palette-dot {
		width: 30px;
		height: 30px;
		border-radius: 50%;
		border: 2px solid #222;
		cursor: pointer;
		transition: transform 0.15s;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
	}
	.palette-dot:hover {
		transform: scale(1.15);
	}
	.palette-dot.selected {
		transform: scale(1.2);
		border-color: #0095f6;
		box-shadow: 0 0 0 2px #0095f6;
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

		.tools-under-slider {
			gap: 10px;
		}
	}
</style>
