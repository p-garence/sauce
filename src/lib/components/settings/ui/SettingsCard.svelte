<!-- src/lib/components/ui/settings/SettingsCard.svelte -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	let {
		title = '',
		description = '',
		children
	}: {
		title?: string;
		description?: string;
		children: Snippet;
	} = $props();
</script>

<section class="settings-card">
	{#if title}<h2>{title}</h2>{/if}
	{#if description}<p class="desc">{description}</p>{/if}

	<div class="card-content">
		{@render children()}
	</div>
</section>

<style>
	.settings-card {
		background: white;
		border: 1px solid #eaeaea;
		padding: 16px; /* Padding optimisé mobile */
		border-radius: 12px;
		margin-bottom: 24px;
	}
	@media (min-width: 640px) {
		.settings-card {
			padding: 24px;
		}
	}

	h2 {
		margin: 0 0 12px 0;
		font-size: 1.2rem;
		border-bottom: 1px solid #eaeaea;
		padding-bottom: 12px;
		color: #1a1a1a;
	}
	.desc {
		color: #666;
		font-size: 0.9rem;
		margin-bottom: 16px;
		line-height: 1.4;
	}
	.card-content {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
</style>
