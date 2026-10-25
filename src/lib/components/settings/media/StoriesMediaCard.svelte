<!--
  @component StoriesMediaCard
  @domain settings/media
  @description Carte de gestion des stories avec filtrage (actives/archivées), prévisualisation et actions rapides.
  @responsibilities
    - Filtrer les stories par statut (toutes, actives, archivées)
    - Trier par date de création ou poids en octets
    - Prévisualiser les miniatures (photo ou vidéo) et lancer le lecteur immersif
    - Proposer les boutons d'édition (visibilité/archivage) et de suppression
-->
<script lang="ts">
	import SettingsCard from '$lib/components/settings/ui/SettingsCard.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { formatBytes } from '$lib/utils/format';
	import type { UserMediaStoryItem } from '$lib/server/media';
	import type { UserGroup } from '$lib/types';

	/**
	 * Propriétés du composant StoriesMediaCard
	 */
	interface Props {
		/** Liste des stories de l'utilisateur (avec éventuelles surcharges) */
		stories: UserMediaStoryItem[];
		/** Groupes de l'utilisateur pour le libellé des groupes cibles */
		userGroups: UserGroup[];
		/** Identifiant de la story en cours de suppression */
		deletingStoryId: string | null;
		/** Callback déclenché pour supprimer une story */
		onDeleteStory: (storyId: string) => Promise<void> | void;
		/** Callback pour ouvrir la modale d'édition des métadonnées d'une story */
		onOpenEditStory: (story: UserMediaStoryItem) => void;
		/** Callback pour lancer le lecteur immersif de story à un index donné */
		onOpenStoryViewer: (index: number) => void;
	}

	let {
		stories,
		userGroups,
		deletingStoryId,
		onDeleteStory,
		onOpenEditStory,
		onOpenStoryViewer
	}: Props = $props();

	let storyFilter = $state<'all' | 'archived' | 'active'>('all');
	let storySortBy = $state<'date_desc' | 'date_asc' | 'size_desc' | 'size_asc'>('date_desc');
	let storiesLimit = $state(4);

	function formatDate(d: Date | string): string {
		const date = new Date(d);
		return date.toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	function getGroupName(groupId: string | null): string {
		if (!groupId) return 'Groupe';
		const grp = userGroups.find((g) => g.id === groupId);
		return grp ? grp.name : 'Groupe';
	}

	const filteredStories = $derived.by(() => {
		let list = [...stories];
		if (storyFilter === 'archived') {
			list = list.filter((s) => s.isExpired && s.isArchived);
		} else if (storyFilter === 'active') {
			list = list.filter((s) => !s.isExpired);
		}

		if (storySortBy === 'size_desc') {
			return list.sort((a, b) => b.totalSizeBytes - a.totalSizeBytes);
		} else if (storySortBy === 'size_asc') {
			return list.sort((a, b) => a.totalSizeBytes - b.totalSizeBytes);
		} else if (storySortBy === 'date_desc') {
			return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
		} else if (storySortBy === 'date_asc') {
			return list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
		}
		return list;
	});

	const visibleStories = $derived(filteredStories.slice(0, storiesLimit));
</script>

<SettingsCard
	title="Stories"
	description="Consultez et gérez vos stories enregistrées ou archivées."
>
	<div class="posts-controls">
		<div class="stories-tabs">
			<button
				type="button"
				class="filter-chip"
				class:active={storyFilter === 'all'}
				onclick={() => (storyFilter = 'all')}
			>
				Toutes ({stories.length})
			</button>
			<button
				type="button"
				class="filter-chip"
				class:active={storyFilter === 'archived'}
				onclick={() => (storyFilter = 'archived')}
			>
				Archivées ({stories.filter((s) => s.isExpired && s.isArchived).length})
			</button>
			<button
				type="button"
				class="filter-chip"
				class:active={storyFilter === 'active'}
				onclick={() => (storyFilter = 'active')}
			>
				En cours ({stories.filter((s) => !s.isExpired).length})
			</button>
		</div>

		<div class="sort-selector">
			<label for="story-sort">Trier par :</label>
			<select id="story-sort" bind:value={storySortBy}>
				<option value="date_desc">Plus récent d'abord</option>
				<option value="date_asc">Plus ancien d'abord</option>
				<option value="size_desc">Plus lourd d'abord</option>
				<option value="size_asc">Plus léger d'abord</option>
			</select>
		</div>
	</div>

	{#if filteredStories.length === 0}
		<div class="empty-state">
			<p>Aucune story trouvée pour ce filtre.</p>
		</div>
	{:else}
		<div class="media-stories-list">
			{#each visibleStories as story, index (story.id)}
				<div class="media-story-item">
					<!-- Aperçu miniature (format story compact) -->
					<div
						class="story-preview"
						onclick={() => onOpenStoryViewer(index)}
						role="button"
						tabindex="0"
						onkeydown={(e) => e.key === 'Enter' && onOpenStoryViewer(index)}
						title="Visualiser la story"
					>
						{#if story.mediaType === 'video'}
							<video
								src={story.mediaUrl}
								class="story-thumb-img"
								preload="metadata"
								muted
								playsinline
							></video>
							<span class="story-type-badge">▶</span>
						{:else}
							<img src={story.mediaUrl} alt="Aperçu story" class="story-thumb-img" loading="lazy" />
						{/if}
					</div>

					<!-- Détails -->
					<div class="story-details">
						<p class="story-caption">
							{#if story.caption}
								{story.caption.length > 90 ? story.caption.slice(0, 90) + '...' : story.caption}
							{:else}
								<em class="no-text">Story sans légende</em>
							{/if}
						</p>

						<div class="story-meta">
							<span class="meta-date">{formatDate(story.createdAt)}</span>
							<span class="meta-dot">•</span>
							<span class="meta-size">{formatBytes(story.totalSizeBytes)}</span>
							<span class="meta-dot">•</span>

							{#if !story.isExpired}
								<span class="status-chip active-chip">En cours</span>
							{:else if story.isArchived}
								<span class="status-chip archived-chip">Archivée</span>
							{:else}
								<span class="status-chip expired-chip">Expirée</span>
							{/if}

							<span class="visibility-chip">
								{#if story.visibility === 'public'}
									Public
								{:else if story.visibility === 'network'}
									<Icon name="status.users" size={12} /> Réseau
								{:else if story.visibility === 'followers'}
									<Icon name="status.users" size={12} /> Abonnés
								{:else if story.visibility === 'private'}
									<Icon name="status.lock" size={12} /> Privé
								{:else if story.visibility === 'group'}
									<Icon name="status.tag" size={12} /> {getGroupName(story.groupId)}
								{/if}
							</span>

							{#if !story.isExpired}
								<span class="retention-chip" title="Conservation après expiration">
									{story.isArchived ? 'Archive active' : 'Non archivée'}
								</span>
							{/if}
						</div>
					</div>

					<!-- Actions -->
					<div class="story-actions">
						<button
							type="button"
							class="btn-action btn-edit"
							onclick={() => onOpenEditStory(story)}
							title="Modifier la visibilité ou l'archivage"
						>
							Modifier
						</button>

						<button
							type="button"
							class="btn-action btn-view"
							onclick={() => onOpenStoryViewer(index)}
							title="Visualiser la story"
						>
							Voir
						</button>

						<button
							type="button"
							class="btn-action btn-delete"
							disabled={deletingStoryId === story.id}
							onclick={() => onDeleteStory(story.id)}
							title="Supprimer définitivement"
						>
							{#if deletingStoryId === story.id}
								...
							{:else}
								Supprimer
							{/if}
						</button>
					</div>
				</div>
			{/each}
		</div>

		{#if filteredStories.length > storiesLimit}
			<div class="pagination-footer">
				<button type="button" class="btn-show-more" onclick={() => (storiesLimit += 4)}>
					Afficher plus ({filteredStories.length - storiesLimit} restante{filteredStories.length -
						storiesLimit >
					1
						? 's'
						: ''})
				</button>
			</div>
		{:else if storiesLimit > 4 && filteredStories.length > 4}
			<div class="pagination-footer">
				<button type="button" class="btn-show-less" onclick={() => (storiesLimit = 4)}>
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

	.stories-tabs {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	.filter-chip {
		padding: 5px 12px;
		border-radius: 20px;
		border: 1px solid #d1d5db;
		background: white;
		color: #4b5563;
		font-size: 0.85rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.filter-chip:hover {
		background: #f3f4f6;
		color: #111827;
	}

	.filter-chip.active {
		background: #0ea5e9;
		color: white;
		border-color: #0ea5e9;
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

	.media-stories-list {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.media-story-item {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 10px 12px;
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		transition: background-color 0.15s ease;
	}

	.media-story-item:hover {
		background: #f3f4f6;
	}

	.story-preview {
		width: 48px;
		height: 64px;
		flex-shrink: 0;
		border-radius: 6px;
		overflow: hidden;
		background: #000;
		position: relative;
		cursor: pointer;
	}

	.story-thumb-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.story-type-badge {
		position: absolute;
		bottom: 3px;
		right: 3px;
		background: rgba(0, 0, 0, 0.7);
		color: #fff;
		font-size: 0.6rem;
		padding: 1px 4px;
		border-radius: 3px;
	}

	.story-details {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.story-caption {
		margin: 0;
		font-size: 0.9rem;
		color: #1f2937;
		word-break: break-word;
	}

	.no-text {
		color: #9ca3af;
	}

	.story-meta {
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

	.status-chip {
		font-size: 0.75rem;
		font-weight: 600;
		padding: 2px 8px;
		border-radius: 12px;
	}

	.status-chip.active-chip {
		background: #ecfdf5;
		color: #059669;
		border: 1px solid #a7f3d0;
	}

	.status-chip.archived-chip {
		background: #f1f5f9;
		color: #475569;
		border: 1px solid #cbd5e1;
	}

	.status-chip.expired-chip {
		background: #fffbeb;
		color: #b45309;
		border: 1px solid #fde68a;
	}

	.visibility-chip {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 0.75rem;
		font-weight: 500;
		padding: 2px 8px;
		border-radius: 12px;
		background: #f3f4f6;
		color: #374151;
		border: 1px solid #e5e7eb;
	}

	.retention-chip {
		font-size: 0.72rem;
		font-weight: 500;
		color: #6b7280;
	}

	.story-actions {
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

	.btn-view {
		background: #e0f2fe;
		color: #0369a1;
	}

	.btn-view:hover {
		background: #bae6fd;
		color: #0284c7;
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
		.media-story-item {
			flex-direction: column;
			align-items: flex-start;
		}

		.story-actions {
			width: 100%;
			justify-content: flex-end;
		}
	}
</style>
