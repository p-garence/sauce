<!--
  @component StoryMediaViewer
  @domain stories
  @description Zone d'affichage multimédia d'une story (vidéo ou image) avec détection du double tap (like), zones tactiles gauche/droite, navigation desktop et affichage de la légende.
  @responsibilities
    - Afficher le média (balise img ou video avec autoplay/ended)
    - Détecter le double-tap pour liker et le simple tap pour avancer/reculer
    - Fournir les zones tactiles gauche/droite et flèches desktop
    - Afficher la légende textuelle de la story
-->
<script lang="ts">
	import type { StoryItem } from '$lib/types';
	import Icon from '$lib/components/ui/Icon.svelte';
	import DoubleTapDetector from '$lib/components/ui/DoubleTapDetector.svelte';

	interface Props {
		currentStory: StoryItem;
		isDoubleTapEnabled?: boolean;
		showPrevBtn?: boolean;
		isAuthor?: boolean;
		keyboardOffset?: number;
		videoElement?: HTMLVideoElement | null;
		onPrev: () => void;
		onNext: () => void;
		onDoubleTapLike: () => void;
	}

	let {
		currentStory,
		isDoubleTapEnabled = false,
		showPrevBtn = false,
		isAuthor = false,
		keyboardOffset = 0,
		videoElement = $bindable(null),
		onPrev,
		onNext,
		onDoubleTapLike
	}: Props = $props();

	let containerElement = $state<HTMLDivElement | null>(null);

	function handleSingleTap(e?: MouseEvent | TouchEvent | PointerEvent) {
		if (!e) return;
		let clientX = 0;
		if ('clientX' in e && typeof e.clientX === 'number') {
			clientX = e.clientX;
		} else if ('touches' in e && (e as TouchEvent).touches?.[0]) {
			clientX = (e as TouchEvent).touches[0].clientX;
		}
		if (containerElement) {
			const rect = containerElement.getBoundingClientRect();
			const relativeX = clientX - rect.left;
			if (relativeX < rect.width * 0.4) {
				onPrev();
			} else {
				onNext();
			}
		} else {
			onNext();
		}
	}
</script>

<div class="story-media-container" bind:this={containerElement}>
	{#if isDoubleTapEnabled}
		<DoubleTapDetector
			style="width: 100%; height: 100%; display: flex; flex: 1; min-height: 0;"
			showHeartFeedback={!currentStory.isLiked}
			onDoubleTap={onDoubleTapLike}
			onSingleTap={handleSingleTap}
		>
			<div class="story-media-wrapper">
				{#key currentStory.id}
					{#if currentStory.mediaType === 'video'}
						<video
							bind:this={videoElement}
							src={currentStory.mediaUrl}
							autoplay
							playsinline
							muted={false}
							onended={onNext}
						></video>
					{:else}
						<img src={currentStory.mediaUrl} alt="Story" draggable="false" />
					{/if}
				{/key}
			</div>
		</DoubleTapDetector>
	{:else}
		<div class="story-media-wrapper">
			{#key currentStory.id}
				{#if currentStory.mediaType === 'video'}
					<video
						bind:this={videoElement}
						src={currentStory.mediaUrl}
						autoplay
						playsinline
						muted={false}
						onended={onNext}
					></video>
				{:else}
					<img src={currentStory.mediaUrl} alt="Story" draggable="false" />
				{/if}
			{/key}
		</div>

		<!-- Zones tactiles transparentes gauche (reculer) / droite (avancer) -->
		<button
			type="button"
			class="tap-zone tap-left"
			onclick={onPrev}
			aria-label="Story précédente"
		></button>

		<button
			type="button"
			class="tap-zone tap-right"
			onclick={onNext}
			aria-label="Story suivante"
		></button>
	{/if}

	<!-- Boutons flèches visibles sur Desktop -->
	{#if showPrevBtn}
		<button
			type="button"
			class="nav-btn nav-prev"
			onclick={onPrev}
			aria-label="Story précédente"
		>
			<Icon name="media.prev" size={24} color="white" />
		</button>
	{/if}

	<button
		type="button"
		class="nav-btn nav-next"
		onclick={onNext}
		aria-label="Story suivante"
	>
		<Icon name="media.next" size={24} color="white" />
	</button>

	<!-- Légende optionnelle -->
	{#if currentStory.caption}
		<div
			class="story-caption"
			class:with-footer={!isAuthor}
			style={keyboardOffset > 0 ? `bottom: ${keyboardOffset + 74}px;` : ''}
		>
			<p>{currentStory.caption}</p>
		</div>
	{/if}
</div>

<style>
	.story-media-container {
		position: relative;
		width: 100%;
		height: 100%;
		display: flex;
		flex: 1;
		min-height: 0;
		overflow: hidden;
	}

	.story-media-wrapper {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #000;
		overflow: hidden;
	}

	.story-media-wrapper img,
	.story-media-wrapper video {
		width: 100%;
		height: 100%;
		object-fit: contain;
		display: block;
		pointer-events: none;
	}

	/* Zones tactiles invisibles pour tap gauche / droite */
	.tap-zone {
		position: absolute;
		top: 60px;
		bottom: 84px;
		background: transparent;
		border: none;
		padding: 0;
		margin: 0;
		cursor: pointer;
		z-index: 15;
		-webkit-tap-highlight-color: transparent;
		outline: none;
	}

	.tap-left {
		left: 0;
		width: 40%;
	}

	.tap-right {
		right: 0;
		width: 60%;
	}

	/* Flèches desktop */
	.nav-btn {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: rgba(0, 0, 0, 0.5);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: #fff;
		font-size: 1.3rem;
		display: none;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		z-index: 20;
		transition:
			background 0.15s,
			transform 0.1s;
		backdrop-filter: blur(4px);
	}

	.nav-btn:hover {
		background: rgba(0, 0, 0, 0.8);
		transform: translateY(-50%) scale(1.08);
	}

	.nav-prev {
		left: 12px;
	}

	.nav-next {
		right: 12px;
	}

	@media (min-width: 600px) {
		.nav-btn {
			display: flex;
		}
	}

	/* Caption */
	.story-caption {
		position: absolute;
		bottom: 24px;
		left: 14px;
		right: 14px;
		z-index: 25;
		background: rgba(0, 0, 0, 0.65);
		backdrop-filter: blur(8px);
		color: #fff;
		padding: 8px 14px;
		border-radius: 12px;
		font-size: 0.92rem;
		text-align: center;
		max-height: 22%;
		overflow-y: auto;
		pointer-events: auto;
		transition: bottom 0.15s ease-out;
	}

	.story-caption.with-footer {
		bottom: 74px;
	}

	.story-caption p {
		margin: 0;
		line-height: 1.35;
	}
</style>
