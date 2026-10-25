<script lang="ts">
	import { onMount } from 'svelte';
	import type { StoryBundle, StoryItem } from '$lib/types';
	import StoryViewerModal from './StoryViewerModal.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Icon from '$lib/components/ui/Icon.svelte';
	import StoryAvatar from '$lib/components/stories/StoryAvatar.svelte';

	interface Props {
		currentUserId?: string;
		currentUserAvatar?: string | null;
		currentUsername?: string | null;
		onAddStory?: () => void;
	}

	let {
		currentUserId = '',
		currentUserAvatar = null,
		currentUsername = '',
		onAddStory
	}: Props = $props();

	let bundles = $state<StoryBundle[]>([]);

	// État du modal de visionnage
	let isViewerOpen = $state(false);
	let activeAuthorIndex = $state(0);

	let userBundle = $derived(bundles.find((b) => b.author.id === currentUserId) || null);
	let otherBundles = $derived(bundles.filter((b) => b.author.id !== currentUserId));

	onMount(() => {
		loadStories();
	});

	export async function loadStories() {
		try {
			const res = await fetch('/api/stories');
			if (res.ok) {
				const data = await res.json();
				if (data.success && Array.isArray(data.bundles)) {
					bundles = data.bundles;
				}
			}
		} catch (e) {
			console.error('Erreur chargement stories:', e);
		}
	}

	function handleAddClick(e?: MouseEvent) {
		if (e) e.stopPropagation();
		if (onAddStory) {
			onAddStory();
		} else {
			goto(resolve('/publier?type=story'));
		}
	}

	function openUserStory() {
		if (!userBundle || userBundle.stories.length === 0) {
			handleAddClick();
			return;
		}
		const idx = bundles.findIndex((b) => b.author.id === currentUserId);
		if (idx !== -1) {
			activeAuthorIndex = idx;
			isViewerOpen = true;
		}
	}

	function openAuthorStory(bundle: StoryBundle) {
		const idx = bundles.findIndex((b) => b.author.id === bundle.author.id);
		if (idx !== -1) {
			activeAuthorIndex = idx;
			isViewerOpen = true;
		}
	}

	function handleStoryViewed(storyId: string) {
		for (const bundle of bundles) {
			const story = bundle.stories.find((s) => s.id === storyId);
			if (story) {
				story.isViewed = true;
				bundle.hasUnviewed = bundle.stories.some((s) => !s.isViewed);
				break;
			}
		}
	}

	function handleStoryDeleted(storyId: string) {
		bundles = bundles
			.map((bundle) => ({
				...bundle,
				stories: bundle.stories.filter((s) => s.id !== storyId)
			}))
			.filter((bundle) => bundle.stories.length > 0);
	}

	function handleStoryLiked(storyId: string, isLiked: boolean, likesCount: number) {
		for (const bundle of bundles) {
			const story = bundle.stories.find((s) => s.id === storyId);
			if (story) {
				story.isLiked = isLiked;
				story.likesCount = likesCount;
				break;
			}
		}
	}

	function handleStoryUpdated(updatedStory: StoryItem) {
		for (const bundle of bundles) {
			const idx = bundle.stories.findIndex((s) => s.id === updatedStory.id);
			if (idx !== -1) {
				bundle.stories[idx] = { ...bundle.stories[idx], ...updatedStory };
				bundle.hasGroupStory = bundle.stories.some((s) => s.groupId !== null);
				if (updatedStory.groupColor) {
					bundle.primaryGroupColor = updatedStory.groupColor;
				}
				break;
			}
		}
	}
</script>

<div class="stories-bar-container">
	<div class="stories-scroll">
		<!-- 1. Bulle de l'utilisateur courant -->
		<div class="story-bubble-wrapper">
			<div class="bubble-container">
				<StoryAvatar
					image={currentUserAvatar}
					username={currentUsername}
					size={62}
					borderWidth={2.5}
					hasStory={Boolean(userBundle && userBundle.stories.length > 0)}
					unviewed={Boolean(userBundle?.hasUnviewed)}
					groupRing={Boolean(userBundle?.hasGroupStory)}
					groupColor={userBundle?.primaryGroupColor}
					onclick={openUserStory}
					title={userBundle ? 'Voir votre story' : 'Ajouter une story'}
				/>

				<!-- Badge "+" -->
				<button
					type="button"
					class="badge-add"
					title="Ajouter une story"
					onclick={handleAddClick}
					aria-label="Ajouter une story"
				>
					<Icon name="action.add" size={12} color="white" />
				</button>
			</div>
			<span class="bubble-name">Votre story</span>
		</div>

		<!-- 2. Bulles des autres utilisateurs suivis -->
		{#each otherBundles as bundle (bundle.author.id)}
			<div class="story-bubble-wrapper">
				<div class="bubble-container">
					<StoryAvatar
						image={bundle.author.image}
						username={bundle.author.username}
						size={62}
						borderWidth={2.5}
						hasStory={true}
						unviewed={bundle.hasUnviewed}
						groupRing={bundle.hasGroupStory}
						groupColor={bundle.primaryGroupColor}
						onclick={() => openAuthorStory(bundle)}
						title="Voir les stories de @{bundle.author.username}"
					/>

					{#if bundle.hasGroupStory}
						<div
							class="badge-group"
							style="background: {bundle.primaryGroupColor || '#10b981'};"
							title="Story partagée dans un groupe"
						>
							<Icon name="status.users" size={10} color="white" />
						</div>
					{/if}
				</div>
				<span class="bubble-name">@{bundle.author.username}</span>
			</div>
		{/each}
	</div>
</div>

<!-- Visionneuse plein écran -->
<StoryViewerModal
	{bundles}
	initialAuthorIndex={activeAuthorIndex}
	{currentUserId}
	isOpen={isViewerOpen}
	onClose={() => (isViewerOpen = false)}
	onStoryViewed={handleStoryViewed}
	onStoryDeleted={handleStoryDeleted}
	onStoryLiked={handleStoryLiked}
	onStoryUpdated={handleStoryUpdated}
/>

<style>
	.stories-bar-container {
		width: 100%;
		background: var(--bg-surface, #ffffff);
		border-bottom: 1px solid var(--border-color, #eaeaea);
		padding: 10px 0 8px;
		user-select: none;
	}

	.stories-scroll {
		display: flex;
		gap: 14px;
		overflow-x: auto;
		scrollbar-width: none;
		padding: 0 16px;
		align-items: flex-start;
	}

	.stories-scroll::-webkit-scrollbar {
		display: none;
	}

	.story-bubble-wrapper {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 5px;
		width: 66px;
		flex-shrink: 0;
	}

	.bubble-container {
		position: relative;
		width: 62px;
		height: 62px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* Badge "+" pour l'utilisateur */
	.badge-add {
		position: absolute;
		bottom: 1px;
		right: 1px;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: var(--primary, #0ea5e9);
		color: #fff;
		border: 2px solid var(--bg-surface, #fff);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.95rem;
		font-weight: bold;
		line-height: 1;
		cursor: pointer;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
		z-index: 2;
	}

	/* Badge groupe */
	.badge-group {
		position: absolute;
		bottom: 1px;
		right: 1px;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		color: #fff;
		border: 2px solid var(--bg-surface, #fff);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.65rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
		z-index: 2;
		pointer-events: none;
	}

	.bubble-name {
		font-size: 0.72rem;
		color: var(--text-main, #333);
		max-width: 66px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		text-align: center;
		line-height: 1.2;
	}
</style>
