<!--
  @component StoryViewerModal
  @domain stories
  @description Modal plein écran de lecture immersive des stories avec progression, navigation tactile/clavier, réponses DM, likes et gestion auteur (téléchargement, paramètres, statistiques).
  @responsibilities
    - Coordonner l'affichage des bundles et slides de stories (index auteur et index story)
    - Gérer les raccourcis clavier (flèches, Espace, Échap) et le verrouillage du scroll
    - Déclencher l'enregistrement de vue (recordView) à chaque changement de story
    - Piloter l'état vidéo (play/pause) en synchronisation avec les tiroirs et saisies
    - Orchestrer les composants StoryProgressBar, StoryHeader, StoryMediaViewer, StoryFooter, StoryLikesDrawer et StorySettingsDrawer
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import type { StoryBundle, StoryItem, PostVisibility, UserGroup, EmojiItem } from '$lib/types';
	import StoryProgressBar from './StoryProgressBar.svelte';
	import StoryHeader from './StoryHeader.svelte';
	import StoryMediaViewer from './StoryMediaViewer.svelte';
	import StoryFooter from './StoryFooter.svelte';
	import StoryLikesDrawer from './StoryLikesDrawer.svelte';
	import StorySettingsDrawer from './StorySettingsDrawer.svelte';

	interface Props {
		bundles: StoryBundle[];
		initialAuthorIndex?: number;
		initialStoryIndex?: number;
		currentUserId?: string;
		userGroups?: UserGroup[];
		isOpen: boolean;
		onClose: () => void;
		onStoryViewed?: (storyId: string) => void;
		onStoryDeleted?: (storyId: string) => void;
		onStoryUpdated?: (updatedStory: StoryItem) => void;
		onStoryLiked?: (storyId: string, isLiked: boolean, likesCount: number) => void;
	}

	let {
		bundles = [],
		initialAuthorIndex = 0,
		initialStoryIndex = 0,
		currentUserId = '',
		userGroups,
		isOpen = false,
		onClose,
		onStoryViewed,
		onStoryDeleted,
		onStoryUpdated,
		onStoryLiked
	}: Props = $props();

	let authorIndex = $state(0);
	let storyIndex = $state(0);

	let currentBundle = $derived(bundles[authorIndex] || null);
	let currentStory = $derived<StoryItem | null>(
		currentBundle && currentBundle.stories[storyIndex] ? currentBundle.stories[storyIndex] : null
	);

	let isAuthor = $derived(
		Boolean(currentStory && currentUserId && currentStory.authorId === currentUserId)
	);

	let videoElement = $state<HTMLVideoElement | null>(null);

	// États pour la réponse et le like
	let replyText = $state('');
	let isSendingReply = $state(false);
	let replyFeedback = $state<{
		type: 'success' | 'error';
		message: string;
		chatId?: string;
	} | null>(null);
	let isLiking = $state(false);
	let prevIsOpen = false;
	let keyboardOffset = $state(0);
	let stageHeight = $state<number | null>(null);
	let stageTranslateY = $state(0);

	let availableGroups = $derived(
		userGroups && userGroups.length > 0 ? userGroups : (page.data?.userGroups as UserGroup[]) || []
	);

	// États pour le tiroir des likes de la story (pour l'auteur)
	let showInteractionsDrawer = $state(false);
	let interactionsData = $state<{
		likes: Array<{
			id: string;
			username: string | null;
			name: string | null;
			image: string | null;
		}>;
	} | null>(null);
	let isLoadingInteractions = $state(false);

	// États pour la modification des paramètres de la story (pour l'auteur)
	let showSettingsDrawer = $state(false);
	let isSavingSettings = $state(false);
	let editErrorMessage = $state('');

	function openSettings() {
		if (!currentStory) return;
		editErrorMessage = '';
		showSettingsDrawer = true;
		if (videoElement) {
			videoElement.pause();
		}
	}

	function closeSettings() {
		showSettingsDrawer = false;
		if (videoElement && !showInteractionsDrawer) {
			videoElement.play().catch(() => {});
		}
	}

	async function handleSaveSettings(settings: {
		visibility: PostVisibility;
		groupId: string | null;
		isArchived: boolean;
		duration: 'keep' | '24h' | '48h' | 'custom' | 'never';
		customHours?: number;
	}) {
		if (!currentStory || isSavingSettings) return;

		isSavingSettings = true;
		editErrorMessage = '';

		try {
			const res = await fetch(`/api/stories/${currentStory.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(settings)
			});

			const data = await res.json();
			if (res.ok && data.success) {
				currentStory.visibility = settings.visibility;
				currentStory.groupId = settings.groupId;
				currentStory.isArchived = settings.isArchived;
				if (data.story?.expiresAt) {
					currentStory.expiresAt =
						typeof data.story.expiresAt === 'string'
							? data.story.expiresAt
							: new Date(data.story.expiresAt).toISOString();
				}

				if (settings.groupId) {
					const grp = availableGroups.find((g) => g.id === settings.groupId);
					currentStory.groupName = grp?.name || null;
					currentStory.groupColor = grp?.color || null;
					currentStory.groupIcon = grp?.icon || null;
				} else {
					currentStory.groupName = null;
					currentStory.groupColor = null;
					currentStory.groupIcon = null;
				}

				onStoryUpdated?.(currentStory);
				closeSettings();
			} else {
				editErrorMessage = data.message || 'Erreur lors de la modification';
			}
		} catch (err) {
			console.error('Erreur mise à jour story:', err);
			editErrorMessage = 'Erreur de connexion';
		} finally {
			isSavingSettings = false;
		}
	}

	async function openInteractions() {
		if (!currentStory) return;
		showInteractionsDrawer = true;
		isLoadingInteractions = true;
		if (videoElement) {
			videoElement.pause();
		}
		try {
			const res = await fetch(`/api/stories/${currentStory.id}/interactions`);
			if (res.ok) {
				interactionsData = await res.json();
			}
		} catch (e) {
			console.error('Erreur interactions story:', e);
		} finally {
			isLoadingInteractions = false;
		}
	}

	function closeInteractions() {
		showInteractionsDrawer = false;
		if (videoElement && !showSettingsDrawer) {
			videoElement.play().catch(() => {});
		}
	}

	// Initialisation uniquement quand le modal s'ouvre
	$effect(() => {
		if (isOpen && !prevIsOpen) {
			untrack(() => {
				authorIndex = Math.max(0, Math.min(initialAuthorIndex, Math.max(0, bundles.length - 1)));
				const currentStoriesCount = bundles[authorIndex]?.stories?.length || 1;
				storyIndex = Math.max(0, Math.min(initialStoryIndex, currentStoriesCount - 1));
				replyText = '';
				replyFeedback = null;
			});
		}
		prevIsOpen = isOpen;
	});

	// Enregistrement de la vue et réinitialisation des formulaires dès que currentStory change
	$effect(() => {
		const storyId = isOpen && currentStory ? currentStory.id : null;
		if (storyId) {
			untrack(() => {
				recordView(storyId);
				replyText = '';
				replyFeedback = null;
			});
		}
	});

	// Verrouillage du scroll global et gestion dynamique de la scène et du clavier virtuel
	$effect(() => {
		if (typeof window === 'undefined' || typeof document === 'undefined') return;

		if (!isOpen) {
			document.documentElement.classList.remove('story-modal-open');
			document.body.classList.remove('story-modal-open');
			keyboardOffset = 0;
			stageTranslateY = 0;
			return;
		}

		document.documentElement.classList.add('story-modal-open');
		document.body.classList.add('story-modal-open');

		let baseViewportHeight = window.visualViewport?.height || window.innerHeight;
		stageHeight = baseViewportHeight;

		const handleViewportChange = () => {
			if (!window.visualViewport) return;
			const vv = window.visualViewport;

			if (vv.height > baseViewportHeight) {
				baseViewportHeight = vv.height;
				stageHeight = baseViewportHeight;
			}

			const isKeyboard = baseViewportHeight - vv.height > 100;
			keyboardOffset = isKeyboard ? Math.max(0, baseViewportHeight - vv.height) : 0;
			stageTranslateY = vv.offsetTop;

			if (window.scrollY !== 0) {
				window.scrollTo(0, 0);
			}
		};

		const handleWindowScroll = () => {
			if (window.scrollY !== 0) {
				window.scrollTo(0, 0);
			}
		};

		if (window.visualViewport) {
			window.visualViewport.addEventListener('resize', handleViewportChange);
			window.visualViewport.addEventListener('scroll', handleViewportChange);
			handleViewportChange();
		}

		window.addEventListener('scroll', handleWindowScroll, { passive: true });

		return () => {
			document.documentElement.classList.remove('story-modal-open');
			document.body.classList.remove('story-modal-open');
			if (window.visualViewport) {
				window.visualViewport.removeEventListener('resize', handleViewportChange);
				window.visualViewport.removeEventListener('scroll', handleViewportChange);
			}
			window.removeEventListener('scroll', handleWindowScroll);
			keyboardOffset = 0;
			stageTranslateY = 0;
		};
	});

	function nextStory() {
		if (!currentBundle) return;

		if (storyIndex < currentBundle.stories.length - 1) {
			storyIndex++;
		} else if (authorIndex < bundles.length - 1) {
			authorIndex++;
			storyIndex = 0;
		} else {
			onClose();
		}
	}

	function prevStory() {
		if (!currentBundle) return;

		if (storyIndex > 0) {
			storyIndex--;
		} else if (authorIndex > 0) {
			authorIndex--;
			const prevBundle = bundles[authorIndex];
			storyIndex = prevBundle ? Math.max(0, prevBundle.stories.length - 1) : 0;
		}
	}

	async function recordView(storyId: string) {
		if (!storyId) return;
		onStoryViewed?.(storyId);
		try {
			await fetch(`/api/stories/${storyId}/view`, { method: 'POST' });
		} catch {
			/* ignore */
		}
	}

	let isDoubleTapEnabled = $derived(Boolean(page.data?.sessionUser?.doubleTap));

	async function handleDoubleTapStoryLike() {
		if (!currentStory) return;
		await handleToggleLike();
	}

	async function handleToggleLike(e?: MouseEvent | PointerEvent | TouchEvent) {
		e?.stopPropagation?.();
		if (!currentStory || isLiking) return;

		const story = currentStory;
		const nextLiked = !story.isLiked;
		const nextCount = nextLiked ? story.likesCount + 1 : Math.max(0, story.likesCount - 1);

		story.isLiked = nextLiked;
		story.likesCount = nextCount;
		onStoryLiked?.(story.id, nextLiked, nextCount);
		isLiking = true;

		try {
			const res = await fetch(`/api/stories/${story.id}/like`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: nextLiked ? 'like' : 'unlike' })
			});
			const data = await res.json();
			if (data.success) {
				story.isLiked = data.isLiked;
				story.likesCount = data.likesCount;
				onStoryLiked?.(story.id, data.isLiked, data.likesCount);
			} else {
				story.isLiked = !nextLiked;
				story.likesCount = !nextLiked ? story.likesCount + 1 : Math.max(0, story.likesCount - 1);
				onStoryLiked?.(story.id, story.isLiked, story.likesCount);
			}
		} catch (err) {
			console.error('Erreur like story:', err);
			story.isLiked = !nextLiked;
			story.likesCount = !nextLiked ? story.likesCount + 1 : Math.max(0, story.likesCount - 1);
			onStoryLiked?.(story.id, story.isLiked, story.likesCount);
		} finally {
			isLiking = false;
		}
	}

	async function handleSendReply(e?: Event) {
		e?.stopPropagation();
		if (!currentStory || !replyText.trim() || isSendingReply) return;

		isSendingReply = true;
		replyFeedback = null;
		const textToSend = replyText.trim();

		try {
			const res = await fetch(`/api/stories/${currentStory.id}/reply`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ message: textToSend })
			});
			const data = await res.json();
			if (data.success) {
				replyText = '';
				replyFeedback = {
					type: 'success',
					message: 'Message envoyé !',
					chatId: data.chatId
				};
				setTimeout(() => {
					if (replyFeedback?.type === 'success') {
						replyFeedback = null;
					}
				}, 4000);
			} else {
				replyFeedback = {
					type: 'error',
					message: data.message || "Erreur lors de l'envoi"
				};
			}
		} catch (err) {
			console.error('Erreur reply story:', err);
			replyFeedback = {
				type: 'error',
				message: 'Erreur de connexion'
			};
		} finally {
			isSendingReply = false;
		}
	}

	function insertStoryReplyEmoji(emoji: EmojiItem) {
		const token = `:${emoji.name || emoji.id}:`;
		replyText = replyText ? `${replyText} ${token} ` : `${token} `;
		if (videoElement) {
			videoElement.pause();
		}
	}

	async function handleDelete() {
		if (!currentStory) return;
		if (!confirm('Supprimer cette story ?')) return;

		const storyId = currentStory.id;
		try {
			const res = await fetch(`/api/stories/${storyId}`, { method: 'DELETE' });
			if (res.ok) {
				onStoryDeleted?.(storyId);
				nextStory();
			}
		} catch (e) {
			console.error('Erreur suppression story:', e);
		}
	}

	let isDownloading = $state(false);

	async function handleDownload(e?: MouseEvent) {
		e?.stopPropagation();
		if (!currentStory?.mediaUrl || isDownloading) return;

		isDownloading = true;
		try {
			const res = await fetch(currentStory.mediaUrl);
			if (!res.ok) throw new Error('Échec du téléchargement');
			const blob = await res.blob();
			const blobUrl = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = blobUrl;
			const isVid = currentStory.mediaType === 'video' || currentStory.mediaUrl.endsWith('.mp4');
			const ext = isVid ? 'mp4' : 'jpg';
			a.download = `story-${currentStory.id}.${ext}`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(blobUrl);
		} catch (err) {
			console.error('Erreur téléchargement story:', err);
			const a = document.createElement('a');
			a.href = currentStory.mediaUrl;
			a.download = `story-${currentStory.id}`;
			a.target = '_blank';
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
		} finally {
			isDownloading = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!isOpen) return;
		if (showSettingsDrawer) {
			if (e.key === 'Escape') {
				closeSettings();
			}
			return;
		}
		if (showInteractionsDrawer) {
			if (e.key === 'Escape') {
				closeInteractions();
			}
			return;
		}
		if (
			e.target instanceof HTMLInputElement ||
			e.target instanceof HTMLTextAreaElement ||
			e.target instanceof HTMLSelectElement
		) {
			if (e.key === 'Escape') {
				(e.target as HTMLElement).blur();
			}
			return;
		}

		if (e.key === 'Escape') {
			onClose();
		} else if (e.key === 'ArrowRight' || e.key === ' ') {
			nextStory();
		} else if (e.key === 'ArrowLeft') {
			prevStory();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen && currentBundle && currentStory}
	<div class="story-viewer-backdrop" role="dialog" aria-modal="true">
		<div
			class="story-stage"
			style="{stageHeight ? `height: ${stageHeight}px;` : ''} {stageTranslateY
				? `transform: translateY(${stageTranslateY}px);`
				: ''}"
		>
			<StoryProgressBar stories={currentBundle.stories} currentIndex={storyIndex} />

			<StoryHeader
				author={currentBundle.author}
				{currentStory}
				{isAuthor}
				{isDownloading}
				{onClose}
				onDownload={handleDownload}
				onOpenSettings={openSettings}
				onDelete={handleDelete}
			/>

			<StoryMediaViewer
				{currentStory}
				{isDoubleTapEnabled}
				showPrevBtn={!(authorIndex === 0 && storyIndex === 0)}
				{isAuthor}
				{keyboardOffset}
				bind:videoElement
				onPrev={prevStory}
				onNext={nextStory}
				onDoubleTapLike={handleDoubleTapStoryLike}
			/>

			<StoryFooter
				{currentStory}
				authorUsername={currentBundle.author.username}
				{isAuthor}
				bind:replyText
				{isSendingReply}
				{replyFeedback}
				{keyboardOffset}
				{onClose}
				onToggleLike={handleToggleLike}
				onSendReply={handleSendReply}
				onEmojiSelect={insertStoryReplyEmoji}
				onOpenInteractions={openInteractions}
				onInputFocus={() => {
					if (videoElement) videoElement.pause();
				}}
				onInputBlur={() => {
					if (videoElement && !replyText.trim() && !showSettingsDrawer && !showInteractionsDrawer) {
						videoElement.play().catch(() => {});
					}
				}}
			/>

			<StoryLikesDrawer
				isOpen={showInteractionsDrawer}
				likesCount={currentStory.likesCount}
				likes={interactionsData?.likes || null}
				isLoading={isLoadingInteractions}
				onClose={closeInteractions}
			/>

			<StorySettingsDrawer
				isOpen={showSettingsDrawer}
				{currentStory}
				{availableGroups}
				isSaving={isSavingSettings}
				errorMessage={editErrorMessage}
				onClose={closeSettings}
				onSave={handleSaveSettings}
			/>
		</div>
	</div>
{/if}

<style>
	.story-viewer-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		width: 100%;
		height: 100%;
		background: #000;
		z-index: var(--z-modal, 9999);
		display: flex;
		align-items: flex-start;
		justify-content: center;
		touch-action: none;
		user-select: none;
		overflow: hidden;
	}

	.story-stage {
		position: relative;
		width: 100%;
		max-width: 480px;
		height: 100%;
		background: #050505;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		overflow: hidden;
		will-change: transform;
	}

	@media (min-width: 600px) {
		.story-viewer-backdrop {
			align-items: center;
		}
		.story-stage {
			height: 92vh !important;
			max-height: 860px;
			border-radius: 16px;
			box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
			transform: none !important;
		}
	}
</style>
