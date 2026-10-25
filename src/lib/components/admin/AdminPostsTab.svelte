<script lang="ts">
	/**
	 * @component AdminPostsTab
	 * @domain Admin / Posts
	 * @description Onglet de modération des publications
	 * @responsibilities
	 * - Afficher la liste paginée par curseur des publications
	 * - Filtrer par contenu textuel ou nom d'auteur
	 * - Gérer les posts système vs utilisateurs
	 * - Supprimer définitivement une publication
	 * - Charger dynamiquement les publications suivantes
	 */
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { untrack } from 'svelte';
	import FormattedDate from '$lib/components/ui/FormattedDate.svelte';

	export interface AdminPostAuthor {
		id?: string;
		username?: string | null;
		name?: string | null;
	}

	export interface AdminPostItem {
		id: string;
		content: string | null;
		author?: AdminPostAuthor | null;
		isSystem?: boolean;
		mediaUrls?: unknown;
		canView?: boolean;
		visibility: string;
		likesCount?: number;
		commentsCount?: number;
		createdAt: string | Date;
	}

	interface Props {
		/** Liste initiale des publications */
		initialPosts: AdminPostItem[];
		/** Curseur initial de pagination */
		initialCursor: string | null;
		/** Nombre total de publications sur l'instance */
		totalPosts: number;
	}

	let { initialPosts = [], initialCursor = null, totalPosts = 0 }: Props = $props();

	let postSearch = $state('');
	let postsList = $state(untrack(() => [...initialPosts]));
	let postsCursor = $state(untrack(() => initialCursor));
	let isLoadingMorePosts = $state(false);

	$effect(() => {
		postsList = [...initialPosts];
		postsCursor = initialCursor;
	});

	async function loadMorePosts() {
		if (!postsCursor || isLoadingMorePosts) return;
		isLoadingMorePosts = true;
		try {
			const res = await fetch(
				`/api/admin/posts?cursor=${encodeURIComponent(postsCursor)}&limit=25`
			);
			if (res.ok) {
				const json = await res.json();
				postsList = [...postsList, ...json.posts];
				postsCursor = json.nextCursor;
			}
		} catch (e) {
			console.error('Erreur chargement posts admin:', e);
		} finally {
			isLoadingMorePosts = false;
		}
	}

	const filteredPosts = $derived(
		postsList.filter((p) => {
			const query = postSearch.toLowerCase().trim();
			if (!query) return true;
			return (
				(p.content && p.content.toLowerCase().includes(query)) ||
				(p.author?.username && p.author.username.toLowerCase().includes(query)) ||
				(p.author?.name && p.author.name.toLowerCase().includes(query))
			);
		})
	);
</script>

<section class="tab-section">
	<div class="section-toolbar">
		<input
			type="search"
			placeholder="Filtrer les publications par texte ou auteur..."
			bind:value={postSearch}
			class="search-input"
		/>
		<span class="results-count">
			{filteredPosts.length} affichée(s) sur {totalPosts}
		</span>
	</div>

	<div class="table-container">
		<table class="admin-table">
			<thead>
				<tr>
					<th>Auteur</th>
					<th>Contenu</th>
					<th>Visibilité</th>
					<th>Interactions</th>
					<th>Date</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each filteredPosts as post (post.id)}
					<tr>
						<td>
							{#if post.isSystem}
								<span class="badge badge-system"> 🖥️ Le serveur </span>
								<br />
								<span class="sub-text">Post Système</span>
							{:else}
								<strong>@{post.author?.username || 'anonyme'}</strong>
								<br />
								<span class="sub-text">{post.author?.name || ''}</span>
							{/if}
						</td>
						<td class="post-content-cell">
							{#if post.canView !== false}
								<p class="post-snippet">
									{post.content
										? post.content.length > 80
											? post.content.slice(0, 80) + '...'
											: post.content
										: '(Pas de texte)'}
								</p>
								{#if Array.isArray(post.mediaUrls) && post.mediaUrls.length > 0}
									<span class="badge badge-media">
										{post.mediaUrls.length} média(s)
									</span>
								{/if}
							{:else}
								<div class="private-content-warning">
									<span class="badge badge-private">Contenu privé</span>
									<span class="sub-text italic">Non partagé avec l'administrateur</span>
								</div>
							{/if}
						</td>
						<td>
							<span class="badge badge-vis">{post.visibility}</span>
						</td>
						<td>
							<span class="sub-text"
								>{post.likesCount ?? 0} j'aime • {post.commentsCount ?? 0} coms</span
							>
						</td>
						<td>
							<FormattedDate date={post.createdAt} class="sub-text" />
						</td>
						<td class="actions-cell">
							{#if post.canView !== false}
								<a
									href={resolve(`/post/${post.id}`)}
									class="btn btn-gray"
									target="_blank"
									rel="noopener noreferrer">Voir ↗</a
								>
							{:else}
								<span class="badge badge-disabled" title="Non accessible">Masqué</span>
							{/if}

							<form
								method="POST"
								action="?/deletePost"
								use:enhance
								onsubmit={(e) => {
									if (!confirm('Supprimer définitivement cette publication ?')) e.preventDefault();
								}}
							>
								<input type="hidden" name="postId" value={post.id} />
								<button class="btn btn-red">Supprimer</button>
							</form>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<div class="pagination-footer">
		{#if postsCursor}
			<button
				class="btn btn-load-more"
				onclick={loadMorePosts}
				disabled={isLoadingMorePosts}
			>
				{isLoadingMorePosts
					? 'Chargement en cours...'
					: `Afficher plus de publications (${postsList.length} sur ${totalPosts})`}
			</button>
		{:else}
			<p class="all-loaded">Toutes les publications sont chargées ({postsList.length} au total)</p>
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
		margin: 0 0 4px 0;
		color: #1f2937;
		word-break: break-word;
	}

	.badge {
		font-size: 0.72rem;
		padding: 3px 8px;
		border-radius: 12px;
		font-weight: 600;
	}

	.badge-system {
		background: #fef3c7;
		color: #92400e;
		border: 1px solid #fde68a;
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}

	.badge-media {
		background: #f3f4f6;
		color: #374151;
	}

	.badge-vis {
		background: #e0e7ff;
		color: #3730a3;
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

	.private-content-warning {
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
