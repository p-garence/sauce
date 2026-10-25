<!--
  @component VisibilitySelect
  @domain post
  @description Sélecteur de visibilité d'une publication ou story (public, abonnés, réseau, groupe, privé).
-->
<script lang="ts">
	import { page } from '$app/state';
	import type { PostVisibility, UserGroup } from '$lib/types';
	import Icon from '$lib/components/ui/Icon.svelte';

	let {
		postId = null as string | null,
		// On accepte le type exact ou 'public' par défaut
		initialVisibility = 'public' as PostVisibility,
		// Optionnel : l'ID du groupe si la visibilité est 'group'
		initialGroupId = null as string | null,
		// onToggle renvoie maintenant exactement ce qu'attend ton composant parent
		onToggle = null as ((visibility: PostVisibility, groupId?: string | null) => void) | null
	} = $props();

	// L'astuce : La valeur interne du select est un string composite (ex: "public", "network", ou "group:123")
	function getInternalValue(vis: PostVisibility, gId: string | null) {
		return vis === 'group' && gId ? `group:${gId}` : vis;
	}

	// 1. Vérité serveur
	let serverValue = $derived(getInternalValue(initialVisibility, initialGroupId));
	// 2. Override optimiste local
	let optimisticValue = $state<string | null>(null);
	// 3. Fusion
	let value = $derived(optimisticValue !== null ? optimisticValue : serverValue);
	let isLoading = $state(false);

	let groups = $derived((page.data.userGroups as UserGroup[]) || []);

	async function handleChange(e: Event) {
		const select = e.target as HTMLSelectElement;
		const newValue = select.value;

		if (newValue === '__create_group__') {
			window.location.href = '/parametres?tab=groups';
			return;
		}

		// Décorticage de la valeur du select
		let newVisibility: PostVisibility;
		let newGroupId: string | null = null;

		if (newValue.startsWith('group:')) {
			newVisibility = 'group';
			newGroupId = newValue.split(':')[1];
		} else {
			// TypeScript sait maintenant que newValue fait partie de PostVisibility
			// (sauf 'group', géré au-dessus)
			newVisibility = newValue as PostVisibility;
		}

		// Si utilisé en création (sans postId)
		if (!postId) {
			optimisticValue = newValue;
			if (onToggle) onToggle(newVisibility, newGroupId);
			return;
		}

		isLoading = true;
		try {
			const payload: { visibility: PostVisibility; groupId?: string } = {
				visibility: newVisibility,
				...(newGroupId ? { groupId: newGroupId } : {})
			};

			const res = await fetch(`/api/posts/${postId}/visibility`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			if (res.ok) {
				optimisticValue = newValue;
				if (onToggle) onToggle(newVisibility, newGroupId);
			} else {
				optimisticValue = null;
				alert('Erreur lors de la mise à jour de la visibilité');
			}
		} catch (err) {
			console.error(err);
			optimisticValue = null;
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="visibility-wrapper">
	<span class="visibility-icon" aria-hidden="true">
		<Icon name="status.visibility" size={15} />
	</span>
	<select bind:value onchange={handleChange} disabled={isLoading} class="visibility-select">
		<option value="public">Public</option>
		<option value="network">Réseau</option>
		<option value="followers">Abonné(e)s</option>
		<option value="private">Moi uniquement</option>

		{#if groups.length > 0}
			<option disabled>Mes Groupes</option>

			{#each groups as group (group.id)}
				<option value="group:{group.id}">
					{group.name}
				</option>
			{/each}
		{:else}
			<option disabled>Mes Groupes</option>
			<option value="__create_group__"> ➕ Créer un groupe... </option>
		{/if}
	</select>

	{#if isLoading}
		<span class="loader"><Icon name="status.time" size={14} /></span>
	{/if}
</div>

<style>
	.visibility-wrapper {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.visibility-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		color: #64748b;
		flex-shrink: 0;
	}
	.visibility-select {
		padding: 6px 10px;
		border-radius: 8px;
		border: 1px solid #e2e8f0;
		background-color: var(--bg-surface, #ffffff);
		font-size: 0.85rem;
		color: #475569;
		cursor: pointer;
		outline: none;
	}
	.visibility-select:focus {
		border-color: #0ea5e9;
	}
	.visibility-select:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	option {
		font-weight: normal;
		color: #1e293b;
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
</style>
