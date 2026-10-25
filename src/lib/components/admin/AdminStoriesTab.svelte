<script lang="ts">
	/**
	 * @component AdminStoriesTab
	 * @domain Admin / Stories
	 * @description Onglet de modération des stories éphémères
	 * @responsibilities
	 * - Afficher la liste paginée par curseur des stories de l'instance
	 * - Filtrer par légende ou nom d'auteur
	 * - Indiquer le statut de validité (active, expirée, archivée)
	 * - Supprimer définitivement une story et purger ses fichiers associés
	 * - Charger dynamiquement les stories suivantes
	 */
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { untrack } from 'svelte';
	import FormattedDate from '$lib/components/ui/FormattedDate.svelte';

	export interface AdminStoryAuthor {
		id?: string;
		username?: string | null;
		name?: string | null;
	}

	export interface AdminStoryItem {
		id: string;
		caption?: string | null;
		author?: AdminStoryAuthor | null;
		mediaType: 'image' | 'video' | string;
		mediaUrl: string;
		canView?: boolean;
		visibility: string;
		viewsCount?: number;
		likesCount?: number;
		expiresAt: string | Date;
		isArchived?: boolean;
		createdAt: string | Date;
	}

	interface Props {
		/** Liste initiale des stories */
		initialStories: AdminStoryItem[];
		/** Curseur initial de pagination */
		initialCursor: string | null;
		/** Nombre total de stories sur l'instance */
		totalStories: number;
	}

	let { initialStories = [], initialCursor = null, totalStories = 0 }: Props = $props();

	let storySearch = $state('');
	let statusFilter = $state<'all' | 'active' | 'archived' | 'expired'>('all');
	let storiesList = $state(untrack(() => [...initialStories]));
	let storiesCursor = $state(untrack(() => initialCursor));
	let isLoadingMoreStories = $state(false);

	$effect(() => {
		storiesList = [...initialStories];
		storiesCursor = initialCursor;
	});

	async function loadMoreStories() {
		if (!storiesCursor || isLoadingMoreStories) return;
		isLoadingMoreStories = true;
		try {
			const res = await fetch(
				`/api/admin/stories?cursor=${encodeURIComponent(storiesCursor)}&limit=25`
			);
			if (res.ok) {
				const json = await res.json();
				storiesList = [...storiesList, ...json.stories];
				storiesCursor = json.nextCursor;
			}
		} catch (e) {
			console.error('Erreur chargement stories admin:', e);
		} finally {
			isLoadingMoreStories = false;
		}
	}

	const filteredStories = $derived(
		storiesList.filter((s) => {
			const query = storySearch.toLowerCase().trim();
			const matchesQuery =
				!query ||
				(s.caption && s.caption.toLowerCase().includes(query)) ||
				(s.author?.username && s.author.username.toLowerCase().includes(query)) ||
				(s.author?.name && s.author.name.toLowerCase().includes(query));

			if (!matchesQuery) return false;

			if (statusFilter === 'all') return true;
			const isExpired = new Date(s.expiresAt) <= new Date();
			if (statusFilter === 'active') return !isExpired;
			if (statusFilter === 'archived') return isExpired && s.isArchived;
			if (statusFilter === 'expired') return isExpired && !s.isArchived;
			return true;
		})
	);
</script>

<section class="tab-section">
	<div class="section-toolbar">
		<input
			type="search"
			placeholder="Filtrer les stories par texte ou auteur..."
			bind:value={storySearch}
			class="search-input"
		/>
		<div class="filter-group">
			<button
				type="button"
				class="filter-btn"
				class:active={statusFilter === 'all'}
				onclick={() => (statusFilter = 'all')}
			>
				Toutes
			</button>
			<button
				type="button"
				class="filter-btn"
				class:active={statusFilter === 'active'}
				onclick={() => (statusFilter = 'active')}
			>
				Actives
			</button>
			<button
				type="button"
				class="filter-btn"
				class:active={statusFilter === 'archived'}
				onclick={() => (statusFilter = 'archived')}
			>
				Archivées
			</button>
			<button
				type="button"
				class="filter-btn"
				class:active={statusFilter === 'expired'}
				onclick={() => (statusFilter = 'expired')}
			>
				Expirées
			</button>
		</div>
		<span class="results-count">
			{filteredStories.length} affichée(s) sur {totalStories}
		</span>
	</div>

	<div class="table-container">
		<table class="admin-table">
			<thead>
				<tr>
					<th>Auteur</th>
					<th>Aperçu</th>
					<th>Visibilité</th>
					<th>Statut</th>
					<th>Vues / Likes</th>
					<th>Date</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each filteredStories as story (story.id)}
					{@const isExpired = new Date(story.expiresAt) <= new Date()}
					<tr>
						<td>
							<strong>@{story.author?.username || 'anonyme'}</strong>
							<br />
							<span class="sub-text">{story.author?.name || ''}</span>
						</td>
						<td class="post-content-cell">
							{#if story.canView !== false}
								<div class="story-preview-cell">
									{#if story.mediaType === 'image'}
										<img src={story.mediaUrl} alt="Thumbnail story" class="story-thumb" />
									{:else}
										<span class="badge badge-media">Vidéo</span>
									{/if}
									<p class="post-snippet">
										{story.caption || '(Sans légende)'}
									</p>
								</div>
							{:else if isExpired && story.isArchived}
								<div class="archived-content-notice">
									<span class="badge badge-archived">Archive utilisateur</span>
									<span class="sub-text italic"
										>Story archivée (non consultable par l'administrateur)</span
									>
								</div>
							{:else if isExpired}
								<div class="expired-content-notice">
									<span class="badge badge-expired">Story expirée</span>
									<span class="sub-text italic">Non consultable</span>
								</div>
							{:else}
								<div class="private-content-warning">
									<span class="badge badge-private">
										{story.visibility === 'followers'
											? 'Réservée aux abonnés'
											: story.visibility === 'group'
												? 'Réservée au groupe'
												: 'Story privée'}
									</span>
									<span class="sub-text italic">Non partagée avec l'administrateur</span>
								</div>
							{/if}
						</td>
						<td>
							<span class="badge badge-vis">{story.visibility}</span>
						</td>
						<td>
							{#if !isExpired}
								<span class="badge badge-active">Active</span>
							{:else if story.isArchived}
								<span class="badge badge-archived">Archivée</span>
							{:else}
								<span class="badge badge-expired">⏰ Expirée</span>
							{/if}
						</td>
						<td>
							<span class="sub-text"
								>{story.viewsCount ?? 0} vues • {story.likesCount ?? 0} j'aime</span
							>
						</td>
						<td>
							<FormattedDate date={story.createdAt} class="sub-text" />
						</td>
						<td class="actions-cell">
							{#if story.canView !== false}
								<a
									href={resolve(`/story/${story.id}`)}
									class="btn btn-gray"
									target="_blank"
									rel="noopener noreferrer">Voir ↗</a
								>
							{:else}
								<span class="badge badge-disabled" title="Non accessible">Masqué</span>
							{/if}

							<form
								method="POST"
								action="?/deleteStory"
								use:enhance
								onsubmit={(e) => {
									if (!confirm('Supprimer définitivement cette story ?')) e.preventDefault();
								}}
							>
								<input type="hidden" name="storyId" value={story.id} />
								<button class="btn btn-red">Supprimer</button>
							</form>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<div class="pagination-footer">
		{#if storiesCursor}
			<button class="btn btn-load-more" onclick={loadMoreStories} disabled={isLoadingMoreStories}>
				{isLoadingMoreStories
					? 'Chargement en cours...'
					: `Afficher plus de stories (${storiesList.length} sur ${totalStories})`}
			</button>
		{:else}
			<p class="all-loaded">Toutes les stories sont chargées ({storiesList.length} au total)</p>
		{/if}
	</div>
</section>

<style>
	.section-toolbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 16px;
		gap: 16px;
		flex-wrap: wrap;
	}

	.search-input {
		flex: 1;
		max-width: 400px;
		padding: 8px 14px;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		font-size: 0.9rem;
	}

	.filter-group {
		display: inline-flex;
		background: #f3f4f6;
		border-radius: 8px;
		padding: 2px;
		gap: 2px;
	}

	.filter-btn {
		background: none;
		border: none;
		padding: 6px 12px;
		font-size: 0.82rem;
		font-weight: 500;
		color: #4b5563;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.filter-btn:hover {
		color: #111827;
	}

	.filter-btn.active {
		background: #ffffff;
		color: #111827;
		font-weight: 600;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
	}

	.results-count {
		font-size: 0.85rem;
		color: #6b7280;
	}

	.table-container {
		overflow-x: auto;
	}

	.admin-table {
		width: 100%;
		border-collapse: collapse;
		text-align: left;
	}

	.admin-table th {
		background: #f8f9fa;
		padding: 12px;
		font-size: 0.85rem;
		color: #4b5563;
		border-bottom: 2px solid #eaeaea;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.admin-table td {
		padding: 14px 12px;
		border-bottom: 1px solid #eaeaea;
		vertical-align: middle;
		font-size: 0.9rem;
	}

	.sub-text {
		font-size: 0.8rem;
		color: #6b7280;
	}

	.italic {
		font-style: italic;
	}

	.post-content-cell {
		max-width: 320px;
	}

	.post-snippet {
		margin: 0;
		color: #1f2937;
		word-break: break-word;
		font-size: 0.88rem;
	}

	.story-preview-cell {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.story-thumb {
		width: 38px;
		height: 48px;
		border-radius: 6px;
		object-fit: cover;
		border: 1px solid #e2e8f0;
		flex-shrink: 0;
	}

	.badge {
		font-size: 0.72rem;
		padding: 3px 8px;
		border-radius: 12px;
		font-weight: 600;
	}

	.badge-media {
		background: #f3f4f6;
		color: #374151;
	}

	.badge-vis {
		background: #e0e7ff;
		color: #3730a3;
	}

	.badge-active {
		background: #dcfce7;
		color: #166534;
	}

	.badge-archived {
		background: #f3f4f6;
		color: #4b5563;
	}

	.badge-expired {
		background: #fffbeb;
		color: #b45309;
	}

	.badge-private {
		background: #fef2f2;
		color: #b91c1c;
		border: 1px solid #fecaca;
	}

	.badge-disabled {
		background: #e5e7eb;
		color: #6b7280;
		font-size: 0.8rem;
		padding: 4px 8px;
		border-radius: 6px;
		display: inline-block;
	}

	.private-content-warning,
	.archived-content-notice,
	.expired-content-notice {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.actions-cell {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
	}

	.btn {
		padding: 6px 10px;
		border: none;
		border-radius: 6px;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		color: white;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		transition: opacity 0.15s ease;
	}

	.btn:hover {
		opacity: 0.9;
	}

	.btn-gray {
		background: #6b7280;
	}

	.btn-red {
		background: #dc2626;
	}

	.pagination-footer {
		display: flex;
		justify-content: center;
		padding: 24px 0 12px;
	}

	.btn-load-more {
		background: #ffffff;
		color: #1e293b;
		border: 1px solid #cbd5e1;
		padding: 10px 24px;
		border-radius: 24px;
		font-weight: 600;
		font-size: 0.9rem;
		cursor: pointer;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
		transition: all 0.15s ease;
	}

	.btn-load-more:hover:not(:disabled) {
		background: #f8fafc;
		border-color: #94a3b8;
	}

	.btn-load-more:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.all-loaded {
		color: #94a3b8;
		font-size: 0.85rem;
		margin: 0;
	}
</style>
