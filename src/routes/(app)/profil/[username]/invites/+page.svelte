<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHeader from '$lib/components/navigation/PageHeader.svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import Icon from '$lib/components/ui/Icon.svelte';
	let { data } = $props();

	// 1. Vérité serveur (réactive si data change)
	let serverRequests = $derived(data.pendingRequests);

	// 2. IDs masqués localement (optimiste)
	let removedIds = new SvelteSet<string>();

	// 3. Fusion des deux
	let requests = $derived(serverRequests.filter((r: { id: string }) => !removedIds.has(r.id)));

	async function handleAction(followerId: string, action: 'accept' | 'refuse') {
		removedIds.add(followerId);

		try {
			const res = await fetch('/api/follow/manage', {
				method: 'POST',
				body: JSON.stringify({ followerId, action })
			});

			if (!res.ok) {
				removedIds.delete(followerId);
			}
		} catch {
			removedIds.delete(followerId);
		}
	}
</script>

<div class="page-container">
	<PageHeader
		title="En attente"
		username="{requests.length} demande(s)"
		back_location="/profil/{data.profile.username}"
	/>

	<div class="list-container">
		{#if requests.length === 0}
			<div class="empty-state">
				<span class="icon"><Icon name="status.users" size={32} /></span>
				<p>Vous n'avez aucune demande en attente.</p>
			</div>
		{/if}

		{#each requests as req (req.id)}
			<div class="request-row">
				<a href={resolve(`/profil/${req.username}`)} class="user-info">
					<div class="avatar-container">
						{#if req.image}
							<img src={req.image} alt={req.username} class="avatar" />
						{:else}
							<div class="avatar-placeholder">{(req.username || '?').charAt(0).toUpperCase()}</div>
						{/if}
					</div>
					<div class="names">
						<strong>{req.name || req.username}</strong>
						<span>@{req.username}</span>
					</div>
				</a>
				<div class="actions">
					<button class="btn accept" onclick={() => handleAction(req.id, 'accept')}
						>Confirmer</button
					>
					<button class="btn refuse" onclick={() => handleAction(req.id, 'refuse')}
						>Supprimer</button
					>
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	.page-container {
		width: 100%;
		max-width: var(--max-content-width, 600px);
		margin: 0 auto;
		background: #fff;
		flex: 1;
	}
	.list-container {
		padding: 16px;
	}
	.empty-state {
		text-align: center;
		color: #64748b;
		padding: 64px 16px;
	}
	.empty-state .icon {
		font-size: 2.5rem;
		display: block;
		margin-bottom: 12px;
	}

	.request-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 0;
		border-bottom: 1px solid #f1f5f9;
	}
	.user-info {
		display: flex;
		align-items: center;
		gap: 12px;
		text-decoration: none;
		color: inherit;
		flex: 1;
		min-width: 0;
	}
	.avatar-container {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		overflow: hidden;
		background: #f1f5f9;
		flex-shrink: 0;
	}
	.avatar {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.avatar-placeholder {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: bold;
		color: #64748b;
	}

	.names {
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	.names strong {
		font-size: 0.95rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.names span {
		font-size: 0.85rem;
		color: #64748b;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.actions {
		display: flex;
		gap: 8px;
		flex-shrink: 0;
		margin-left: 12px;
	}
	.btn {
		padding: 6px 12px;
		border-radius: 6px;
		font-weight: bold;
		cursor: pointer;
		border: none;
		font-size: 0.85rem;
	}
	.btn.accept {
		background: #0ea5e9;
		color: white;
	}
	.btn.refuse {
		background: #f1f5f9;
		color: #1e293b;
	}
</style>
