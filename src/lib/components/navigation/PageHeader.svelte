<!--
  @component PageHeader
  @domain navigation
  @description En-tête de page standardisé avec bouton retour, titre et actions.
-->
<!-- src/lib/components/PageHeader.svelte -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Icon from '$lib/components/ui/Icon.svelte';

	let {
		title,
		username,
		children,
		back_location
	}: {
		title: string;
		back_location?: string | null;
		username?: string;
		children?: import('svelte').Snippet;
	} = $props();

	function goBack() {
		if (!back_location) return;

		const hasNavigated = sessionStorage.getItem('app_navigated') === 'true';

		if (hasNavigated) {
			window.history.back();
		} else {
			// @ts-expect-error no way to implement this with good types
			goto(resolve(back_location), { replaceState: true });
		}
	}
</script>

<header class="page-header">
	{#if back_location}
		<button class="back-btn" onclick={goBack} aria-label="Retour">
			<span class="icon"><Icon name="action.back" size={20} /></span>
		</button>
	{:else}
		<!-- Div vide pour conserver l'équilibre de la Grid (auto 1fr auto) -->
		<div></div>
	{/if}

	<div class="header-titles">
		<h1 class="header-title" class:single-line={!username}>{title}</h1>
		{#if username}
			<span class="header-subtitle">@{username}</span>
		{/if}
	</div>

	<div class="header-right">
		{#if children}
			{@render children()}
		{:else}
			<!-- Div vide pour conserver l'équilibre si pas de contenu à droite -->
			<div></div>
		{/if}
	</div>
</header>

<div class="page-header-spacer"></div>

<style>
	.page-header-spacer {
		height: calc(var(--nav-height, 60px) + env(safe-area-inset-top));
		width: 100%;
	}
	.page-header {
		/* Exactement la même position que TopNav */
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		padding: env(safe-area-inset-top) var(--space-2, 8px) 0 var(--space-2, 8px);
		min-height: var(--nav-height, 60px);

		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 8px;

		background: rgba(255, 255, 255, 0.9);
		backdrop-filter: blur(10px);
		border-bottom: 1px solid var(--border-color, #eaeaea);
		z-index: var(--z-nav, 100);
	}

	@media (min-width: 600px) {
		.page-header {
			left: 50%;
			transform: translateX(-50%);
			max-width: var(--max-content-width, 600px);
			border-left: 1px solid var(--border-color, #eaeaea);
			border-right: 1px solid var(--border-color, #eaeaea);
		}
	}

	/* Le reste (back-btn, title, etc.) est inchangé */
	.back-btn {
		justify-self: start;
		background: none;
		border: none;
		font-size: 1.5rem;
		cursor: pointer;
		padding: 8px;
		margin-left: -8px;
		border-radius: 50%;
		color: var(--text-default, #1a1a1a);
	}

	.header-titles {
		justify-self: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		width: 100%;
		min-width: 0;
	}

	.header-title {
		font-size: 1.1rem;
		font-weight: bold;
		margin: 0;
		color: var(--text-default, #1a1a1a);
		line-height: 1.2;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 100%;
	}

	.header-title.single-line {
		font-size: 1.1rem; /* Uniformisé avec TopNav */
	}

	.header-subtitle {
		font-size: 0.8rem;
		color: var(--text-muted, #666);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 100%;
	}

	.header-right {
		justify-self: end;
		display: flex;
		align-items: center;
	}
</style>
