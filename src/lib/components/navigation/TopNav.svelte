<!--
  @component TopNav
  @domain navigation
  @description Barre de navigation supérieure principale (flux, recherche, notifications, profil).
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import NotificationMenu from '$lib/components/navigation/NotificationMenu.svelte';
	import type { Snippet } from 'svelte';
	// 1. Les props permettent d'adapter le centre du Header selon la page
	let {
		title,
		showFeedSelector = false,
		feeds = [],
		selectedFeed = '',
		isChangingFeed = false,
		onFeedChange,
		rightAction
	}: {
		title?: string;
		showFeedSelector?: boolean;
		feeds?: { id: string; name: string }[];
		selectedFeed?: string;
		isChangingFeed?: boolean;
		onFeedChange?: (feedId: string) => void;
		rightAction?: Snippet;
	} = $props();

	let user = $derived(page.data.sessionUser);

	function handleSelectChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		if (onFeedChange) onFeedChange(target.value);
	}
</script>

<header class="top-nav">
	<!-- GAUCHE : L'utilisateur -->
	<a href={resolve(`/profil/${user.username}`)} class="profile-link">
		<div class="avatar-mini">
			{#if user.image}
				<img src={user.image} alt="Avatar" />
			{:else}
				<div class="placeholder">{user.username?.charAt(0).toUpperCase() || '?'}</div>
			{/if}
		</div>
		<span class="username">@{user.username || 'Profil'}</span>
	</a>

	<!-- CENTRE : Sélecteur de flux OU Titre de la page -->
	<div class="center-content">
		{#if showFeedSelector}
			<select
				value={selectedFeed}
				onchange={handleSelectChange}
				disabled={isChangingFeed}
				class:loading={isChangingFeed}
				class="feed-selector"
			>
				{#each feeds as feed (feed.id)}
					<option value={feed.id}>{feed.name}</option>
				{/each}
			</select>
		{:else if title}
			<h2 class="page-title">{title}</h2>
		{/if}
	</div>

	<!-- DROITE : Notifications -->
	<div class="right-content">
		{#if rightAction}
			{@render rightAction()}
		{:else}
			<NotificationMenu />
		{/if}
	</div>
</header>

<div class="top-nav-spacer"></div>

<style>
	.top-nav {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		padding: env(safe-area-inset-top) var(--space-2, 8px) 0 var(--space-2, 8px);
		min-height: var(--nav-height, 60px);

		display: flex;
		justify-content: space-between;
		align-items: center;
		z-index: var(--z-nav, 100);

		background: rgba(255, 255, 255, 0.9);
		backdrop-filter: blur(10px);
		border-bottom: 1px solid var(--border-color, #eaeaea);
	}

	@media (min-width: 600px) {
		.top-nav {
			left: 50%;
			transform: translateX(-50%);
			max-width: var(--max-content-width, 600px);
			border-left: 1px solid var(--border-color, #eaeaea);
			border-right: 1px solid var(--border-color, #eaeaea);
		}
	}

	.top-nav-spacer {
		height: calc(var(--nav-height, 60px) + env(safe-area-inset-top));
	}

	/* GAUCHE */
	.profile-link {
		display: flex;
		align-items: center;
		gap: 8px;
		text-decoration: none;
		color: var(--text-default, #1a1a1a);
		flex: 1; /* Prend l'espace disponible */
		min-width: 0;
	}
	.avatar-mini {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		overflow: hidden;
		background: var(--border-color, #eee);
		flex-shrink: 0;
	}
	.avatar-mini img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.placeholder {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: bold;
		color: var(--text-muted, #666);
		font-size: 0.9rem;
	}
	.username {
		font-weight: 600;
		font-size: 0.95rem;
		max-width: 100px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* CENTRE */
	.center-content {
		flex: 1.5; /* Plus d'espace pour le centre */
		display: flex;
		justify-content: center;
		min-width: 0;
		padding: 0 8px;
	}
	.page-title {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--text-default, #1a1a1a);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.feed-selector {
		appearance: none;
		background-color: var(--bg-default, #f0f0f0);
		border: none;
		padding: 6px 28px 6px 12px;
		border-radius: 6px;
		font-weight: bold;
		font-size: 0.9rem;
		color: var(--text-default, #1a1a1a);
		cursor: pointer;
		outline: none;
		max-width: 100%;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
		background-repeat: no-repeat;
		background-position: right 8px center;
		background-size: 16px;
	}
	.feed-selector.loading {
		opacity: 0.5;
		cursor: wait;
	}

	/* DROITE */
	.right-content {
		flex: 1;
		display: flex;
		justify-content: flex-end;
	}

	@media (max-width: 380px) {
		.username {
			display: none;
		}
		.feed-selector {
			font-size: 0.85rem;
		}
	}
</style>
