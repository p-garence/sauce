<!--
  @component UserSearch
  @domain profile
  @description Composant de recherche d'utilisateurs avec pagination et suivi rapide.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { searchMemory } from '$lib/client/searchMemory.svelte';
	import type { UserSearchResult } from '$lib/types';
	import SearchInput from '$lib/components/ui/SearchInput.svelte';

	let {
		onSelect,
		id = 'default',
		excludeUserIds = []
	}: {
		onSelect: (user: UserSearchResult) => void;
		id?: string;
		excludeUserIds?: string[];
	} = $props();

	// svelte-ignore state_referenced_locally
	let query = $state(searchMemory[id]?.query || '');
	// svelte-ignore state_referenced_locally
	let results = $state<UserSearchResult[]>((searchMemory[id]?.results as UserSearchResult[]) || []);
	// svelte-ignore state_referenced_locally
	let nextCursor = $state<string | null>(searchMemory[id]?.nextCursor || null);

	let isLoading = $state(false);
	let isLoadingMore = $state(false);

	let displayedResults = $derived(results.filter((u) => !excludeUserIds.includes(u.id)));

	let timeout: ReturnType<typeof setTimeout>;

	onMount(() => {
		if (results.length === 0) {
			fetchUsers(true);
		}
	});

	function saveState() {
		searchMemory[id] = { query, results, nextCursor };
	}

	async function fetchUsers(isNewSearch = true) {
		if (isNewSearch) {
			isLoading = true;
			nextCursor = null;
		} else {
			isLoadingMore = true;
		}

		try {
			let url = `/api/search-users?q=${encodeURIComponent(query)}`;
			if (excludeUserIds && excludeUserIds.length > 0) {
				url += `&exclude=${encodeURIComponent(excludeUserIds.join(','))}`;
			}
			if (!isNewSearch && nextCursor) {
				url += `&cursor=${encodeURIComponent(nextCursor)}`;
			}

			const res = await fetch(url);
			if (res.ok) {
				const data = await res.json();

				if (isNewSearch) {
					results = data.users;
				} else {
					results = [...results, ...data.users];
				}

				nextCursor = data.nextCursor;
				saveState(); // 👈 On met à jour l'état global
			}
		} catch (err) {
			console.error('Erreur de recherche', err);
		} finally {
			isLoading = false;
			isLoadingMore = false;
		}
	}

	function handleInput() {
		saveState();
		clearTimeout(timeout);
		timeout = setTimeout(() => fetchUsers(true), 300);
	}
</script>

<div class="user-search-component">
	<SearchInput
		bind:value={query}
		oninput={handleInput}
		onclear={handleInput}
		placeholder="Rechercher par pseudo ou nom..."
		{isLoading}
	/>

	<div class="search-results">
		{#if query.trim() !== '' && displayedResults.length === 0 && !isLoading}
			<div class="no-results">Aucun utilisateur trouvé pour "{query}".</div>
		{:else if query.trim() === '' && displayedResults.length === 0 && !isLoading}
			<div class="no-results">Aucune suggestion disponible.</div>
		{/if}

		{#each displayedResults as user, i (user.id)}
			<!-- 👇 MAGIE SVELTE : On déduit le groupe actuel et le précédent -->
			{@const currentGroup = user.is_following
				? 'abonnements'
				: user.is_follower
					? 'abonnes'
					: 'autres'}
			{@const prevGroup =
				i > 0
					? displayedResults[i - 1].is_following
						? 'abonnements'
						: displayedResults[i - 1].is_follower
							? 'abonnes'
							: 'autres'
					: null}

			<!-- Si on change de groupe, on affiche un titre -->
			{#if currentGroup !== prevGroup}
				{#if currentGroup === 'abonnements'}
					<div class="section-title {i > 0 ? 'separator' : ''}">Abonnements</div>
				{:else if currentGroup === 'abonnes'}
					<div class="section-title {i > 0 ? 'separator' : ''}">Abonnés</div>
				{:else if currentGroup === 'autres' && i > 0}
					<!-- "Autres personnes" ne s'affiche QUE s'il y a eu des abonnements/abonnés avant (i > 0) -->
					<div class="section-title separator">Autres personnes</div>
				{/if}
			{/if}

			<button class="user-row" onclick={() => onSelect(user)}>
				<div class="avatar-container">
					{#if user.image}
						<img src={user.image} alt={user.username} class="avatar" />
					{:else}
						<div class="avatar-placeholder">{(user.username || '?').charAt(0).toUpperCase()}</div>
					{/if}
				</div>

				<div class="user-details">
					<span class="user-name">{user.name || user.username}</span>
					<span class="user-handle">@{user.username}</span>
				</div>

				{#if user.is_following && user.is_follower}
					<span class="relation-badge mutual">Amis</span>
				{:else if user.is_following}
					<span class="relation-badge">Abonné(e)</span>
				{:else if user.is_follower}
					<span class="relation-badge">Vous suit</span>
				{/if}
			</button>
		{/each}

		<!-- Bouton Charger plus -->
		{#if nextCursor}
			<button class="load-more-btn" onclick={() => fetchUsers(false)} disabled={isLoadingMore}>
				{isLoadingMore ? 'Chargement...' : 'Voir plus'}
			</button>
		{/if}
	</div>
</div>

<style>
	.user-search-component {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.section-title {
		font-size: 0.85rem;
		font-weight: 700;
		color: #94a3b8;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin-bottom: 8px; /* On remet un margin positif */
		padding-left: 12px;
	}

	/* Le séparateur ajoute un peu d'espace au-dessus s'il sépare deux listes */
	.section-title.separator {
		margin-top: 16px;
	}

	.search-results {
		display: flex;
		flex-direction: column;
	}
	.no-results {
		padding: 20px;
		text-align: center;
		color: #64748b;
		font-size: 0.9rem;
	}

	.user-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px;
		border: none;
		background: none;
		width: 100%;
		text-align: left;
		cursor: pointer;
		border-radius: 12px;
		transition: background 0.2s;
	}
	.user-row:hover {
		background: #f1f5f9;
	}

	.avatar-container {
		flex-shrink: 0;
	}
	.avatar {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		object-fit: cover;
	}
	.avatar-placeholder {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		background: #e2e8f0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.1rem;
		font-weight: bold;
		color: #475569;
	}

	.user-details {
		display: flex;
		flex-direction: column;
		flex: 1;
		overflow: hidden;
	}
	.user-name {
		font-weight: 600;
		color: #1e293b;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.user-handle {
		font-size: 0.85rem;
		color: #64748b;
	}

	.relation-badge {
		font-size: 0.7rem;
		background: #e0f2fe;
		color: #0284c7;
		padding: 4px 8px;
		border-radius: 12px;
		font-weight: 600;
	}
	.relation-badge.mutual {
		background: #dcfce7;
		color: #166534;
	}

	.load-more-btn {
		width: 100%;
		background: none;
		border: none;
		padding: 16px;
		text-align: center;
		font-size: 0.9rem;
		font-weight: 600;
		color: #0ea5e9;
		cursor: pointer;
		transition: background 0.2s;
		border-radius: 12px;
	}
	.load-more-btn:hover:not(:disabled) {
		background: #f8fafc;
	}
	.load-more-btn:disabled {
		color: #94a3b8;
		cursor: not-allowed;
	}
</style>
