<script lang="ts">
	import type { UserSearchResult } from '$lib/types';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import UserSearch from '$lib/components/profile/UserSearch.svelte';
	import PageHeader from '$lib/components/navigation/PageHeader.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	let mode = $state<'direct' | 'group'>('direct');

	// État pour la création de groupe
	let groupName = $state('');
	let selectedUsers = $state<UserSearchResult[]>([]);
	let isSubmitting = $state(false);

	async function handleUserSelect(user: UserSearchResult) {
		if (mode === 'direct') {
			try {
				// On interroge l'API silencieusement. Fetch suit la redirection tout seul.
				const res = await fetch(resolve(`/api/chat/direct/${user.username}`));
				if (res.url) {
					// On extrait l'URL finale (ex: /chat/12345) et on y va proprement !
					const finalUrl = new URL(res.url).pathname;
					// @ts-expect-error no way to implement this with good types
					goto(resolve(finalUrl));
				}
			} catch (e) {
				console.error('Erreur lors de la création du chat', e);
			}
			goto(resolve(`/api/chat/direct/${user.username}`));
		} else {
			if (!selectedUsers.find((u) => u.id === user.id)) {
				selectedUsers.push(user);
			}
		}
	}

	function removeUser(userId: string) {
		selectedUsers = selectedUsers.filter((u) => u.id !== userId);
	}

	async function createGroup() {
		if (!groupName.trim() || selectedUsers.length === 0) return;
		isSubmitting = true;

		try {
			const res = await fetch('/api/chat/group/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: groupName.trim(),
					usernames: selectedUsers.map((u) => u.username)
				})
			});

			if (res.ok) {
				const { chatId } = await res.json();
				goto(resolve(`/chat/${chatId}`));
			}
		} catch (e) {
			console.error(e);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="new-chat-page">
	<!-- 👇 Utilisation du composant PageHeader -->
	<PageHeader title="Nouvelle discussion" back_location="/chat" />

	<div class="mode-tabs">
		<button class:active={mode === 'direct'} onclick={() => (mode = 'direct')}>Message privé</button
		>
		<button class:active={mode === 'group'} onclick={() => (mode = 'group')}>Nouveau Groupe</button>
	</div>

	{#if mode === 'group'}
		<div class="group-setup">
			<input
				type="text"
				bind:value={groupName}
				placeholder="Nom du groupe..."
				class="group-name-input"
			/>

			{#if selectedUsers.length > 0}
				<div class="selected-users">
					{#each selectedUsers as user (user.id)}
						<div class="user-chip">
							<img src={user.image || `https://ui-avatars.com/api/?name=${user.username}`} alt="" />
							<span>{user.name || user.username}</span>
							<button onclick={() => removeUser(user.id)} aria-label="Retirer">
								<Icon name="action.close" size={12} />
							</button>
						</div>
					{/each}
				</div>
			{/if}

			<button
				class="create-group-btn"
				disabled={!groupName.trim() || selectedUsers.length === 0 || isSubmitting}
				onclick={createGroup}
			>
				{isSubmitting ? 'Création...' : 'Créer le groupe'}
			</button>
		</div>
	{/if}

	<div class="search-container">
		<UserSearch
			id="creer_discussion"
			onSelect={handleUserSelect}
			excludeUserIds={selectedUsers.map((u) => u.id)}
		/>
	</div>
</div>

<style>
	.new-chat-page {
		width: 100%;
		background: var(--bg-surface, #ffffff);
		flex: 1;
	}

	/* 👇 Le CSS du .page-header, .back-btn et du h2 a été totalement supprimé ! */

	.mode-tabs {
		display: flex;
		border-bottom: 1px solid var(--border-color, #eaeaea);
	}
	.mode-tabs button {
		flex: 1;
		padding: 12px;
		background: none;
		border: none;
		font-weight: 600;
		color: var(--text-muted, #64748b);
		cursor: pointer;
		border-bottom: 2px solid transparent;
		transition: all 0.2s;
	}
	.mode-tabs button.active {
		color: var(--primary, #0ea5e9);
		border-bottom-color: var(--primary, #0ea5e9);
	}

	.group-setup {
		padding: 16px;
		background: var(--bg-default, #f8fafc);
		border-bottom: 1px solid var(--border-color, #eaeaea);
	}
	.group-name-input {
		width: 100%;
		padding: 12px 16px;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		font-size: 1rem;
		margin-bottom: 12px;
		outline: none;
	}
	.group-name-input:focus {
		border-color: var(--primary, #0ea5e9);
	}

	.selected-users {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-bottom: 12px;
	}
	.user-chip {
		display: flex;
		align-items: center;
		gap: 6px;
		background: #e0f2fe;
		color: #0369a1;
		padding: 4px 8px 4px 4px;
		border-radius: 20px;
		font-size: 0.85rem;
		font-weight: 600;
	}
	.user-chip img {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		object-fit: cover;
	}
	.user-chip button {
		background: none;
		border: none;
		color: #0369a1;
		font-weight: bold;
		cursor: pointer;
		padding: 0 4px;
	}

	.create-group-btn {
		width: 100%;
		padding: 12px;
		background: var(--primary, #0ea5e9);
		color: white;
		border: none;
		border-radius: 8px;
		font-weight: bold;
		font-size: 1rem;
		cursor: pointer;
	}
	.create-group-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.search-container {
		padding: 16px;
	}
</style>
