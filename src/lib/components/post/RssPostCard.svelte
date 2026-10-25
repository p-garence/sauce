<!--
  @component RssPostCard
  @domain post
  @description Carte de rendu d'un article syndiqué issu d'un flux RSS/Atom externe.
-->
<script lang="ts">
	import type { PostData, MenuAction } from '$lib/types';
	import FormattedDate from '$lib/components/ui/FormattedDate.svelte';
	import ActionMenu from '$lib/components/ui/ActionMenu.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	let { post }: { post: PostData } = $props();

	let item = $derived(post.rssItem);
	let rawArticleUrl = $derived(item?.url || '');
	let articleUrl = $derived(/^https?:\/\//i.test(rawArticleUrl) ? rawArticleUrl : '');
	let feedTitle = $derived(item?.siteName || post.author.name || 'Flux RSS');
	let summary = $derived(item?.summary || '');
	let rawImageUrl = $derived(
		item?.imageUrl || (post.mediaUrls && post.mediaUrls[0]?.content) || ''
	);
	let imageUrl = $derived(/^https?:\/\/|^\/media\//i.test(rawImageUrl) ? rawImageUrl : '');
	let domain = $derived.by(() => {
		if (!articleUrl) return '';
		try {
			return new URL(articleUrl).hostname.replace(/^www\./, '');
		} catch {
			return '';
		}
	});

	let copied = $state(false);

	async function copyLink() {
		if (!articleUrl) return;
		try {
			await navigator.clipboard.writeText(articleUrl);
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 2000);
		} catch (e) {
			console.error('Erreur copie lien RSS:', e);
		}
	}

	let actions = $derived.by<MenuAction[]>(() => [
		{
			label: copied ? 'Lien copié !' : "Copier le lien de l'article",
			onClick: copyLink
		},
		{
			label: 'Ouvrir dans un nouvel onglet',
			onClick: () => {
				if (articleUrl) {
					window.open(articleUrl, '_blank', 'noopener,noreferrer');
				}
			}
		}
	]);

	let imageFailed = $state(false);
</script>

<article id="post-{post.id}" class="rss-post-card">
	<!-- EN-TÊTE -->
	<header class="rss-header">
		<div class="rss-source-meta">
			<div class="rss-source-avatar">
				{#if post.author.avatar && !imageFailed}
					<img
						src={post.author.avatar}
						alt=""
						class="rss-favicon"
						loading="lazy"
						onerror={() => (imageFailed = true)}
					/>
				{:else}
					<div class="rss-icon-fallback">
						<Icon name="source.rss" size={16} />
					</div>
				{/if}
			</div>

			<div class="rss-info">
				<div class="rss-source-line">
					<strong class="rss-source-name" title={feedTitle}>{feedTitle}</strong>
					<span class="rss-badge">
						<Icon name="source.rss" size={11} />
						RSS
					</span>
				</div>
				<FormattedDate date={post.createdAt} class="rss-date" />
			</div>
		</div>

		<div class="rss-actions">
			<ActionMenu {actions} />
		</div>
	</header>

	<!-- CORPS DU POST RSS -->
	<div class="rss-body">
		{#if item?.title}
			<h2 class="rss-title">
				<a
					href={articleUrl || '#'}
					target="_blank"
					rel="noopener noreferrer external"
					onclick={(e) => {
						if (!articleUrl) e.preventDefault();
					}}
				>
					{item.title}
				</a>
			</h2>
		{/if}

		{#if imageUrl}
			<a
				href={articleUrl || '#'}
				target="_blank"
				rel="noopener noreferrer external"
				class="rss-media-link"
				tabindex="-1"
				aria-hidden="true"
				onclick={(e) => {
					if (!articleUrl) e.preventDefault();
				}}
			>
				<img
					src={imageUrl}
					alt={item?.title || 'Illustration article'}
					class="rss-cover-image"
					loading="lazy"
					decoding="async"
				/>
			</a>
		{/if}

		{#if summary}
			<p class="rss-description">
				{summary}
			</p>
		{/if}

		{#if post.tags && post.tags.length > 0}
			<div class="rss-tags-row">
				{#each post.tags as tag (tag)}
					<span class="tag-pill">#{tag}</span>
				{/each}
			</div>
		{/if}
	</div>

	<!-- PIED DE CARTE / LIEN EXTERNE -->
	<footer class="rss-footer">
		<a
			href={articleUrl || '#'}
			target="_blank"
			rel="noopener noreferrer external"
			class="rss-read-btn"
			onclick={(e) => {
				if (!articleUrl) e.preventDefault();
			}}
		>
			<span>Lire l'article sur {domain || 'le site'}</span>
			<Icon name="action.external" size={14} />
		</a>
	</footer>
</article>

<style>
	.rss-post-card {
		background-color: var(--bg-surface, #ffffff);
		border-bottom: 1px solid var(--border-color, #eaeaea);
		padding: 16px 0;
		max-width: 600px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		width: 100%;
	}

	.rss-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 16px 10px;
	}

	.rss-source-meta {
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 0;
	}

	.rss-source-avatar {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #ffedd5;
		color: #ea580c;
		flex-shrink: 0;
	}

	.rss-favicon {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.rss-icon-fallback {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.rss-info {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.rss-source-line {
		display: flex;
		align-items: center;
		gap: 6px;
		min-width: 0;
	}

	.rss-source-name {
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--text-color, #1e293b);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.rss-badge {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		padding: 1px 6px;
		border-radius: 10px;
		background: #ffedd5;
		color: #c2410c;
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		flex-shrink: 0;
	}

	:global(.rss-date) {
		font-size: 0.8rem;
		color: #64748b;
	}

	.rss-actions {
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}

	.rss-body {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 0 16px;
	}

	.rss-title {
		font-size: 1.1rem;
		font-weight: 700;
		line-height: 1.35;
		margin: 0;
		color: var(--text-color, #0f172a);
	}

	.rss-title a {
		color: inherit;
		text-decoration: none;
		transition: color 0.15s;
	}

	.rss-title a:hover {
		color: var(--primary, #0ea5e9);
		text-decoration: underline;
	}

	.rss-media-link {
		display: block;
		width: 100%;
		max-height: 380px;
		border-radius: 12px;
		overflow: hidden;
		background: #f1f5f9;
	}

	.rss-cover-image {
		width: 100%;
		height: 100%;
		max-height: 380px;
		object-fit: cover;
		display: block;
		transition: transform 0.2s ease;
	}

	.rss-media-link:hover .rss-cover-image {
		transform: scale(1.01);
	}

	.rss-description {
		font-size: 0.95rem;
		line-height: 1.5;
		color: #334155;
		margin: 0;
		display: -webkit-box;
		-webkit-line-clamp: 4;
		line-clamp: 4;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.rss-tags-row {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 2px;
	}

	.tag-pill {
		padding: 3px 8px;
		background: #f1f5f9;
		color: #475569;
		font-size: 0.8rem;
		border-radius: 12px;
		font-weight: 500;
	}

	.rss-footer {
		padding: 12px 16px 0;
		display: flex;
		align-items: center;
	}

	.rss-read-btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 8px 16px;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 20px;
		color: #0f172a;
		font-size: 0.85rem;
		font-weight: 600;
		text-decoration: none;
		transition: all 0.15s ease;
	}

	.rss-read-btn:hover {
		background: #f1f5f9;
		border-color: #cbd5e1;
		color: var(--primary, #0ea5e9);
	}
</style>
