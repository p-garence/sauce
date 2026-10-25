<script lang="ts">
	/**
	 * @component UserGroupAssignPopover
	 * @domain Profile / Groups
	 * @description Popover permettant d'assigner ou retirer un utilisateur cible de ses groupes personnalisés
	 * @responsibilities
	 * - Charger la liste des groupes auxquels appartient l'utilisateur cible via `/api/groups/members?targetId=...`
	 * - Permettre de cocher/décocher l'appartenance à un groupe avec appel API instantané
	 * - Proposer un lien vers les paramètres pour créer un groupe si aucun n'existe
	 */
	import { page } from '$app/state';
	import { fade } from 'svelte/transition';
	import { resolve } from '$app/paths';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconId } from '$lib/types';

	interface Props {
		/** Identifiant de l'utilisateur cible */
		targetId: string;
		/** Callback pour fermer le popover */
		onClose?: () => void;
	}

	let { targetId, onClose }: Props = $props();

	let isLoadingGroups = $state(false);
	let userGroupsMap = $state<Record<string, boolean>>({});

	$effect(() => {
		if (targetId) {
			loadUserGroups();
		}
	});

	async function loadUserGroups() {
		isLoadingGroups = true;
		try {
			const res = await fetch(`/api/groups/members?targetId=${targetId}`);
			if (res.ok) {
				const groupIds: string[] = await res.json();
				const map: Record<string, boolean> = {};
				groupIds.forEach((id: string) => (map[id] = true));
				userGroupsMap = map;
			}
		} catch (e) {
			console.error('Erreur chargement des groupes', e);
		} finally {
			isLoadingGroups = false;
		}
	}

	async function toggleGroup(groupId: string, event: Event) {
		const checkbox = event.target as HTMLInputElement;
		const isAdding = checkbox.checked;

		try {
			const res = await fetch('/api/groups/members', {
				method: isAdding ? 'POST' : 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ targetId, groupId })
			});
			if (!res.ok) throw new Error('Erreur API');

			userGroupsMap[groupId] = isAdding;
		} catch (e) {
			console.error('Erreur toggle groupe', e);
			checkbox.checked = !isAdding;
		}
	}
</script>

<div class="dropdown-menu" transition:fade={{ duration: 150 }}>
	{#if page.data?.userGroups && page.data.userGroups.length > 0}
		<div class="groups-section">
			<span class="section-title">Ajouter aux groupes :</span>

			{#if isLoadingGroups}
				<div class="loader-wrapper">
					<span class="loader"><Icon name="status.time" size={14} /></span>
				</div>
			{:else}
				<div class="groups-list">
					{#each page.data.userGroups as group (group.id)}
						<label class="group-label">
							<input
								type="checkbox"
								checked={userGroupsMap[group.id] || false}
								onchange={(e: Event) => toggleGroup(group.id, e)}
							/>
							{#if group.icon && group.icon !== 'star'}
								<span class="group-icon"><Icon name={group.icon as IconId} size={15} /></span>
							{/if}
							<span class="group-name">{group.name}</span>
						</label>
					{/each}
				</div>
			{/if}
		</div>
	{:else}
		<div class="groups-empty-state">
			<p class="empty-text">Vous n'avez pas de groupes d'utilisateurs</p>
			<a
				href={resolve('/parametres?tab=groups')}
				class="btn-create-group"
				onclick={() => onClose?.()}
			>
				<Icon name="action.add" size={14} />
				<span>Créer un groupe</span>
			</a>
		</div>
	{/if}
</div>

<style>
	.dropdown-menu {
		position: absolute;
		top: calc(100% + 8px);
		right: 0;
		width: 240px;
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
		z-index: 100;
		padding: 8px;
		display: flex;
		flex-direction: column;
	}

	.groups-section {
		padding: 8px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.section-title {
		font-size: 0.8rem;
		font-weight: bold;
		color: #64748b;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin-bottom: 4px;
	}
	.groups-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
		max-height: 200px;
		overflow-y: auto;
	}
	.group-label {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 0.95rem;
		color: #1e293b;
		cursor: pointer;
	}
	.group-label input[type='checkbox'] {
		width: 16px;
		height: 16px;
		accent-color: #0ea5e9;
		cursor: pointer;
	}
	.group-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		color: #64748b;
	}
	.group-name {
		flex: 1;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.loader-wrapper {
		text-align: center;
		padding: 12px 0;
	}
	.loader {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		animation: spin 1s linear infinite;
	}
	@keyframes spin {
		100% {
			transform: rotate(360deg);
		}
	}

	.groups-empty-state {
		padding: 12px 8px;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 10px;
	}
	.empty-text {
		margin: 0;
		font-size: 0.85rem;
		color: #64748b;
		line-height: 1.3;
	}
	.btn-create-group {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		background: #0ea5e9;
		color: white;
		padding: 7px 12px;
		border-radius: 6px;
		font-size: 0.85rem;
		font-weight: 600;
		text-decoration: none;
		transition: background-color 0.2s;
		width: 100%;
		box-sizing: border-box;
	}
	.btn-create-group:hover {
		background: #0284c7;
	}
</style>
