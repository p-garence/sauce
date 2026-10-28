<script lang="ts">
	import TopNav from '$lib/components/navigation/TopNav.svelte';
	import {
		invalidateAll,
		beforeNavigate,
		afterNavigate,
		disableScrollHandling
	} from '$app/navigation';
	import InfiniteFeed from '$lib/components/post/InfiniteFeed.svelte';
	import StoriesBar from '$lib/components/stories/StoriesBar.svelte';
	import { useFeed } from '$lib/client/useFeed.svelte';
	import {
		getMainFeedState,
		updateMainFeedScroll,
		clearMainFeedState
	} from '$lib/client/feedMemory.svelte';
	import type { PageData } from './$types';
	import type { SerializedPost } from '$lib/types';
	import { onMount, tick } from 'svelte';
	import { SvelteDate } from 'svelte/reactivity';

	let { data }: { data: PageData } = $props();

	let postsPerScroll = $derived(data.instanceSettings?.performanceSettings?.postsPerScroll || 8);

	let myFeeds = $derived(data.myFeeds);
	let selectedFeedOverride = $state<string | null>(null);
	let selectedFeed = $derived(
		selectedFeedOverride !== null ? selectedFeedOverride : data.activeFeedId || ''
	);
	let activeFeedConfig = $derived(myFeeds.find((f) => f.id === selectedFeed) || null);
	let showStoriesOnFeed = $derived(
		activeFeedConfig ? activeFeedConfig.showStories !== false : true
	);
	let isChangingFeed = $state(false);
	let isRefreshing = $state(false);

	// Initialisation du flux branché sur le State Memory
	const feed = useFeed(() => ({
		loadNumber: postsPerScroll,
		feedType: 'flux',
		feedId: selectedFeed,
		initialPosts: data.posts,
		initialCursor: data.initialCursor
	}));

	let lastKnownScrollY = 0;
	let isRestoringScroll = false;

	// Si le flux initial n'a pas d'entrée en mémoire (ex: invalidé suite à une publication ou modification de réglages),
	// on synchronise immédiatement le feed avec les données fraîches du serveur
	$effect(() => {
		if (selectedFeed === data.activeFeedId && !getMainFeedState(selectedFeed)) {
			feed.reset(data.posts, data.initialCursor);
		}
	});

	function restoreScrollPosition() {
		const cached = getMainFeedState(selectedFeed);
		if (cached && cached.scrollY > 0) {
			const targetY = cached.scrollY;
			isRestoringScroll = true;

			try {
				disableScrollHandling();
			} catch {
				// Ignorer si appelé hors navigation SvelteKit
			}

			const doScroll = () => {
				window.scrollTo({ top: targetY, behavior: 'instant' });
			};

			doScroll();
			requestAnimationFrame(() => {
				doScroll();
				requestAnimationFrame(doScroll);
			});
			setTimeout(doScroll, 50);
			setTimeout(doScroll, 150);
			setTimeout(() => {
				doScroll();
				isRestoringScroll = false;
			}, 350);
		}
	}

	onMount(() => {
		// 1. Restauration initiale
		restoreScrollPosition();

		// 2. Écoute du rafraîchissement au clic en haut (bottom nav ou header)
		const handleRefreshTop = () => {
			isRestoringScroll = false;
			lastKnownScrollY = 0;
			updateMainFeedScroll(selectedFeed, 0);
			refreshFeed();
		};
		window.addEventListener('feed:refresh-top', handleRefreshTop);

		// 3. Écoute du retour en haut fluide (bottom nav clic quand scrollé)
		const handleScrollTop = () => {
			isRestoringScroll = false;
			lastKnownScrollY = 0;
			updateMainFeedScroll(selectedFeed, 0);
			window.scrollTo({ top: 0, behavior: 'smooth' });
		};
		window.addEventListener('feed:scroll-top', handleScrollTop);

		// 4. Écoute active du scroll pour retenir la position courante
		const handleScroll = () => {
			if (isRestoringScroll) return;
			const currentY = window.scrollY || document.documentElement.scrollTop || 0;
			lastKnownScrollY = currentY;
			updateMainFeedScroll(selectedFeed, currentY);
		};

		window.addEventListener('scroll', handleScroll, { passive: true });

		return () => {
			window.removeEventListener('feed:refresh-top', handleRefreshTop);
			window.removeEventListener('feed:scroll-top', handleScrollTop);
			window.removeEventListener('scroll', handleScroll);
		};
	});

	// Sauvegarde immédiate lors du clic sur un lien (profil, post, autre onglet dans la bottom-nav)
	beforeNavigate(() => {
		if (isRestoringScroll) return;
		const currentY =
			typeof window !== 'undefined'
				? window.scrollY || document.documentElement.scrollTop || 0
				: lastKnownScrollY;
		updateMainFeedScroll(selectedFeed, Math.max(0, currentY));
	});

	// SvelteKit exécute afterNavigate APRÈS son propre cycle de routage et de scroll
	afterNavigate(() => {
		try {
			disableScrollHandling();
		} catch {
			/* ignore */
		}
		restoreScrollPosition();
	});

	async function handleFeedChange(feedId: string) {
		if (!feedId || feedId === selectedFeed) return;

		// Sauvegarde de l'état du flux courant avant le basculement
		const currentY = window.scrollY || document.documentElement.scrollTop || 0;
		updateMainFeedScroll(selectedFeed, Math.max(0, currentY));

		selectedFeedOverride = feedId;
		isChangingFeed = true;
		try {
			// Enregistre en tâche de fond le flux actif en base
			const setActivePromise = fetch('/api/set-active-feed', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ feedId })
			}).catch((e) => console.error('Erreur set-active-feed:', e));

			const cached = getMainFeedState(feedId);
			if (cached && cached.posts && cached.posts.length > 0) {
				// Restauration instantanée depuis le state memory
				feed.reset(cached.posts, cached.nextCursor);
				await tick();
				window.scrollTo({ top: cached.scrollY, behavior: 'instant' });
			} else {
				// Chargement direct depuis l'API pour le nouveau flux
				const res = await fetch(`/api/feed-posts?feedId=${feedId}&limit=${postsPerScroll}`);
				if (res.ok) {
					const json = (await res.json()) as {
						posts: SerializedPost[];
						nextCursor: string | null;
					};
					const formattedPosts = json.posts.map((p) => ({
						...p,
						createdAt: new SvelteDate(p.createdAt)
					}));
					feed.reset(formattedPosts, json.nextCursor);
				} else {
					await invalidateAll();
					await tick();
					feed.reset(data.posts, data.initialCursor);
				}
				window.scrollTo({ top: 0, behavior: 'instant' });
			}

			await setActivePromise;
		} finally {
			isChangingFeed = false;
		}
	}

	async function refreshFeed() {
		if (isRefreshing) return;
		isRefreshing = true;
		isRestoringScroll = false;
		lastKnownScrollY = 0;
		clearMainFeedState(selectedFeed);
		window.scrollTo({ top: 0, behavior: 'smooth' });

		try {
			// Requête directe sans curseur : force la génération d'une NOUVELLE seed côté serveur pour les flux aléatoires et le rafraîchissement des flux RSS
			const res = await fetch(
				`/api/feed-posts?feedId=${selectedFeed}&limit=${postsPerScroll}&refresh=true`
			);
			if (res.ok) {
				const json = (await res.json()) as { posts: SerializedPost[]; nextCursor: string | null };
				const formattedPosts = json.posts.map((p) => ({
					...p,
					createdAt: new SvelteDate(p.createdAt)
				}));
				feed.reset(formattedPosts, json.nextCursor);
			} else {
				await invalidateAll();
				await tick();
				feed.reset(data.posts, data.initialCursor);
			}
		} catch (e) {
			console.error('Erreur rafraîchissement flux:', e);
		} finally {
			// On met à jour les données du layout (stories, notifs) en arrière-plan
			invalidateAll().catch(() => {});
			isRefreshing = false;
		}
	}
</script>

<div class="flux-page">
	<TopNav
		showFeedSelector={true}
		feeds={myFeeds}
		{selectedFeed}
		{isChangingFeed}
		onFeedChange={handleFeedChange}
	/>

	{#if showStoriesOnFeed}
		<StoriesBar
			currentUserId={data.sessionUser?.id}
			currentUserAvatar={data.sessionUser?.image}
			currentUsername={data.sessionUser?.username}
		/>
	{/if}

	<InfiniteFeed
		posts={feed.posts}
		hasMore={feed.hasMore}
		isLoadingMore={feed.isLoadingMore}
		onLoadMore={() => feed.loadMore(selectedFeed)}
		{isRefreshing}
		onRefresh={refreshFeed}
	/>
</div>

<style>
	.flux-page {
		width: 100%;
		max-width: var(--max-content-width, 600px);
		margin: 0 auto;
		/* On s'assure que le contenu ne passe pas sous la Bottom Bar */
		padding-bottom: calc(var(--nav-height, 60px) + env(safe-area-inset-bottom) + 20px);
	}
</style>
