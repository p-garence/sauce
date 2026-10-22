<!--
  @component PostCarousel
  @domain post
  @description Carrousel de lecture de slides (texte, images, vidéos) avec navigation et indicateurs.
-->
<script lang="ts">
	import type { CarouselItem } from '$lib/types';
	import RichContent from '$lib/components/ui/RichContent.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	let { mediaUrls }: { mediaUrls: CarouselItem[] } = $props();

	let carouselElement: HTMLDivElement | undefined = $state();
	let currentSlide = $state(0);

	function videoObserver(node: HTMLVideoElement) {
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) node.play().catch(() => {});
					else node.pause();
				});
			},
			{ threshold: 0.5 }
		);
		observer.observe(node);
		return {
			destroy() {
				observer.disconnect();
			}
		};
	}

	function handleScroll() {
		if (!carouselElement) return;
		const index = Math.round(carouselElement.scrollLeft / carouselElement.clientWidth);
		if (currentSlide !== index) currentSlide = index;
	}

	function scrollCarousel(direction: 'left' | 'right') {
		if (!carouselElement || !mediaUrls) return;
		const scrollAmount = carouselElement.clientWidth;
		const newIndex = direction === 'left' ? currentSlide - 1 : currentSlide + 1;
		const safeIndex = Math.max(0, Math.min(newIndex, mediaUrls.length - 1));
		carouselElement.scrollTo({ left: safeIndex * scrollAmount, behavior: 'smooth' });
	}
</script>

<div class="carousel-wrapper">
	{#if currentSlide > 0}
		<button class="nav-arrow left" aria-label="Précédent" onclick={() => scrollCarousel('left')}>
			<Icon name="media.prev" size={20} color="white" />
		</button>
	{/if}

	<div class="post-carousel" bind:this={carouselElement} onscroll={handleScroll}>
		{#each mediaUrls as media, index (index)}
			<div class="carousel-item">
				{#if media.type === 'video'}
					<video
						src={media.content}
						poster={media.poster}
						loop
						muted
						playsinline
						preload="metadata"
						controls
						use:videoObserver
					></video>
				{:else if media.type === 'image'}
					<img src={media.content} alt="Média {index}" loading="lazy" decoding="async" />
				{:else if media.type === 'text'}
					<div class="text-slide" style="text-align: {media.align || 'center'};"><p><RichContent content={media.content} /></p></div>
				{/if}
			</div>
		{/each}
	</div>

	{#if currentSlide < mediaUrls.length - 1}
		<button class="nav-arrow right" aria-label="Suivant" onclick={() => scrollCarousel('right')}>
			<Icon name="media.next" size={20} color="white" />
		</button>
	{/if}

	{#if mediaUrls.length > 1}
		<div class="carousel-dots">
			{#each mediaUrls, i}
				<div class="dot {i === currentSlide ? 'active' : ''}"></div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.carousel-wrapper {
		position: relative;
		width: 100%;
		background-color: #111;
	}
	.nav-arrow {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		background: rgba(0, 0, 0, 0.6);
		color: white;
		border: none;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		cursor: pointer;
		z-index: 10;
		display: none;
		align-items: center;
		justify-content: center;
		font-size: 1.2rem;
	}
	@media (hover: hover) and (pointer: fine) {
		.nav-arrow {
			display: flex;
		}
	}
	.nav-arrow.left {
		left: 8px;
	}
	.nav-arrow.right {
		right: 8px;
	}
	.nav-arrow:hover {
		background: rgba(0, 0, 0, 0.9);
	}
	.carousel-dots {
		position: absolute;
		bottom: 16px;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		gap: 6px;
		z-index: 10;
		background: rgba(0, 0, 0, 0.4);
		padding: 6px 10px;
		border-radius: 12px;
		backdrop-filter: blur(4px);
	}
	.dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.5);
		transition:
			background 0.3s,
			transform 0.3s;
	}
	.dot.active {
		background: #ffffff;
		transform: scale(1.3);
	}
	.post-carousel {
		display: flex;
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		overscroll-behavior-x: contain;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: none;
	}
	.post-carousel::-webkit-scrollbar {
		display: none;
	}
	.carousel-item {
		flex: 0 0 100%;
		scroll-snap-align: center;
		scroll-snap-stop: always;
		max-height: 70vh;
		aspect-ratio: 4/5;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
	}
	.carousel-item img,
	.carousel-item video {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}
	.text-slide {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px;
		color: #fff;
		font-size: 1.5rem;
		box-sizing: border-box;
	}
	.text-slide p {
		width: 100%;
		margin: 0;
		word-break: break-word;
	}
</style>
