<!--
  @component SettingsReferral
  @domain settings/referral
  @description Panneau de gestion des clés de parrainage / invitation de l'utilisateur.
  @responsibilities
    - Afficher le quota et l'état des clés d'invitation (actives ou déjà utilisées)
    - Permettre la copie rapide au clic de n'importe quelle clé dans le presse-papier avec feedback visuel
    - Générer de nouvelles clés via l'action serveur SvelteKit ?/generateKey
-->
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
	let copiedKeyId = $state<string | null>(null);

	async function copyKey(keyText: string, keyId: string) {
		try {
			await navigator.clipboard.writeText(keyText);
			copiedKeyId = keyId;
			setTimeout(() => {
				if (copiedKeyId === keyId) {
					copiedKeyId = null;
				}
			}, 2000);
		} catch (err) {
			console.error('Erreur lors de la copie de la clé:', err);
		}
	}
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
				<button
					type="button"
					class="key-code-btn"
					onclick={() => copyKey(k.key, k.id)}
					title="Cliquer pour copier la clé"
					aria-label="Copier la clé de parrainage {k.key}"
				>
					<span class="key-code">{k.key}</span>
					<span class="copy-badge" class:copied={copiedKeyId === k.id}>
						{#if copiedKeyId === k.id}
							<svg
								viewBox="0 0 24 24"
								width="14"
								height="14"
								fill="none"
								stroke="currentColor"
								stroke-width="2.5"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<polyline points="20 6 9 17 4 12"></polyline>
							</svg>
							<span>Copié !</span>
						{:else}
							<svg
								viewBox="0 0 24 24"
								width="14"
								height="14"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
								<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
							</svg>
							<span>Copier</span>
						{/if}
					</span>
				</button>

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
		padding: 10px 12px;
		background: #f8f9fa;
		border-radius: 8px;
		border: 1px dashed #cbd5e1;
		transition:
			background-color 0.15s ease,
			border-color 0.15s ease;
	}
	.key-item:hover {
		background: #f1f5f9;
		border-color: #94a3b8;
	}

	.key-code-btn {
		display: flex;
		align-items: center;
		gap: 12px;
		background: none;
		border: none;
		padding: 4px 6px;
		margin: -4px -6px;
		border-radius: 6px;
		cursor: pointer;
		color: inherit;
		text-align: left;
		transition: background-color 0.15s ease;
	}
	.key-code-btn:hover .key-code {
		color: #0284c7;
	}
	.key-code-btn:focus-visible {
		outline: 2px solid #0284c7;
		outline-offset: 2px;
	}

	.key-code {
		font-family: monospace;
		font-size: 1.1rem;
		font-weight: bold;
		letter-spacing: 1px;
		color: #0f172a;
		transition: color 0.15s ease;
	}

	.copy-badge {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-size: 0.75rem;
		font-weight: 600;
		padding: 3px 8px;
		border-radius: 6px;
		background: #e2e8f0;
		color: #475569;
		transition: all 0.2s ease;
	}
	.key-code-btn:hover .copy-badge:not(.copied) {
		background: #cbd5e1;
		color: #1e293b;
	}
	.copy-badge.copied {
		background: #dcfce7;
		color: #15803d;
	}

	.status {
		font-size: 0.8rem;
		font-weight: bold;
		padding: 4px 8px;
		border-radius: 20px;
		flex-shrink: 0;
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
