<!--
  @component PostGrid
  @domain post
  @description Grille de miniatures carrées de publications pour les profils et la recherche.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { togglePostHide } from '$lib/client/postActions';
	import { getEffectiveHidden } from '$lib/client/postState.svelte';
	import type { PostData } from '$lib/types.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import RichContent from '$lib/components/ui/RichContent.svelte';

	let {
		posts = [],
		username,
		feedUrlBase = 'posts',
		sortMode,
		hasMore = false,
		isLoadingMore = false,
		onLoadMore = undefined
	}: {
		posts: PostData[];
		username?: string;
		feedUrlBase?: string;
		sortMode?: string;
		hasMore?: boolean;
		isLoadingMore?: boolean;
		onLoadMore?: () => void;
	} = $props();

	let failedPosters = $state<Record<string, boolean>>({});

	// Construction propre et native de l'URL
	function getPostUrl(postId: string) {
		let basePath = username ? `/profil/${username}/${feedUrlBase}` : `/post/${postId}`;
		// @ts-expect-error no way to implement this with good types
		basePath = resolve(basePath);

		if (sortMode && username) {
			basePath += `?sort=${sortMode}`;
		}

		return `${basePath}#post-${postId}`;
	}
</script>

<div class="post-grid-wrapper">
	<div class="post-grid">
		{#each posts as post (post.id)}
			{@const isHidden = getEffectiveHidden(post)}

			{#if isHidden}
				<div class="grid-item hidden-grid-item">
					<div class="hidden-grid-content">
						<span>Masqué</span>
						<button class="btn-undo-grid" onclick={() => togglePostHide(post, false)}>
							Annuler
						</button>
					</div>
				</div>
			{:else}
				{@const mediaList = post.mediaUrls || []}
				{@const firstMedia = mediaList[0]}
				{@const isPureText = mediaList.length === 1 && firstMedia?.type === 'text'}
				{@const hasVideo =
					post.postType === 'video' ||
					mediaList.some(
						(m) => m.type === 'video' || /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(m.content || '')
					)}
				{@const isFirstVideo =
					firstMedia?.type === 'video' ||
					/\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(firstMedia?.content || '')}
				{@const isCarousel = mediaList.length > 1}
				{@const videoPoster =
					firstMedia?.poster ||
					(firstMedia?.content
						? firstMedia.content.replace(/\.(mp4|webm|mov|m4v|ogg)(\?|$)/i, '_poster.webp$2')
						: '')}

				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a href={getPostUrl(post.id)} class="grid-item">
					{#if isPureText && firstMedia}
						<div class="grid-text-preview">
							<p><RichContent content={firstMedia.content} clickable={false} /></p>
						</div>
					{:else if firstMedia}
						{#if isFirstVideo}
							{#if videoPoster && !failedPosters[post.id]}
								<img
									src={videoPoster}
									alt="Aperçu vidéo"
									loading="lazy"
									decoding="async"
									onerror={() => (failedPosters[post.id] = true)}
								/>
							{:else}
								<video src={firstMedia.content} muted playsinline preload="metadata"></video>
							{/if}
						{:else if firstMedia.type === 'image' || (!firstMedia.type && firstMedia.content)}
							<img src={firstMedia.content} alt="Aperçu du post" loading="lazy" decoding="async" />
						{:else}
							<div class="grid-text-preview">
								<p>
									<RichContent
										content={firstMedia.content?.substring(0, 30) + '...'}
										clickable={false}
									/>
								</p>
							</div>
						{/if}

						{#if hasVideo}
							<span class="media-icon" class:shifted={isCarousel} title="Vidéo">
								<Icon name="media.video" size={13} color="white" />
							</span>
						{/if}
						{#if isCarousel}
							<span class="carousel-icon" title="Carrousel">
								<Icon name="media.carousel" size={13} color="white" />
							</span>
						{/if}
					{:else if post.content}
						<div class="grid-text-preview">
							<p><RichContent content={post.content} clickable={false} /></p>
						</div>
					{:else}
						<div class="grid-text-preview"><p></p></div>
					{/if}
				</a>
			{/if}
		{/each}
	</div>

	{#if posts.length === 0}
		<div class="empty-state">
			<p>Aucune publication pour le moment.</p>
		</div>
	{/if}

	<!-- 👇 LE BOUTON UNIFIÉ -->
	{#if hasMore && onLoadMore}
		<button class="load-more-btn" onclick={onLoadMore} disabled={isLoadingMore}>
			{isLoadingMore ? 'Chargement...' : 'Voir plus'}
		</button>
	{/if}
</div>

<style>
	.post-grid-wrapper {
		display: flex;
		flex-direction: column;
		width: 100%;
	}
	.post-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 2px;
	}
	.grid-item {
		aspect-ratio: 1 / 1;
		background: #f8f8f8;
		position: relative;
		overflow: hidden;
		display: block;
		text-decoration: none;
		color: inherit;
	}
	.grid-item img,
	.grid-item video {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.grid-text-preview {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 8px;
		text-align: center;
		font-size: 0.8rem;
		background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%);
	}
	.grid-text-preview p {
		margin: 0;
		word-break: break-word;
	}
	.media-icon,
	.carousel-icon {
		position: absolute;
		top: 6px;
		background: rgba(0, 0, 0, 0.65);
		color: #ffffff;
		border-radius: 6px;
		padding: 3px 5px;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 2;
		backdrop-filter: blur(4px);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
		line-height: 1;
	}
	.carousel-icon {
		right: 6px;
	}
	.media-icon {
		right: 6px;
	}
	.media-icon.shifted {
		right: 32px;
	}
	.empty-state {
		padding: 40px 16px;
		text-align: center;
		color: #999;
	}
	.hidden-grid-item {
		background: #111;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.hidden-grid-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		color: #fff;
		font-weight: bold;
		font-size: 0.9rem;
	}
	.btn-undo-grid {
		background: rgba(255, 255, 255, 0.2);
		border: none;
		color: white;
		padding: 4px 12px;
		border-radius: 12px;
		font-size: 0.75rem;
		cursor: pointer;
		transition: background 0.2s;
	}
	.btn-undo-grid:hover {
		background: rgba(255, 255, 255, 0.4);
	}

	/* 👇 CSS DU BOUTON VOIR PLUS */
	.load-more-btn {
		width: 100%;
		background: none;
		border: none;
		padding: 16px;
		font-weight: 600;
		color: var(--primary, #0ea5e9);
		cursor: pointer;
		transition: color 0.2s;
		margin-top: 8px;
	}
	.load-more-btn:disabled {
		color: #94a3b8;
		cursor: wait;
	}
	.load-more-btn:hover:not(:disabled) {
		color: #0284c7;
	}
</style>
