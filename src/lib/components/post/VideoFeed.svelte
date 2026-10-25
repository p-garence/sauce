<!--
  @component VideoFeed
  @domain post
  @description Flux vertical plein écran dédié aux publications vidéo.
-->
<!-- src/lib/components/VideoFeed.svelte -->
<script lang="ts">
	import VideoPlayer from './VideoPlayer.svelte';
	import type { PostData } from '$lib/types';

	// On attend la liste des posts en props
	let { posts }: { posts: PostData[] } = $props();
</script>

<div class="feed-container">
	{#each posts as post (post.id)}
		<div class="snap-item">
			<VideoPlayer {post} />
		</div>
	{/each}
</div>

<style>
	.feed-container {
		height: 100vh;
		width: 100vw;
		overflow-y: scroll;

		/* LA MAGIE EST ICI : Le CSS Scroll Snapping */
		scroll-snap-type: y mandatory;

		/* Masque la scrollbar pour un look natif (Chrome/Safari) */
		scrollbar-width: none;
	}

	.feed-container::-webkit-scrollbar {
		display: none;
	}

	.snap-item {
		height: 100vh;
		width: 100%;
		/* Oblige le scroll à s'arrêter sur le haut de ce conteneur */
		scroll-snap-align: start;
		scroll-snap-stop: always;
	}
</style>
