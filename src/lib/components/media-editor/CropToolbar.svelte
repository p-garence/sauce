<script lang="ts">
	interface Props {
		zoom: number;
		canUndo: boolean;
		canRedo: boolean;
		onZoomChange: (zoom: number) => void;
		onAddText: () => void;
		onStartDrawing: () => void;
		onAddImage?: (file: File) => void;
		onUndo: () => void;
		onRedo: () => void;
	}

	import Icon from '$lib/components/ui/Icon.svelte';

	let {
		zoom,
		canUndo,
		canRedo,
		onZoomChange,
		onAddText,
		onStartDrawing,
		onAddImage,
		onUndo,
		onRedo
	}: Props = $props();

	let fileInputRef = $state<HTMLInputElement>();

	function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files && input.files[0]) {
			onAddImage?.(input.files[0]);
			input.value = '';
		}
	}
</script>

<div class="controls standard-controls">
	<!-- Ligne 1 : Slider Zoom plein écran -->
	<div class="slider-row">
		<span class="icon"><Icon name="action.search" size={16} /></span>
		<input
			type="range"
			min="0.5"
			max="3"
			step="0.01"
			value={zoom}
			oninput={(e) => onZoomChange(parseFloat(e.currentTarget.value))}
		/>
	</div>

	<!-- Ligne 2 : Boutons d'outils positionnés en dessous du slider -->
	<div class="tools-under-slider">
		<button type="button" class="btn-tool" onclick={onAddText} title="Ajouter du texte">
			<span class="tool-icon"><Icon name="media.text" size={16} /></span>
			<span class="tool-label">Texte</span>
		</button>

		{#if onAddImage}
			<button
				type="button"
				class="btn-tool"
				onclick={() => fileInputRef?.click()}
				title="Ajouter une image par-dessus"
			>
				<span class="tool-icon"><Icon name="media.image" size={16} /></span>
				<span class="tool-label">Image</span>
			</button>
			<input
				bind:this={fileInputRef}
				type="file"
				accept="image/*"
				style="display: none;"
				onchange={handleFileSelect}
			/>
		{/if}

		<button type="button" class="btn-tool" onclick={onStartDrawing} title="Dessiner sur l'image">
			<span class="tool-icon"><Icon name="action.edit" size={16} /></span>
			<span class="tool-label">Dessiner</span>
		</button>

		<div class="tools-spacer"></div>

		<button
			type="button"
			class="btn-tool btn-undo"
			onclick={onUndo}
			disabled={!canUndo}
			title="Revenir en arrière (Annuler)"
		>
			<span class="tool-icon"><Icon name="media.prev" size={16} /></span>
			<span class="tool-label">Annuler</span>
		</button>

		<button
			type="button"
			class="btn-tool btn-redo"
			onclick={onRedo}
			disabled={!canRedo}
			title="Revenir en avant (Rétablir)"
		>
			<span class="tool-icon"><Icon name="media.next" size={16} /></span>
			<span class="tool-label">Rétablir</span>
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
		padding-bottom: env(safe-area-inset-bottom, 0px);
	}

	.standard-controls {
		display: flex;
		flex-direction: column;
		padding: 10px 16px;
		gap: 10px;
	}

	.slider-row {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
	}

	.icon {
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

	@media (max-width: 540px) {
		.tool-label {
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

		.tools-under-slider {
			gap: 10px;
		}
	}
</style>
