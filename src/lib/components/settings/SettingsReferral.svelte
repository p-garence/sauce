<script lang="ts">
	import { enhance } from '$app/forms';
	import SettingsCard from '$lib/components/settings/ui/SettingsCard.svelte';
	import SettingsButton from '$lib/components/settings/ui/SettingsButton.svelte';
	import type { InviteKey, FormResult } from '$lib/types';

	let {
		keys,
		form,
		maxInvites = 10
	}: {
		keys: InviteKey[];
		form?: FormResult;
		maxInvites?: number;
	} = $props();
	let loading = $state(false);
</script>

<SettingsCard
	title="Mes Clés de Parrainage"
	description="Vous pouvez générer jusqu'à {maxInvites} clés pour inviter vos proches à rejoindre l'instance."
>
	<div class="keys-stats">
		<span><strong>{keys.length}</strong> / {maxInvites} clés générées</span>
	</div>

	{#if form?.message && !form?.success}
		<div class="error-box">{form.message}</div>
	{/if}

	<!-- On conserve le formulaire natif SvelteKit, c'est ce qui est le plus robuste -->
	<form
		method="POST"
		action="?/generateKey"
		use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				await update();
				loading = false;
			};
		}}
	>
		<div class="button-wrapper">
			<SettingsButton type="submit" disabled={loading || keys.length >= maxInvites}>
				{loading ? 'Génération...' : '+ Générer une clé'}
			</SettingsButton>
		</div>
	</form>

	<ul class="keys-list">
		{#each keys as k (k.id)}
			<li class="key-item">
				<div class="key-code">{k.key}</div>
				{#if k.usedBy}
					<span class="status used">Utilisée</span>
				{:else}
					<span class="status active">En attente</span>
				{/if}
			</li>
		{/each}
		{#if keys.length === 0}
			<p class="empty">Aucune clé générée pour le moment.</p>
		{/if}
	</ul>
</SettingsCard>

<style>
	.keys-stats {
		margin-bottom: 16px;
		font-size: 0.9rem;
		color: #1a1a1a;
	}
	.error-box {
		background: #fee2e2;
		color: #dc2626;
		padding: 12px;
		border-radius: 6px;
		margin-bottom: 16px;
		font-size: 0.9rem;
	}
	.button-wrapper {
		margin-bottom: 24px;
	}

	.keys-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.key-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px;
		background: #f8f9fa;
		border-radius: 8px;
		border: 1px dashed #cbd5e1;
	}
	.key-code {
		font-family: monospace;
		font-size: 1.1rem;
		font-weight: bold;
		letter-spacing: 1px;
		color: #1a1a1a;
	}

	.status {
		font-size: 0.8rem;
		font-weight: bold;
		padding: 4px 8px;
		border-radius: 20px;
	}
	.status.active {
		background: #dcfce7;
		color: #166534;
	}
	.status.used {
		background: #f1f5f9;
		color: #475569;
	}

	.empty {
		color: #64748b;
		font-style: italic;
		text-align: center;
		margin-top: 16px;
		font-size: 0.9rem;
	}
</style>
