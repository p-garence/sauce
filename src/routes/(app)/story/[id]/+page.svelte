<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import StoryViewerModal from '$lib/components/stories/StoryViewerModal.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let isViewerOpen = $state(true);

	function handleClose() {
		isViewerOpen = false;
		const hasNavigated =
			typeof sessionStorage !== 'undefined' && sessionStorage.getItem('app_navigated') === 'true';

		if (hasNavigated) {
			window.history.back();
		} else {
			goto(resolve('/flux'), { replaceState: true });
		}
	}
</script>

<svelte:head>
	<title>Story • Sauce et Ail</title>
</svelte:head>

{#if data.isAvailable && data.bundle}
	<StoryViewerModal
		bundles={[data.bundle]}
		initialAuthorIndex={0}
		initialStoryIndex={data.initialStoryIndex}
		currentUserId={data.currentUserId}
		isOpen={isViewerOpen}
		onClose={handleClose}
	/>
{:else}
	<div class="story-unavailable-page">
		<div class="card">
			<span class="icon">⌛</span>
			<h2>Story indisponible</h2>
			<p>{data.message || 'Cette story a expiré ou n’est plus disponible.'}</p>
			<a href={resolve('/flux')} class="btn-home">Retour au flux</a>
		</div>
	</div>
{/if}

<style>
	.story-unavailable-page {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 80vh;
		padding: 20px;
	}

	.card {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 16px;
		padding: 32px 24px;
		max-width: 420px;
		width: 100%;
		text-align: center;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
	}

	.icon {
		font-size: 3rem;
		display: block;
		margin-bottom: 12px;
	}

	h2 {
		font-size: 1.3rem;
		font-weight: 700;
		color: #0f172a;
		margin: 0 0 8px;
	}

	p {
		font-size: 0.95rem;
		color: #64748b;
		margin: 0 0 24px;
		line-height: 1.4;
	}

	.btn-home {
		display: inline-block;
		background: #0f172a;
		color: #ffffff;
		padding: 10px 20px;
		border-radius: 8px;
		text-decoration: none;
		font-weight: 600;
		font-size: 0.95rem;
		transition: background-color 0.2s;
	}

	.btn-home:hover {
		background: #1e293b;
	}
</style>
