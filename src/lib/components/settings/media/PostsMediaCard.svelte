<!--
  @component PostsMediaCard
  @domain settings/media
  @description Carte de gestion des publications contenant des médias avec tri et suppression.
  @responsibilities
    - Lister les publications avec médias actifs
    - Permettre le tri par taille (croissante/décroissante) ou date
    - Permettre la pagination dynamique locale (Afficher plus / Réduire)
    - Proposer la suppression ciblée et le lien vers l'édition
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import SettingsCard from '$lib/components/settings/ui/SettingsCard.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { formatBytes } from '$lib/utils/format';
	import type { UserMediaPostItem } from '$lib/server/media';

	/**
	 * Propriétés du composant PostsMediaCard
	 */
	interface Props {
		/** Liste des publications contenant des médias */
		posts: UserMediaPostItem[];
		/** Identifiant de la publication en cours de suppression, ou null */
		deletingId: string | null;
		/** Callback déclenché pour supprimer une publication */
		onDelete: (postId: string) => Promise<void> | void;
	}

	let { posts, deletingId, onDelete }: Props = $props();

	let sortBy = $state<'size_desc' | 'size_asc' | 'date_desc' | 'date_asc'>('size_desc');
	let postsLimit = $state(4);

	function formatDate(d: Date | string): string {
		const date = new Date(d);
		return date.toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	const sortedPosts = $derived.by(() => {
		const list = [...posts];
		if (sortBy === 'size_desc') {
			return list.sort((a, b) => b.totalSizeBytes - a.totalSizeBytes);
		} else if (sortBy === 'size_asc') {
			return list.sort((a, b) => a.totalSizeBytes - b.totalSizeBytes);
		} else if (sortBy === 'date_desc') {
			return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
		} else if (sortBy === 'date_asc') {
			return list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
		}
		return list;
	});

	const visiblePosts = $derived(sortedPosts.slice(0, postsLimit));
</script>

<SettingsCard title="Publications" description="Consultez la taille et gérez les publications">
	<div class="posts-controls">
		<span class="posts-count">
			<strong>{sortedPosts.length}</strong> publication(s) avec médias
		</span>

		<div class="sort-selector">
			<label for="media-sort">Trier par :</label>
			<select id="media-sort" bind:value={sortBy}>
				<option value="size_desc">Plus lourd d'abord</option>
				<option value="size_asc">Plus léger d'abord</option>
				<option value="date_desc">Plus récent d'abord</option>
				<option value="date_asc">Plus ancien d'abord</option>
			</select>
		</div>
	</div>

	{#if sortedPosts.length === 0}
		<div class="empty-state">
			<p>Aucune publication avec des médias pour le moment.</p>
		</div>
	{:else}
		<div class="media-posts-list">
			{#each visiblePosts as post (post.id)}
				<div class="media-post-item">
					<div class="post-preview">
						{#if post.thumbnail}
							{#if post.postType === 'video' || post.thumbnail.endsWith('.mp4')}
								<div class="video-thumbnail">
									<span class="video-badge">▶ Vidéo</span>
								</div>
							{:else}
								<img src={post.thumbnail} alt="Aperçu publication" class="post-thumb-img" />
							{/if}
						{:else}
							<div class="no-thumb">
								<Icon name="media.image" size={20} />
							</div>
						{/if}
					</div>

					<div class="post-details">
						<p class="post-caption">
							{#if post.content}
								{post.content.length > 90 ? post.content.slice(0, 90) + '...' : post.content}
							{:else}
								<em class="no-text">Publication sans texte</em>
							{/if}
						</p>

						<div class="post-meta">
							<span class="meta-date">{formatDate(post.createdAt)}</span>
							<span class="meta-dot">•</span>
							<span class="meta-count">{post.mediaCount} média(s)</span>
							<span class="meta-dot">•</span>
							<span class="meta-size">{formatBytes(post.totalSizeBytes)}</span>
						</div>
					</div>

					<div class="post-actions">
						<a
							href={resolve(`/modifier_post/${post.id}`)}
							class="btn-action btn-edit"
							title="Modifier le post"
						>
							Modifier
						</a>

						<button
							type="button"
							class="btn-action btn-delete"
							disabled={deletingId === post.id}
							onclick={() => onDelete(post.id)}
							title="Supprimer définitivement"
						>
							{#if deletingId === post.id}
								...
							{:else}
								Supprimer
							{/if}
						</button>
					</div>
				</div>
			{/each}
		</div>

		{#if sortedPosts.length > postsLimit}
			<div class="pagination-footer">
				<button type="button" class="btn-show-more" onclick={() => (postsLimit += 4)}>
					Afficher plus ({sortedPosts.length - postsLimit} restant{sortedPosts.length - postsLimit >
					1
						? 's'
						: ''})
				</button>
			</div>
		{:else if postsLimit > 4 && sortedPosts.length > 4}
			<div class="pagination-footer">
				<button type="button" class="btn-show-less" onclick={() => (postsLimit = 4)}>
					Réduire
				</button>
			</div>
		{/if}
	{/if}
</SettingsCard>

<style>
	.posts-controls {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 16px;
		flex-wrap: wrap;
		gap: 12px;
	}

	.posts-count {
		font-size: 0.9rem;
		color: #4b5563;
	}

	.sort-selector {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.85rem;
		color: #4b5563;
	}

	.sort-selector select {
		padding: 6px 10px;
		border-radius: 6px;
		border: 1px solid #d1d5db;
		background: white;
		font-size: 0.85rem;
		color: #1f2937;
		cursor: pointer;
	}

	.empty-state {
		padding: 32px 16px;
		text-align: center;
		color: #6b7280;
		font-size: 0.95rem;
	}

	.media-posts-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.media-post-item {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 12px;
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		transition: background-color 0.15s ease;
	}

	.media-post-item:hover {
		background: #f3f4f6;
	}

	.post-preview {
		width: 56px;
		height: 56px;
		flex-shrink: 0;
		border-radius: 6px;
		overflow: hidden;
		background: #e5e7eb;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.post-thumb-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.video-thumbnail {
		width: 100%;
		height: 100%;
		background: #1f2937;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.video-badge {
		color: white;
		font-size: 0.65rem;
		font-weight: 600;
	}

	.no-thumb {
		font-size: 1.5rem;
	}

	.post-details {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.post-caption {
		margin: 0;
		font-size: 0.9rem;
		color: #1f2937;
		word-break: break-word;
	}

	.no-text {
		color: #9ca3af;
	}

	.post-meta {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 0.8rem;
		color: #6b7280;
		flex-wrap: wrap;
	}

	.meta-dot {
		color: #cbd5e1;
	}

	.meta-size {
		font-weight: 600;
		color: #2563eb;
		background: #eff6ff;
		padding: 2px 6px;
		border-radius: 4px;
	}

	.post-actions {
		display: flex;
		gap: 8px;
		flex-shrink: 0;
	}

	.btn-action {
		padding: 6px 12px;
		border-radius: 6px;
		font-size: 0.8rem;
		font-weight: 500;
		text-decoration: none;
		cursor: pointer;
		border: 1px solid transparent;
		transition: all 0.15s ease;
	}

	.btn-edit {
		background: white;
		border-color: #d1d5db;
		color: #374151;
	}

	.btn-edit:hover {
		background: #f3f4f6;
		color: #111827;
	}

	.btn-delete {
		background: #fee2e2;
		color: #991b1b;
	}

	.btn-delete:hover:not(:disabled) {
		background: #fecaca;
	}

	.btn-delete:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.pagination-footer {
		display: flex;
		justify-content: center;
		margin-top: 14px;
		gap: 10px;
	}

	.btn-show-more,
	.btn-show-less {
		padding: 8px 20px;
		border-radius: 20px;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s;
		border: 1px solid #cbd5e1;
		background: #ffffff;
		color: #334155;
	}

	.btn-show-more:hover {
		background: #f1f5f9;
		color: #0ea5e9;
		border-color: #0ea5e9;
	}

	.btn-show-less:hover {
		background: #f1f5f9;
		color: #64748b;
	}

	@media (max-width: 640px) {
		.media-post-item {
			flex-direction: column;
			align-items: flex-start;
		}

		.post-actions {
			width: 100%;
			justify-content: flex-end;
		}
	}
</style>
