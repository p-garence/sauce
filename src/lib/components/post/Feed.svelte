<!--
  @component Feed
  @domain post
  @description Liste de publications du flux avec gestion de l'état vide.
-->
<script lang="ts">
	import Post from './Post.svelte';
	import type { PostData } from '$lib/types';

	let { posts }: { posts: PostData[] } = $props();
</script>

<div class="feed-container">
	{#each posts as post (post.id)}
		<Post {post} />
	{/each}
</div>

<style>
	.feed-container {
		width: 100%;
		max-width: 600px;
		margin: 0 auto;
		padding: 0;
	}

	.feed-container :global(.post:first-child) {
		padding-top: 8px;
	}

	@media (min-width: 600px) {
		.feed-container {
			padding: 0 0 20px 0;
		}
	}
</style>
