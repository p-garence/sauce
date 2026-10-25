<script lang="ts">
	import type { ImageOverlayItem } from './types';
	import Icon from '$lib/components/ui/Icon.svelte';

	interface Props {
		activeImage: ImageOverlayItem;
		onCycleShape: () => void;
		onDelete: () => void;
		onValidate: () => void;
	}

	let { activeImage, onCycleShape, onDelete, onValidate }: Props = $props();
</script>

<div class="controls image-toolbar">
	<!-- Ligne 1 : Bouton Forme, Supprimer, Valider -->
	<div class="toolbar-row pickers-row">
		<button
			type="button"
			class="btn-tool"
			onclick={onCycleShape}
			title="Changer la forme (Bords arrondis / Cercle / Carré)"
		>
			<span class="shape-indicator {activeImage.shape}"></span>
			<span class="tool-label">
				{#if activeImage.shape === 'rounded'}
					Arrondi
				{:else if activeImage.shape === 'circle'}
					Cercle
				{:else}
					Carré
				{/if}
			</span>
		</button>

		<div class="tools-spacer"></div>

		<button type="button" class="btn-icon danger" onclick={onDelete} title="Supprimer l'image">
			<span><Icon name="action.delete" size={16} /></span>
		</button>

		<button
			type="button"
			class="btn-validate"
			onclick={onValidate}
			title="Valider la position de l'image"
		>
			<span class="validate-icon"><Icon name="action.check" size={16} color="white" /></span>
			<span class="validate-label">Valider</span>
		</button>
	</div>

	<!-- Ligne 2 : Curseurs superposés (Rotation & Taille) -->
	<div class="adjustments-column">
		<div class="slider-box" title="Rotation de l'image">
			<span class="slider-tag">Rotation</span>
			<input
				type="range"
				min="-180"
				max="180"
				step="1"
				value={activeImage.rotation}
				oninput={(e) => {
					activeImage.rotation = parseInt(e.currentTarget.value, 10);
				}}
			/>
			<button
				type="button"
				class="btn-zero-reset"
				onclick={() => {
					activeImage.rotation = 0;
				}}
				title="Remettre à 0°"
			>
				{activeImage.rotation}°
			</button>
		</div>

		<div class="slider-box" title="Taille de l'image">
			<span class="slider-tag">Taille</span>
			<input
				type="range"
				min="0.15"
				max="0.85"
				step="0.01"
				value={activeImage.relScale}
				oninput={(e) => {
					activeImage.relScale = parseFloat(e.currentTarget.value);
				}}
			/>
			<span class="slider-val">{Math.round((activeImage.relScale / 0.85) * 100)}%</span>
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
		padding-bottom: env(safe-area-inset-bottom, 0px);
	}

	.image-toolbar {
		display: flex;
		flex-direction: column;
		padding: 10px 14px;
		gap: 10px;
		background: #111;
		padding-bottom: max(10px, env(safe-area-inset-bottom, 10px));
		position: relative;
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
		background: #222;
		border: 1px solid #333;
		color: #fff;
		padding: 6px 12px;
		border-radius: 20px;
		font-size: 0.8rem;
		font-weight: 500;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		transition:
			background 0.2s,
			border-color 0.2s;
	}
	.btn-tool:hover {
		background: #333;
		border-color: #555;
	}

	.shape-indicator {
		width: 14px;
		height: 14px;
		border: 2px solid #fff;
		display: inline-block;
		box-sizing: border-box;
	}
	.shape-indicator.rounded {
		border-radius: 4px;
	}
	.shape-indicator.circle {
		border-radius: 50%;
	}
	.shape-indicator.square {
		border-radius: 0;
	}

	.btn-icon {
		background: #222;
		border: 1px solid #333;
		color: #fff;
		width: 34px;
		height: 34px;
		border-radius: 50%;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		transition: background 0.2s;
	}
	.btn-icon:hover {
		background: #333;
	}
	.btn-icon.danger {
		color: #ef4444;
	}
	.btn-icon.danger:hover {
		background: rgba(239, 68, 68, 0.2);
	}

	.btn-validate {
		background: #10b981;
		border: none;
		color: #fff;
		padding: 6px 14px;
		border-radius: 20px;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		transition:
			opacity 0.2s,
			background 0.2s;
	}
	.btn-validate:hover {
		background: #059669;
	}

	.slider-box {
		display: flex;
		align-items: center;
		gap: 10px;
		background: rgba(255, 255, 255, 0.05);
		padding: 5px 10px;
		border-radius: 8px;
	}

	.slider-tag {
		font-size: 0.75rem;
		color: #888;
		width: 55px;
		text-transform: uppercase;
		font-weight: 600;
	}

	.slider-val {
		font-size: 0.75rem;
		color: #bbb;
		width: 42px;
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.btn-zero-reset {
		background: #262626;
		border: 1px solid #404040;
		color: #ddd;
		font-size: 0.75rem;
		padding: 2px 6px;
		border-radius: 4px;
		cursor: pointer;
		width: 44px;
		text-align: center;
		font-variant-numeric: tabular-nums;
	}
	.btn-zero-reset:hover {
		background: #333;
		color: #fff;
	}
</style>
