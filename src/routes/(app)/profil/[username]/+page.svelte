<script lang="ts">
	/**
	 * @component ProfilePage
	 * @domain Profile
	 * @description Page de profil utilisateur avec grilles de publications, stories et favoris
	 * @responsibilities
	 * - Orchestrer l'en-tête de profil (ProfileHeader) et les onglets (ProfileNavTabs)
	 * - Initialiser et piloter les flux de posts et de likes via `useFeed`
	 * - Gérer la visionneuse de stories (StoryViewerModal)
	 */
	import { resolve } from '$app/paths';
	import PostGrid from '$lib/components/post/PostGrid.svelte';
	import PageHeader from '$lib/components/navigation/PageHeader.svelte';
	import SortSelect from '$lib/components/ui/SortSelect.svelte';
	import { useFeed } from '$lib/client/useFeed.svelte';
	import { goto } from '$app/navigation';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { page } from '$app/state';
	import StoryViewerModal from '$lib/components/stories/StoryViewerModal.svelte';
	import ProfileHeader from '$lib/components/profile/ProfileHeader.svelte';
	import ProfileNavTabs from '$lib/components/profile/ProfileNavTabs.svelte';
	import type { StoryBundle, StoryItem } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let postsPerGrid = $derived(data.instanceSettings?.performanceSettings?.postsPerGrid || 6);

	let currentTab = $state<'posts' | 'likes'>('posts');
	let serverFollowers = $derived(data.stats.followers);
	let localFollowersDelta = $state(0);
	let followersCount = $derived(serverFollowers + localFollowersDelta);

	export const snapshot = {
		capture: () => currentTab,
		restore: (value: 'posts' | 'likes') => {
			currentTab = value;
		}
	};

	// 1. Hook pour les publications (posts)
	const postsFeed = useFeed(() => ({
		loadNumber: postsPerGrid,
		username: data.profile.username || data.profile.id,
		profileId: data.profile.id,
		feedType: 'posts',
		initialPosts: data.posts,
		initialCursor: data.postsCursor,
		initialSortMode: data.sortMode
	}));

	// 2. Hook pour les favoris (likes)
	const likesFeed = useFeed(() => ({
		loadNumber: postsPerGrid,
		username: data.profile.username || data.profile.id,
		profileId: data.profile.id,
		feedType: 'likes',
		initialPosts: data.likedPosts || [],
		initialCursor: data.likesCursor,
		initialSortMode: data.sortMode
	}));

	async function handleSortChange() {
		const activeFeed = currentTab === 'posts' ? postsFeed : likesFeed;

		const params = new SvelteURLSearchParams(page.url.searchParams);
		params.set('sort', activeFeed.sortMode);

		// @ts-expect-error no way to implement this with good types
		const newPath = resolve(`${page.url.pathname}?${params.toString()}`);

		goto(newPath, { replaceState: true, keepFocus: true, noScroll: true });

		try {
			const type = currentTab === 'posts' ? 'posts' : 'likes';
			const res = await fetch(
				`/api/user-posts?authorId=${data.profile.id}&type=${type}&sort=${activeFeed.sortMode}&numberOfPost=${postsPerGrid}`
			);

			if (res.ok) {
				const json = await res.json();
				activeFeed.reset(json.posts, json.nextCursor);
			}
		} catch (err) {
			console.error('Erreur de tri', err);
		}
	}

	let storyBundle = $derived<StoryBundle | null>(data.storyBundle || null);
	let isStoryViewerOpen = $state(false);

	function handleAvatarClick() {
		if (storyBundle && storyBundle.stories.length > 0) {
			isStoryViewerOpen = true;
		}
	}

	function handleStoryViewed(storyId: string) {
		if (!storyBundle) return;
		const st = storyBundle.stories.find((s) => s.id === storyId);
		if (st) {
			st.isViewed = true;
			storyBundle.hasUnviewed = storyBundle.stories.some((s) => !s.isViewed);
		}
	}

	function handleStoryDeleted(storyId: string) {
		if (!storyBundle) return;
		storyBundle.stories = storyBundle.stories.filter((s) => s.id !== storyId);
		if (storyBundle.stories.length === 0) {
			storyBundle = null;
			isStoryViewerOpen = false;
		}
	}

	function handleStoryUpdated(updatedStory: StoryItem) {
		if (!storyBundle) return;
		const idx = storyBundle.stories.findIndex((s) => s.id === updatedStory.id);
		if (idx !== -1) {
			storyBundle.stories[idx] = { ...storyBundle.stories[idx], ...updatedStory };
			storyBundle.hasGroupStory = storyBundle.stories.some((s) => s.groupId !== null);
			if (updatedStory.groupColor) {
				storyBundle.primaryGroupColor = updatedStory.groupColor;
			}
		}
	}

	function handleStoryLiked(storyId: string, isLiked: boolean, likesCount: number) {
		if (!storyBundle) return;
		const st = storyBundle.stories.find((s) => s.id === storyId);
		if (st) {
			st.isLiked = isLiked;
			st.likesCount = likesCount;
		}
	}
</script>

<div class="profile-page">
	<PageHeader
		title={data.profile.name || data.profile.username || ''}
		username={data.profile.username || ''}
		back_location="/flux"
	/>

	<ProfileHeader
		profile={data.profile}
		isOwnProfile={data.isOwnProfile}
		isFollowing={data.isFollowing}
		isPending={data.isPending}
		stats={data.stats}
		{followersCount}
		lazyMutuals={data.lazy?.mutuals}
		pendingCount={data.pendingCount}
		{storyBundle}
		onAvatarClick={handleAvatarClick}
		onFollowToggle={(newState) => {
			if (newState === 'following') {
				localFollowersDelta = 1;
			} else if (newState === 'none') {
				localFollowersDelta = -1;
			}
		}}
	/>

	{#if data.isOwnProfile}
		<ProfileNavTabs activeTab={currentTab} onTabChange={(tab) => (currentTab = tab)} />
	{/if}

	{#if currentTab === 'posts'}
		<div class="sort-bar">
			<SortSelect
				bind:value={postsFeed.sortMode}
				onChange={handleSortChange}
				options={[
					{ value: 'chrono', label: 'Plus récents' },
					{ value: 'popular', label: 'Plus populaires' },
					{ value: 'oldest', label: 'Plus anciens' }
				]}
			/>
		</div>

		<PostGrid
			posts={postsFeed.posts}
			username={data.profile.username || undefined}
			sortMode={postsFeed.sortMode}
			hasMore={postsFeed.hasMore}
			isLoadingMore={postsFeed.isLoadingMore}
			onLoadMore={postsFeed.loadMore}
		/>
	{:else}
		<div class="sort-bar">
			<SortSelect
				bind:value={likesFeed.sortMode}
				onChange={handleSortChange}
				options={[
					{ value: 'chrono', label: 'Plus récents' },
					{ value: 'popular', label: 'Plus populaires' },
					{ value: 'oldest', label: 'Plus anciens' }
				]}
			/>
		</div>

		<PostGrid
			posts={likesFeed.posts}
			username={data.profile.username || undefined}
			feedUrlBase="coeurs"
			sortMode={likesFeed.sortMode}
			hasMore={likesFeed.hasMore}
			isLoadingMore={likesFeed.isLoadingMore}
			onLoadMore={likesFeed.loadMore}
		/>
	{/if}

	{#if isStoryViewerOpen && storyBundle}
		<StoryViewerModal
			bundles={[storyBundle]}
			initialStoryIndex={0}
			currentUserId={data.sessionUser?.id}
			isOpen={isStoryViewerOpen}
			onClose={() => (isStoryViewerOpen = false)}
			onStoryViewed={handleStoryViewed}
			onStoryDeleted={handleStoryDeleted}
			onStoryUpdated={handleStoryUpdated}
			onStoryLiked={handleStoryLiked}
		/>
	{/if}
</div>

<style>
	.sort-bar {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		padding: 8px 16px;
		gap: 8px;
	}
	.profile-page {
		width: 100%;
		max-width: var(--max-content-width, 600px);
		margin: 0 auto;
		background: var(--bg-surface, #ffffff);
		flex: 1;
		padding-bottom: calc(var(--nav-height, 60px) + env(safe-area-inset-bottom) + 20px);
	}
</style>
