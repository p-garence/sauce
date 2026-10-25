<!--
  @component SettingsGroups
  @domain settings/groups
  @description Panneau de gestion des groupes d'utilisateurs (visibilité ciblée et filtres de flux).
  @responsibilities
    - Présenter la liste des groupes créés
    - Orchestrer le basculement en mode édition
    - Intégrer le formulaire de création
-->
<script lang="ts">
	import type { UserGroup } from '$lib/types';
	import GroupCreateCard from './groups/GroupCreateCard.svelte';
	import GroupItemCard from './groups/GroupItemCard.svelte';

	/**
	 * Propriétés du composant SettingsGroups
	 */
	interface Props {
		/** Liste des groupes de l'utilisateur */
		groups?: UserGroup[];
	}

	let { groups = [] }: Props = $props();

	let editingGroupId = $state<string | null>(null);
</script>

<div class="settings-section">
	<h2>Mes groupes de visibilité</h2>
	<p class="description">
		Créez des groupes pour partager vos publications avec des personnes spécifiques ou pour filtrer
		vos flux personnalisés.
	</p>

	<!-- FORMULAIRE DE CRÉATION -->
	<GroupCreateCard />

	<!-- LISTE DES GROUPES -->
	<div class="groups-list">
		<h3>Vos groupes existants ({groups.length})</h3>

		{#if groups.length === 0}
			<div class="empty-state">Vous n'avez pas encore de groupe.</div>
		{/if}

		{#each groups as group (group.id)}
			<GroupItemCard
				{group}
				isEditing={editingGroupId === group.id}
				onStartEdit={() => (editingGroupId = group.id)}
				onCancelEdit={() => (editingGroupId = null)}
			/>
		{/each}
	</div>
</div>

<style>
	.settings-section {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}
	h2 {
		margin: 0;
		font-size: 1.5rem;
		color: #1e293b;
	}
	h3 {
		margin: 0 0 16px 0;
		font-size: 1.1rem;
		color: #334155;
	}
	.description {
		color: #64748b;
		margin: -16px 0 0 0;
		font-size: 0.95rem;
		line-height: 1.5;
	}
	.groups-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.empty-state {
		padding: 20px;
		text-align: center;
		color: #64748b;
		background: #f8fafc;
		border-radius: 12px;
	}
</style>
