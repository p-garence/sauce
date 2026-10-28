<!--
  @component AdminSettingsPage
  @domain admin
  @description Page d'administration centrale pour la configuration en direct de tous les paramètres du serveur et de l'instance.
  @responsibilities
    - Fournir une navigation par onglets sobres pour les 4 domaines de configuration.
    - Afficher les messages de confirmation d'action.
    - Déléguer l'édition à chaque sous-composant spécialisé.
-->
<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import AdminPrivacySettings from '$lib/components/admin/settings/AdminPrivacySettings.svelte';
	import AdminPerformanceSettings from '$lib/components/admin/settings/AdminPerformanceSettings.svelte';
	import AdminMediaSettings from '$lib/components/admin/settings/AdminMediaSettings.svelte';
	import AdminDefaultsSettings from '$lib/components/admin/settings/AdminDefaultsSettings.svelte';

	interface Props {
		data: PageData;
		form: ActionData;
	}

	let { data, form }: Props = $props();

	type SettingsTab = 'privacy' | 'performance' | 'media' | 'defaults';
	let activeTab = $state<SettingsTab>('privacy');

	let instanceSettings = $derived(data.instanceSettings);
</script>

<div class="admin-settings-container">
	<header class="page-header">
		<div>
			<h1 class="page-title">Paramètres du serveur</h1>
			<p class="page-subtitle">
				Configuration en direct des constantes, quotas, limites et règles de visibilité de
				l'instance.
			</p>
		</div>
	</header>

	{#if form?.message}
		<div
			class="feedback-banner"
			class:feedback-success={form.success}
			class:feedback-error={!form.success}
			role="status"
		>
			<span>{form.message}</span>
		</div>
	{/if}

	<div class="tabs-nav" role="tablist">
		<button
			type="button"
			role="tab"
			aria-selected={activeTab === 'privacy'}
			class="tab-btn"
			class:active={activeTab === 'privacy'}
			onclick={() => (activeTab = 'privacy')}
		>
			Confidentialité et accès
		</button>
		<button
			type="button"
			role="tab"
			aria-selected={activeTab === 'performance'}
			class="tab-btn"
			class:active={activeTab === 'performance'}
			onclick={() => (activeTab = 'performance')}
		>
			Performances et limites
		</button>
		<button
			type="button"
			role="tab"
			aria-selected={activeTab === 'media'}
			class="tab-btn"
			class:active={activeTab === 'media'}
			onclick={() => (activeTab = 'media')}
		>
			Médias et stockage
		</button>
		<button
			type="button"
			role="tab"
			aria-selected={activeTab === 'defaults'}
			class="tab-btn"
			class:active={activeTab === 'defaults'}
			onclick={() => (activeTab = 'defaults')}
		>
			Contenus par défaut
		</button>
	</div>

	<div class="tab-content">
		{#if activeTab === 'privacy'}
			<AdminPrivacySettings privacySettings={instanceSettings.privacySettings} />
		{:else if activeTab === 'performance'}
			<AdminPerformanceSettings performanceSettings={instanceSettings.performanceSettings} />
		{:else if activeTab === 'media'}
			<AdminMediaSettings mediaSettings={instanceSettings.mediaSettings} />
		{:else if activeTab === 'defaults'}
			<AdminDefaultsSettings contentDefaults={instanceSettings.contentDefaults} />
		{/if}
	</div>
</div>

<style>
	.admin-settings-container {
		display: flex;
		flex-direction: column;
		gap: 20px;
		max-width: 960px;
	}

	.page-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
	}

	.page-title {
		font-size: 1.4rem;
		font-weight: 700;
		color: #0f172a;
		margin: 0 0 6px 0;
	}

	.page-subtitle {
		font-size: 0.92rem;
		color: #64748b;
		margin: 0;
	}

	.feedback-banner {
		padding: 12px 16px;
		border-radius: 8px;
		font-size: 0.9rem;
		font-weight: 500;
	}

	.feedback-success {
		background: #f0fdf4;
		color: #166534;
		border: 1px solid #bbf7d0;
	}

	.feedback-error {
		background: #fef2f2;
		color: #991b1b;
		border: 1px solid #fecaca;
	}

	.tabs-nav {
		display: flex;
		gap: 8px;
		border-bottom: 2px solid #e2e8f0;
		overflow-x: auto;
		padding-bottom: 2px;
	}

	.tab-btn {
		background: none;
		border: none;
		padding: 10px 16px;
		font-size: 0.9rem;
		font-weight: 600;
		color: #64748b;
		cursor: pointer;
		border-bottom: 2px solid transparent;
		margin-bottom: -4px;
		white-space: nowrap;
		transition:
			color 0.15s ease,
			border-color 0.15s ease;
	}

	.tab-btn:hover {
		color: #0f172a;
	}

	.tab-btn.active {
		color: #0284c7;
		border-bottom-color: #0284c7;
	}

	.tab-content {
		padding-top: 4px;
	}
</style>
