<script lang="ts">
	/**
	 * @component Post
	 * @domain Post
	 * @description Composant central d'affichage d'une publication dans le flux
	 * @responsibilities
	 * - Orchestrer l'en-tête (PostHeader), le contenu média / texte, la barre d'actions et les commentaires
	 * - Gérer les états spéciaux (supprimé, auteur bloqué, masqué, RSS)
	 * - Prendre en charge les interactions comme le double-tap pour aimer
	 */
	import type { PostData, MenuAction } from '$lib/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { goto, invalidateAll } from '$app/navigation';
	import PostHeader from '$lib/components/post/PostHeader.svelte';
	import CommentSection from '$lib/components/comments/CommentSection.svelte';
	import PostCarousel from '$lib/components/post/PostCarousel.svelte';
	import PostActionsBar from '$lib/components/post/PostActionsBar.svelte';
	import { trackView } from '$lib/client/viewTracker';
	import RichContent from '$lib/components/ui/RichContent.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	import { togglePostHide } from '$lib/client/postActions';
	import { getEffectiveHidden } from '$lib/client/postState.svelte';
	import { removePostFromMainFeedMemory } from '$lib/client/feedMemory.svelte';
	import DoubleTapDetector from '$lib/components/ui/DoubleTapDetector.svelte';
	import { apiToggleLike } from '$lib/client/api';
	import { clearProfileState } from '$lib/client/profileMemory.svelte';
	import AssetPostCard from '$lib/components/post/AssetPostCard.svelte';
	import RssPostCard from '$lib/components/post/RssPostCard.svelte';

	interface Props {
		/** Données complètes de la publication */
		post: PostData;
	}

	let { post }: Props = $props();

	let isDeleted = $state(false);
	let isBlockedAuthor = $state(false);
	let isCommentSectionOpen = $state(false);

	let textContainerElement: HTMLDivElement | undefined = $state();
	let isTextExpanded = $state(false);
	let showReadMoreBtn = $state(false);

	$effect(() => {
		if (textContainerElement) {
			showReadMoreBtn = textContainerElement.scrollHeight > textContainerElement.clientHeight + 4;
		}
	});

	let isLoggedIn = $derived(Boolean(page.data.sessionUser));
	let isAdmin = $derived(page.data.sessionUser?.role === 'admin');
	let isOwnPost = $derived(page.data.sessionUser?.id === post.author.id && !post.isSystem);
	let isSystemPost = $derived(Boolean(post.isSystem));
	let isSimpleText = $derived(
		post.mediaUrls && post.mediaUrls.length === 1 && post.mediaUrls[0].type === 'text'
	);
	let isRssPost = $derived(post.postType === 'rss' || Boolean(post.rssItem));

	let isHidden = $derived(getEffectiveHidden(post));
	let isDoubleTapEnabled = $derived(Boolean(page.data?.sessionUser?.doubleTap));

	async function handleDoubleTapLike() {
		if (!page.data?.sessionUser) {
			goto(resolve('/login'));
			return;
		}

		const nextLiked = !post.isLiked;
		post.isLiked = nextLiked;
		post.likesCount = nextLiked
			? (post.likesCount ?? 0) + 1
			: Math.max(0, (post.likesCount ?? 1) - 1);

		try {
			await apiToggleLike(post.id, 'like');
			clearProfileState(post.author.username, 'likes');
		} catch (e) {
			console.error('Erreur double tap like:', e);
			post.isLiked = !nextLiked;
			post.likesCount = !nextLiked
				? (post.likesCount ?? 0) + 1
				: Math.max(0, (post.likesCount ?? 1) - 1);
		}
	}

	async function handleDelete() {
		if (!confirm('Voulez-vous vraiment supprimer ce post ?')) return;

		try {
			const res = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' });
			if (res.ok) {
				isDeleted = true;
				removePostFromMainFeedMemory(post.id);
			} else {
				alert('Erreur lors de la suppression.');
			}
		} catch (e) {
			console.error('Erreur réseau lors de la suppression:', e);
			alert('Erreur réseau lors de la suppression.');
		}
	}

	async function handleBlockAuthor() {
		if (
			!confirm(
				`Voulez-vous vraiment bloquer @${post.author.username} ? Vous ne verrez plus ses publications ni ses messages.`
			)
		) {
			return;
		}

		try {
			const res = await fetch('/api/users/block', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ targetUserId: post.author.id, action: 'block' })
			});
			if (res.ok) {
				isBlockedAuthor = true;
				removePostFromMainFeedMemory(post.id);
				await invalidateAll();
			} else {
				alert('Erreur lors du blocage de cet utilisateur.');
			}
		} catch (e) {
			console.error('Erreur réseau lors du blocage:', e);
			alert('Erreur réseau lors du blocage.');
		}
	}

	let postActions = $derived.by<MenuAction[]>(() => {
		const actions: MenuAction[] = [
			{ label: 'Masquer', onClick: () => togglePostHide(post, true) },
			{
				label: 'Signaler',
				dividerBelow: isOwnPost || (!isOwnPost && !isSystemPost),
				onClick: () => alert('Bientôt disponible !')
			}
		];

		if (!isOwnPost && !isSystemPost && isLoggedIn) {
			actions.push({
				label: `Bloquer @${post.author.username}`,
				variant: 'danger',
				dividerBelow: isAdmin,
				onClick: handleBlockAuthor
			});
		}

		if (isOwnPost || (isSystemPost && isAdmin)) {
			if (!isSystemPost) {
				actions.push({
					label: 'Modifier',
					onClick: () => goto(resolve(`/modifier_post/${post.id}`), { state: { showBack: true } })
				});
			}
			actions.push({
				label: 'Supprimer',
				variant: 'danger',
				onClick: handleDelete
			});
		}
		return actions;
	});
</script>

{#if isDeleted}
	<div class="deleted-message">
		<span class="icon"><Icon name="action.delete" size={24} /></span>
		<p>Post supprimé</p>
	</div>
{:else if isBlockedAuthor}
	<div class="deleted-message">
		<span class="icon"><Icon name="status.lock" size={24} /></span>
		<p>Utilisateur @{post.author.username} bloqué</p>
	</div>
{:else if isHidden}
	<div class="hidden-post">
		<p>Post masqué.</p>
		<button type="button" onclick={() => togglePostHide(post, false)} class="btn-undo"
			>Annuler</button
		>
	</div>
{:else if isRssPost}
	<RssPostCard {post} />
{:else}
	<article id="post-{post.id}" class="post" use:trackView={isLoggedIn ? post.id : ''}>
		<PostHeader
			{post}
			{isLoggedIn}
			{isOwnPost}
			{isSystemPost}
			{postActions}
			onVisibilityChange={(newVis, newGroupId) => {
				post.visibility = newVis;
				post.groupId = newGroupId || null;
			}}
		/>

		{#if post.content}
			<div class="post-content">
				<p><RichContent content={post.content} /></p>
			</div>
		{/if}

		{#if isSimpleText && post.mediaUrls && post.mediaUrls.length > 0}
			<div class="text-post-wrapper">
				<div
					class="tweet-text {isTextExpanded ? 'expanded' : 'clamped'}"
					style="text-align: {post.mediaUrls[0].align || 'left'};"
					bind:this={textContainerElement}
				>
					<RichContent content={post.mediaUrls[0].content} />
				</div>
				{#if showReadMoreBtn && !isTextExpanded}
					<div class="text-fade-overlay"></div>
					<button type="button" class="see-more-btn" onclick={() => (isTextExpanded = true)}>
						Voir plus
					</button>
				{/if}
			</div>
		{:else if post.mediaUrls && post.mediaUrls.length > 0}
			{#if isDoubleTapEnabled}
				<DoubleTapDetector showHeartFeedback={!post.isLiked} onDoubleTap={handleDoubleTapLike}>
					<PostCarousel mediaUrls={post.mediaUrls} />
				</DoubleTapDetector>
			{:else}
				<PostCarousel mediaUrls={post.mediaUrls} />
			{/if}
		{/if}

		{#if post.iconSet}
			<AssetPostCard
				type="icon_set"
				asset={post.iconSet}
				authorUsername={post.author.username}
				postAuthorId={post.author.id}
			/>
		{/if}

		{#if post.emojiSet}
			<AssetPostCard
				type="emoji_set"
				asset={post.emojiSet}
				authorUsername={post.author.username}
				postAuthorId={post.author.id}
			/>
		{/if}

		{#if post.tags && post.tags.length > 0}
			<div class="post-tags-row">
				{#each post.tags as tag (tag)}
					<a href={resolve(`/tag/${encodeURIComponent(tag)}`)} class="tag-pill">#{tag}</a>
				{/each}
			</div>
		{/if}

		<PostActionsBar
			postId={post.id}
			isLiked={post.isLiked}
			likesCount={post.likesCount}
			commentsCount={post.commentsCount}
			authorUsername={post.author.username}
			onlikechange={(liked, count) => {
				post.isLiked = liked;
				post.likesCount = count;
			}}
			ontogglecomments={() => (isCommentSectionOpen = !isCommentSectionOpen)}
		/>

		<CommentSection
			postId={post.id}
			bind:isOpen={isCommentSectionOpen}
			onCommentAdded={() => {
				post.commentsCount++;
			}}
			onCommentDeleted={(deletedCount) => {
				post.commentsCount = Math.max(0, post.commentsCount - deletedCount);
			}}
		/>
	</article>
{/if}

<style>
	.post {
		background-color: var(--bg-surface, #ffffff);
		border-bottom: 1px solid var(--border-color, #eaeaea);
		padding: 16px 0;
		max-width: 600px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
	}
	.post-content {
		padding: 0 16px 12px;
		font-size: 0.95rem;
		line-height: 1.4;
		color: var(--text-main, #111);
	}
	.post-content p {
		margin: 0;
	}
	.text-post-wrapper {
		position: relative;
		margin: 0 16px 12px;
		padding: 0;
		display: flex;
		flex-direction: column;
	}
	.tweet-text {
		font-size: 1.1rem;
		line-height: 1.5;
		color: var(--text-main, #0f1419);
		white-space: pre-wrap;
		word-break: break-word;
	}
	.tweet-text.clamped {
		max-height: min(65vh, 480px);
		overflow: hidden;
	}
	.tweet-text.expanded {
		max-height: none;
		overflow: visible;
	}
	.text-fade-overlay {
		position: absolute;
		bottom: 32px;
		left: 0;
		right: 0;
		height: 60px;
		background: linear-gradient(to bottom, transparent, var(--bg-surface, #ffffff));
		pointer-events: none;
	}
	.see-more-btn {
		background: none;
		border: none;
		color: var(--primary, #0ea5e9);
		font-weight: 600;
		cursor: pointer;
		padding: 6px 0;
		font-size: 0.95rem;
		align-self: flex-start;
		margin-top: 4px;
	}
	.hidden-post {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 24px 16px;
		background: var(--bg-default, #f9fafb);
		border-bottom: 1px solid var(--border-color, #eaeaea);
		color: var(--text-muted, #666);
	}
	.btn-undo {
		background: none;
		border: 1px solid #ccc;
		padding: 6px 12px;
		border-radius: 16px;
		cursor: pointer;
		font-size: 0.85rem;
		font-weight: 600;
	}
	.deleted-message {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 32px 16px;
		background-color: var(--bg-surface, #ffffff);
		border-bottom: 1px solid var(--border-color, #eaeaea);
		color: var(--text-muted, #888);
		gap: 8px;
	}
	.deleted-message .icon {
		font-size: 1.5rem;
	}
	.deleted-message p {
		margin: 0;
		font-size: 0.9rem;
		font-weight: 500;
	}
	.post-tags-row {
		display: flex;
		flex-wrap: nowrap;
		overflow-x: auto;
		gap: 6px;
		padding: 6px 16px;
		scrollbar-width: none;
		-ms-overflow-style: none;
	}
	.post-tags-row::-webkit-scrollbar {
		display: none;
	}
	.tag-pill {
		display: inline-block;
		white-space: nowrap;
		flex-shrink: 0;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--primary, #0ea5e9);
		text-decoration: none;
		padding: 2px 8px;
		border-radius: 12px;
		background: #f0f9ff;
		transition:
			background 0.15s,
			color 0.15s;
	}
	.tag-pill:hover {
		background: #e0f2fe;
		color: #0284c7;
	}
</style>
