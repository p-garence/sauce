<script lang="ts">
	/**
	 * @component CarouselThumbnailsBar
	 * @domain post
	 * @description Barre de navigation horizontale des miniatures d'un carrousel en cours d'édition.
	 *
	 * @responsibilities
	 * - Afficher la rangée de miniatures avec indicateur de la slide actuellement sélectionnée.
	 * - Proposer les boutons de réordonnancement (déplacement gauche/droite).
	 * - Fournir les boutons rapides d'ajout d'une nouvelle slide texte ou média.
	 */

	import Icon from '$lib/components/ui/Icon.svelte';
	import type { EditorCarouselItem } from '$lib/types';

	interface Props {
		/** Liste ordonnée des slides du carrousel */
		items: EditorCarouselItem[];
		/** Index de la slide actuellement active (bindable) */
		currentIndex: number;
		/** Callback pour déplacer une slide vers la gauche ou la droite */
		onMove?: (index: number, direction: 'left' | 'right') => void;
		/** Callback déclenchant la sélection de fichier pour ajouter un média */
		onAddMedia?: () => void;
		/** Callback pour ajouter un nouveau panneau de texte */
		onAddText?: () => void;
	}

	let {
		items,
		currentIndex = $bindable(0),
		onMove,
		onAddMedia,
		onAddText
	}: Props = $props();

	function handleMove(index: number, direction: 'left' | 'right') {
		if (onMove) {
			onMove(index, direction);
		} else {
			const targetIndex = direction === 'left' ? index - 1 : index + 1;
			if (targetIndex >= 0 && targetIndex < items.length) {
				const temp = items[index];
				items[index] = items[targetIndex];
				items[targetIndex] = temp;
				currentIndex = targetIndex;
			}
		}
	}
</script>

<div class="carousel-controls">
	<div class="thumbnails">
		{#each items as item, i (item.id)}
			<div class="thumb-wrapper" class:active={i === currentIndex}>
				{#if i === currentIndex && i > 0}
					<button
						type="button"
						class="move-btn left"
						onclick={() => handleMove(i, 'left')}
						aria-label="Déplacer vers la gauche"
					>
						<Icon name="media.prev" size={14} />
					</button>
				{/if}

				<button
					type="button"
					class="thumb-content"
					onclick={() => (currentIndex = i)}
					aria-label={`Sélectionner la slide ${i + 1}`}
				>
					{#if item.type === 'text'}
						<div class="thumb-text-icon">Aa</div>
					{:else}
						<img src={item.type === 'video' ? '/favicon.svg' : item.url} alt="Miniature" />
					{/if}
				</button>

				{#if i === currentIndex && i < items.length - 1}
					<button
						type="button"
						class="move-btn right"
						onclick={() => handleMove(i, 'right')}
						aria-label="Déplacer vers la droite"
					>
						<Icon name="media.next" size={14} />
					</button>
				{/if}
			</div>
		{/each}

		{#if onAddMedia || onAddText}
			<div class="add-buttons-mini">
				{#if onAddMedia}
					<button
						type="button"
						onclick={onAddMedia}
						title="Ajouter un média"
						aria-label="Ajouter un média"
					>
						<Icon name="media.camera" size={16} />
					</button>
				{/if}
				{#if onAddText}
					<button
						type="button"
						onclick={onAddText}
						title="Ajouter du texte"
						aria-label="Ajouter du texte"
					>
						Aa
					</button>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.carousel-controls {
		background: #222;
		padding: var(--space-3, 12px);
	}

	.thumbnails {
		display: flex;
		gap: 8px;
		overflow-x: auto;
		align-items: center;
	}

	.thumb-wrapper {
		position: relative;
		width: 60px;
		height: 60px;
		border-radius: 6px;
		overflow: hidden;
		opacity: 0.5;
		flex-shrink: 0;
	}

	.thumb-wrapper.active {
		opacity: 1;
		border: 2px solid #fff;
	}

	.thumb-content {
		width: 100%;
		height: 100%;
		cursor: pointer;
		background: #333;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
		padding: 0;
	}

	.thumb-content img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.thumb-text-icon {
		color: white;
		font-weight: bold;
		font-size: 1.2rem;
	}

	.move-btn {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 20px;
		background: rgba(0, 0, 0, 0.8);
		color: white;
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 2;
	}

	.move-btn.left {
		left: 0;
	}

	.move-btn.right {
		right: 0;
	}

	.add-buttons-mini {
		display: flex;
		flex-direction: column;
		gap: 4px;
		flex-shrink: 0;
	}

	.add-buttons-mini button {
		width: 40px;
		height: 28px;
		background: #444;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: bold;
		transition: background 0.15s ease;
	}

	.add-buttons-mini button:hover {
		background: #555;
	}
</style>
