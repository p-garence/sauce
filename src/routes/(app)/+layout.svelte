<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { onMount, onDestroy, untrack } from 'svelte';
	import { fade } from 'svelte/transition';
	import { globalStream } from '$lib/client/globalStreamState.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { iconTheme } from '$lib/client/iconTheme.svelte';
	let { data, children } = $props();

	$effect(() => {
		const serverSet = data.activeIconSet;
		const userActiveId = data.sessionUser?.activeIconSetId;
		const defaultBuiltin = data.instanceSettings?.defaultIconPack || 'lucide';
		untrack(() => {
			if (serverSet) {
				iconTheme.applyServerIconSet(serverSet);
			} else if (data.sessionUser && !userActiveId) {
				if (iconTheme.pack !== 'sauce') {
					if (defaultBuiltin === 'original' || defaultBuiltin === 'lucide') {
						iconTheme.setPack(defaultBuiltin);
					} else {
						iconTheme.revertToDefault();
					}
				}
			}
		});
	});

	onMount(() => {
		// On initialise le stream global en local
		if (data.sessionUser?.id) {
			globalStream.init(data.sessionUser.id);
		}

		if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
			const handleSwMessage = (event: MessageEvent) => {
				if (event.data?.type === 'NOTIFICATION_CLICK') {
					if (event.data.notificationId) {
						globalStream.markNotifAsReadById(event.data.notificationId);
					}
					if (event.data.entityId) {
						globalStream.markNotifsForEntityAsRead(event.data.entityId);
					}
				}
			};
			navigator.serviceWorker.addEventListener('message', handleSwMessage);
			return () => {
				navigator.serviceWorker.removeEventListener('message', handleSwMessage);
			};
		}
	});

	onDestroy(() => {
		globalStream.destroy();
	});

	let unreadMessagesCount = $derived(globalStream.unreadChatIds.length);

	let showMessageBadge = $derived(
		unreadMessagesCount > 0 && data.sessionUser?.notificationSettings?.message !== false
	);
</script>

<div class="app-layout">
	<main class="app-content">
		{@render children()}
	</main>

	<nav class="bottom-nav">
		{#if data.sessionUser}
			<a
				href={resolve('/flux')}
				class="nav-item"
				class:active={page.url.pathname === '/flux'}
				data-sveltekit-noscroll
				onclick={(e) => {
					if (page.url.pathname === '/flux' || page.url.pathname === '/flux/') {
						e.preventDefault();
						const currentScroll = window.scrollY || document.documentElement.scrollTop || 0;
						if (currentScroll > 40) {
							window.dispatchEvent(new CustomEvent('feed:scroll-top'));
						} else {
							window.dispatchEvent(new CustomEvent('feed:refresh-top'));
						}
					}
				}}
			>
				<span class="icon"><Icon name="nav.feed" size={24} /></span>
				<span class="label">Flux</span>
			</a>
			<a
				href={resolve('/publier')}
				class="nav-item"
				class:active={page.url.pathname === '/publier'}
			>
				<span class="icon"><Icon name="nav.publish" size={24} /></span>
				<span class="label">Publier</span>
			</a>
			<a
				href={resolve('/chat')}
				class="nav-item"
				class:active={page.url.pathname.startsWith('/chat')}
			>
				<div class="icon-container">
					<span class="icon"><Icon name="nav.chat" size={24} /></span>
					{#if showMessageBadge}
						<span class="badge" transition:fade={{ duration: 150 }}>{unreadMessagesCount}</span>
					{/if}
				</div>
				<span class="label">Messages</span>
			</a>
			<a
				href={resolve('/explorer')}
				class="nav-item"
				class:active={page.url.pathname === '/explorer'}
			>
				<span class="icon"><Icon name="nav.explore" size={24} /></span>
				<span class="label">Explorer</span>
			</a>
			<a
				href={resolve('/parametres')}
				class="nav-item"
				class:active={page.url.pathname === '/parametres'}
			>
				<span class="icon"><Icon name="nav.settings" size={24} /></span>
				<span class="label">Réglages</span>
			</a>
		{:else}
			<a href={resolve('/login')} class="nav-item active">
				<span class="label">Se connecter pour interagir</span>
			</a>
		{/if}
	</nav>
</div>

<style>
	.app-layout {
		/* Fallback pour les très vieux navigateurs */
		min-height: 100vh;
		/* S'ajuste dynamiquement à la barre d'URL mobile */
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
	}

	.app-content {
		flex: 1;
		padding-bottom: calc(var(--nav-height) + env(safe-area-inset-bottom, 0px));
		width: 100%;
		max-width: var(--max-content-width);
		margin: 0 auto;
		display: flex;
		flex-direction: column;
	}

	.bottom-nav {
		position: fixed;
		bottom: 0;
		left: 0;
		width: 100%;
		/* Fallback de sécurité à 0px */
		padding-bottom: env(safe-area-inset-bottom, 0px);
		min-height: var(--nav-height);
		background: rgba(255, 255, 255, 0.9);
		backdrop-filter: blur(10px);
		border-top: 1px solid var(--border-color);
		display: flex;
		justify-content: space-around;
		align-items: center;
		z-index: var(--z-nav);
	}

	:global(body.keyboard-open) .bottom-nav {
		display: none !important;
	}

	:global(body.keyboard-open) .app-content {
		padding-bottom: 0 !important;
	}

	/* Comportement Desktop : La barre reste en bas, mais s'aligne avec le contenu */
	@media (min-width: 600px) {
		.bottom-nav {
			left: 50%;
			transform: translateX(-50%);
			max-width: var(--max-content-width);
			border-left: 1px solid var(--border-color);
			border-right: 1px solid var(--border-color);
			border-radius: var(--space-4) var(--space-4) 0 0;
		}
	}

	.nav-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: var(--text-muted);
		text-decoration: none;
		padding: var(--space-2);
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		transition: color 0.2s ease;
	}
	.icon-container {
		position: relative;
		display: inline-flex;
		margin-bottom: 2px;
	}

	.nav-item .icon {
		font-size: 1.5rem;
		margin-bottom: 2px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.nav-item .label {
		font-size: 0.7rem;
		font-weight: 500;
	}

	.nav-item:hover,
	.nav-item.active {
		color: var(--text-default);
	}
	.badge {
		position: absolute;
		top: -4px;
		right: -8px;
		background: #ef4444;
		color: white;
		border-radius: 50px;
		padding: 2px 5px;
		font-size: 0.65rem;
		font-weight: bold;
		line-height: 1;
		border: 2px solid white;
	}
</style>
