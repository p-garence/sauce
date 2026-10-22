<script lang="ts">
	/**
	 * @component CarouselSlideEditor
	 * @domain post
	 * @description Éditeur et prévisualisation de la slide active d'une publication (panneau texte riche ou média photo/vidéo).
	 *
	 * @responsibilities
	 * - Afficher et permettre la saisie sur la slide texte courante (mentions, émojis, alignement).
	 * - Afficher le média (image ou vidéo) de la slide courante avec overlay d'actions (retouche / suppression).
	 * - Adapter le style selon que la publication est un simple texte ou un carrousel multimédia.
	 */

	import EmojiButton from '$lib/components/ui/EmojiButton.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import MentionSuggestions from '$lib/components/ui/MentionSuggestions.svelte';
	import RichTextInput from '$lib/components/ui/RichTextInput.svelte';
	import TextAlignSelector from '$lib/components/ui/TextAlignSelector.svelte';
	import type { EditorCarouselItem, EmojiItem } from '$lib/types';

	interface Props {
		/** Slide actuellement active dans le carrousel */
		item: EditorCarouselItem;
		/** Vrai si le post est constitué d'un unique panneau texte */
		isSimpleText?: boolean;
		/** Callback pour supprimer ou retirer la slide active */
		onRemove?: () => void;
		/** Callback pour ouvrir l'éditeur de média sur cette slide */
		onEditMedia?: () => void;
	}

	let {
		item,
		isSimpleText = false,
		onRemove,
		onEditMedia
	}: Props = $props();

	let richInputRef = $state<RichTextInput | null>(null);
	let mentionRef: MentionSuggestions | undefined = $state();

	function handleEmojiSelect(emoji: EmojiItem) {
		richInputRef?.insertEmoji(emoji);
	}
</script>

<div class="editor-container" class:is-carousel={!isSimpleText}>
	{#if item.type === 'text'}
		<div class="text-slide-content-wrapper">
			<RichTextInput
				bind:this={richInputRef}
				bind:value={item.text}
				align={item.align || (isSimpleText ? 'left' : 'center')}
				placeholder={isSimpleText ? 'Commencez à écrire...' : 'Rédigez le texte du panneau...'}
				class="text-slide-input"
				onkeydown={(e) => {
					mentionRef?.handleKeydown(e);
				}}
			/>
		</div>

		<div class="text-slide-toolbar">
			<MentionSuggestions
				bind:this={mentionRef}
				bind:value={item.text}
				inputElement={richInputRef?.getElement()}
				placement="top"
			/>
			<EmojiButton onSelect={handleEmojiSelect} variant="inline" align="left" />
			<TextAlignSelector bind:align={item.align} />
		</div>

		{#if !(isSimpleText && !item.text) && onRemove}
			<button
				type="button"
				class="btn-remove"
				onclick={onRemove}
				aria-label="Supprimer ce panneau"
			>
				<Icon name="action.close" size={16} />
			</button>
		{/if}
	{:else}
		<div class="media-slide">
			{#if item.isUploading}
				<div class="upload-loader">
					<Icon name="status.time" size={16} /> Envoi en cours...
				</div>
			{/if}
			{#if item.type === 'video'}
				<video src={item.url} controls autoplay muted loop playsinline></video>
			{:else}
				<img src={item.url} alt="Aperçu de la slide" />
			{/if}
		</div>

		<div class="media-overlay-actions">
			{#if (item.type === 'image' || !item.type.startsWith('video')) && onEditMedia}
				<button type="button" class="btn-pill" onclick={onEditMedia}>
					<Icon name="action.edit" size={14} /> Modifier
				</button>
			{/if}
			{#if onRemove}
				<button type="button" class="btn-pill danger" onclick={onRemove}>
					<Icon name="action.close" size={14} /> Retirer
				</button>
			{/if}
		</div>
	{/if}
</div>

<style>
	.editor-container {
		width: 100%;
		position: relative;
		border-bottom: 1px solid var(--border-color, #eaeaea);
		background: var(--bg-default, #f9fafb);
		display: flex;
		flex-direction: column;
	}

	.editor-container.is-carousel {
		width: 100%;
		aspect-ratio: 4 / 5;
		background: #000;
		overflow: hidden;
	}

	@media (min-width: 600px) {
		.editor-container.is-carousel {
			max-height: 65vh;
			max-width: calc(65vh * 4 / 5);
			margin-inline: auto;
		}
	}

	.text-slide-content-wrapper {
		width: 100%;
		display: flex;
		flex-direction: column;
	}

	.is-carousel .text-slide-content-wrapper {
		flex: 1;
		height: 100%;
		justify-content: center;
		padding: 24px 24px 64px 24px;
		box-sizing: border-box;
		overflow-y: auto;
	}

	:global(.text-slide-input) {
		width: 100%;
		min-height: 150px;
		padding: var(--space-6, 24px);
		border: none;
		background: transparent;
		font-size: 1.2rem;
		outline: none;
		font-family: inherit;
		box-sizing: border-box;
		color: var(--text-default, #1a1a1a);
		display: block;
	}

	:global(.is-carousel .text-slide-input) {
		width: 100%;
		min-height: auto;
		color: #fff;
		display: block;
		font-size: 1.5rem;
		padding: 0;
		box-sizing: border-box;
	}

	.media-slide {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}

	.media-slide img,
	.media-slide video {
		width: 100%;
		height: 100%;
		object-fit: contain;
		display: block;
	}

	.upload-loader {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		background: rgba(0, 0, 0, 0.5);
		color: #fff;
		font-weight: bold;
		z-index: 2;
	}

	.btn-remove {
		position: absolute;
		top: 12px;
		right: 12px;
		background: rgba(0, 0, 0, 0.5);
		color: white;
		border: none;
		border-radius: 50%;
		width: 32px;
		height: 32px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 10;
		transition: background 0.15s ease;
	}

	.btn-remove:hover {
		background: rgba(0, 0, 0, 0.8);
	}

	.text-slide-toolbar {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: flex-start;
		gap: 12px;
		padding: 8px 16px 12px 16px;
	}

	.is-carousel .text-slide-toolbar {
		position: absolute;
		bottom: 12px;
		left: 16px;
		right: 16px;
		padding: 0;
		z-index: 5;
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.is-carousel .text-slide-toolbar :global(.btn-emoji-trigger),
	.is-carousel .text-slide-toolbar :global(.btn-align-trigger) {
		color: rgba(255, 255, 255, 0.9);
		background: rgba(0, 0, 0, 0.55);
		border: 1px solid rgba(255, 255, 255, 0.25);
		border-radius: 16px;
		padding: 6px 10px;
		height: 32px;
		backdrop-filter: blur(4px);
	}

	.is-carousel .text-slide-toolbar :global(.btn-emoji-trigger:hover),
	.is-carousel .text-slide-toolbar :global(.btn-align-trigger:hover) {
		color: #ffffff;
		background: rgba(0, 0, 0, 0.8);
	}

	.media-overlay-actions {
		position: absolute;
		top: 12px;
		right: 12px;
		display: flex;
		gap: 8px;
		z-index: 10;
	}

	.btn-pill {
		padding: 6px 12px;
		border-radius: 20px;
		background: rgba(0, 0, 0, 0.6);
		color: #fff;
		border: 1px solid rgba(255, 255, 255, 0.2);
		font-size: 0.85rem;
		cursor: pointer;
		backdrop-filter: blur(4px);
		transition: background 0.15s;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		line-height: 1;
	}

	.btn-pill:hover {
		background: rgba(0, 0, 0, 0.85);
	}

	.btn-pill.danger {
		background: rgba(220, 38, 38, 0.7);
	}

	.btn-pill.danger:hover {
		background: rgba(220, 38, 38, 0.9);
	}
</style>
