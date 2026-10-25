<!--
  @component SettingsMedia
  @domain settings/media
  @description Panneau principal de gestion de l'espace de stockage et des contenus multimédias de l'utilisateur.
  @responsibilities
    - Orchestrer le suivi du quota global et du stockage local
    - Piloter la liste et la suppression des publications avec médias
    - Piloter le filtrage, la visualisation et la modification des stories
    - Piloter les pièces jointes de la messagerie
    - Piloter le récapitulatif des collections personnalisées d'icônes et d'émojis
-->
<script lang="ts">
	import { page } from '$app/state';
	import type { UserMediaUsage, UserMediaStoryItem } from '$lib/server/media';
	import { removePostFromMainFeedMemory } from '$lib/client/feedMemory.svelte';
	import StoryViewerModal from '$lib/components/stories/StoryViewerModal.svelte';
	import type { StoryBundle, StoryItem, PostVisibility, UserGroup } from '$lib/types';
	import StorageQuotaCard from './media/StorageQuotaCard.svelte';
	import PostsMediaCard from './media/PostsMediaCard.svelte';
	import StoriesMediaCard from './media/StoriesMediaCard.svelte';
	import ChatFilesMediaCard from './media/ChatFilesMediaCard.svelte';
	import CustomAssetsMediaCard from './media/CustomAssetsMediaCard.svelte';
	import StoryEditModal from './media/StoryEditModal.svelte';

	/**
	 * Propriétés du panneau SettingsMedia
	 */
	interface Props {
		/** Données complètes d'utilisation du stockage multimédia */
		mediaUsage?: UserMediaUsage;
		/** Profil de l'utilisateur connecté */
		currentUser?: {
			id: string;
			username: string | null;
			name: string | null;
			image: string | null;
		};
		/** Groupes de visibilité de l'utilisateur */
		userGroups?: UserGroup[];
	}

	let {
		mediaUsage,
		currentUser,
		userGroups
	}: Props = $props();

	const groupsList = $derived(userGroups || (page.data?.userGroups as UserGroup[]) || []);

	const usage: UserMediaUsage = $derived(
		mediaUsage ?? {
			totalBytes: 0,
			quotaBytes: 2147483648,
			posts: [],
			stories: [],
			messages: [],
			iconSets: [],
			emojiSets: []
		}
	);

	// Suppression locale réactive des posts
	let deletedPostIds = $state<string[]>([]);
	let deletingId = $state<string | null>(null);

	// Suppression locale et surcharges réactives des stories
	let deletedStoryIds = $state<string[]>([]);
	let deletingStoryId = $state<string | null>(null);
	let storyOverrides = $state<
		Record<
			string,
			{
				visibility: PostVisibility;
				groupId: string | null;
				isArchived: boolean;
				expiresAt?: Date | string;
			}
		>
	>({});

	// Suppression locale des pièces jointes de discussion
	let deletedMessageIds = $state<string[]>([]);
	let deletingMessageId = $state<string | null>(null);

	// Modales
	let editingStory = $state<UserMediaStoryItem | null>(null);
	let isStoryModalOpen = $state(false);
	let modalStoryIndex = $state(0);

	const activePosts = $derived(usage.posts.filter((p) => !deletedPostIds.includes(p.id)));

	const activeStories = $derived(
		(usage.stories ?? [])
			.filter((s) => !deletedStoryIds.includes(s.id))
			.map((s) => {
				const override = storyOverrides[s.id];
				if (override) {
					const expDate = override.expiresAt ? new Date(override.expiresAt) : s.expiresAt;
					const isExp = expDate <= new Date();
					return {
						...s,
						visibility: override.visibility,
						groupId: override.groupId,
						isArchived: override.isArchived,
						expiresAt: expDate,
						isExpired: isExp
					};
				}
				return s;
			})
	);

	const activeChatFiles = $derived(
		(usage.messages ?? []).filter((m) => !deletedMessageIds.includes(m.id))
	);

	const currentUsedBytes = $derived(
		activePosts.reduce((acc, p) => acc + p.totalSizeBytes, 0) +
			activeStories.reduce((acc, s) => acc + s.totalSizeBytes, 0) +
			activeChatFiles.reduce((acc, m) => acc + m.totalSizeBytes, 0)
	);

	const quotaBytes = $derived(usage.quotaBytes);

	const usedPercentage = $derived(
		quotaBytes > 0 ? Math.min(100, Math.max(0, (currentUsedBytes / quotaBytes) * 100)) : 0
	);

	const progressColor = $derived.by(() => {
		if (usedPercentage > 90) return '#ef4444';
		if (usedPercentage > 70) return '#f59e0b';
		return '#10b981';
	});

	const storyBundles = $derived.by<StoryBundle[]>(() => {
		if (activeStories.length === 0) return [];
		const authorId = currentUser?.id || 'me';
		const mappedStories: StoryItem[] = activeStories.map((s) => {
			const grp = s.groupId ? groupsList.find((g) => g.id === s.groupId) : null;
			return {
				id: s.id,
				authorId,
				mediaUrl: s.mediaUrl,
				mediaType: s.mediaType,
				caption: s.caption,
				visibility: s.visibility,
				groupId: s.groupId,
				groupName: grp?.name || null,
				groupColor: grp?.color || null,
				groupIcon: grp?.icon || null,
				viewsCount: 0,
				likesCount: 0,
				expiresAt: typeof s.expiresAt === 'string' ? s.expiresAt : s.expiresAt.toISOString(),
				createdAt: typeof s.createdAt === 'string' ? s.createdAt : s.createdAt.toISOString(),
				isViewed: true,
				isLiked: false,
				isArchived: s.isArchived
			};
		});

		return [
			{
				author: {
					id: authorId,
					username: currentUser?.username ?? 'Moi',
					name: currentUser?.name ?? 'Mes Stories',
					image: currentUser?.image ?? null
				},
				stories: mappedStories,
				hasUnviewed: false,
				hasGroupStory: mappedStories.some((s) => s.groupId !== null),
				latestCreatedAt: mappedStories[0]?.createdAt ?? new Date().toISOString()
			}
		];
	});

	function openStoryViewer(index: number) {
		modalStoryIndex = index;
		isStoryModalOpen = true;
	}

	function onStoryDeletedFromModal(storyId: string) {
		deletedStoryIds = [...deletedStoryIds, storyId];
	}

	function onStoryUpdatedFromModal(updatedStory: StoryItem) {
		storyOverrides = {
			...storyOverrides,
			[updatedStory.id]: {
				visibility: updatedStory.visibility,
				groupId: updatedStory.groupId,
				isArchived: updatedStory.isArchived ?? true,
				expiresAt: updatedStory.expiresAt
			}
		};
	}

	function handleStorySaved(
		storyId: string,
		updated: {
			visibility: PostVisibility;
			groupId: string | null;
			isArchived: boolean;
			expiresAt?: Date;
		}
	) {
		storyOverrides = {
			...storyOverrides,
			[storyId]: updated
		};
	}

	async function handleDeletePost(postId: string) {
		if (
			!confirm(
				'Voulez-vous supprimer définitivement cette publication et libérer son espace média ?'
			)
		) {
			return;
		}

		deletingId = postId;
		try {
			const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.error || 'Erreur lors de la suppression');
			}
			deletedPostIds = [...deletedPostIds, postId];
			removePostFromMainFeedMemory(postId);
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : 'Impossible de supprimer cette publication';
			alert(message);
		} finally {
			deletingId = null;
		}
	}

	async function handleDeleteStory(storyId: string) {
		if (
			!confirm(
				'Voulez-vous supprimer définitivement cette story et libérer son espace de stockage ?'
			)
		) {
			return;
		}

		deletingStoryId = storyId;
		try {
			const res = await fetch(`/api/stories/${storyId}`, { method: 'DELETE' });
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.message || 'Erreur lors de la suppression de la story');
			}
			deletedStoryIds = [...deletedStoryIds, storyId];
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : 'Impossible de supprimer cette story';
			alert(message);
		} finally {
			deletingStoryId = null;
		}
	}

	async function handleDeleteChatFile(messageId: string) {
		if (
			!confirm(
				'Voulez-vous supprimer définitivement ce fichier et libérer son espace de stockage ?'
			)
		) {
			return;
		}

		deletingMessageId = messageId;
		try {
			const res = await fetch(`/api/chat/messages/${messageId}`, { method: 'DELETE' });
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.message || 'Erreur lors de la suppression du fichier');
			}
			deletedMessageIds = [...deletedMessageIds, messageId];
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : 'Impossible de supprimer ce fichier';
			alert(message);
		} finally {
			deletingMessageId = null;
		}
	}
</script>

<StorageQuotaCard
	{currentUsedBytes}
	{quotaBytes}
	{usedPercentage}
	{progressColor}
/>

<PostsMediaCard
	posts={activePosts}
	{deletingId}
	onDelete={handleDeletePost}
/>

<StoriesMediaCard
	stories={activeStories}
	userGroups={groupsList}
	{deletingStoryId}
	onDeleteStory={handleDeleteStory}
	onOpenEditStory={(story) => (editingStory = story)}
	onOpenStoryViewer={openStoryViewer}
/>

<ChatFilesMediaCard
	chatFiles={activeChatFiles}
	{deletingMessageId}
	onDeleteChatFile={handleDeleteChatFile}
/>

<CustomAssetsMediaCard
	iconSets={usage.iconSets}
	emojiSets={usage.emojiSets}
/>

{#if editingStory}
	<StoryEditModal
		story={editingStory}
		userGroups={groupsList}
		onClose={() => (editingStory = null)}
		onSaved={handleStorySaved}
	/>
{/if}

<StoryViewerModal
	bundles={storyBundles}
	initialStoryIndex={modalStoryIndex}
	currentUserId={currentUser?.id}
	userGroups={groupsList}
	isOpen={isStoryModalOpen}
	onClose={() => (isStoryModalOpen = false)}
	onStoryDeleted={onStoryDeletedFromModal}
	onStoryUpdated={onStoryUpdatedFromModal}
/>
