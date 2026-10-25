<script lang="ts">
	import SettingsGeneral from '$lib/components/settings/SettingsGeneral.svelte';
	import SettingsReferral from '$lib/components/settings/SettingsReferral.svelte';
	import SettingsFeeds from '$lib/components/settings/SettingsFeeds.svelte';
	import SettingsPrivacy from '$lib/components/settings/SettingsPrivacy.svelte';
	import SettingsNotifications from '$lib/components/settings/SettingsNotifications.svelte';
	import SettingsMedia from '$lib/components/settings/SettingsMedia.svelte';
	import SettingsIcons from '$lib/components/settings/SettingsIcons.svelte';
	import SettingsEmojis from '$lib/components/settings/SettingsEmojis.svelte';
	import TopNav from '$lib/components/navigation/TopNav.svelte';
	import SettingsGroups from '$lib/components/settings/SettingsGroups.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconId, UserFeed } from '$lib/types';
	import { page } from '$app/state';

	let { data, form } = $props();
	let activeTab = $state(page.url.searchParams.get('tab') || 'general');

	// Synchronise automatiquement l'onglet actif quand le paramètre d'URL change
	$effect(() => {
		const paramTab = page.url.searchParams.get('tab');
		if (paramTab && tabs.some((t) => t.id === paramTab)) {
			activeTab = paramTab;
		}
	});

	function selectTab(tabId: string) {
		activeTab = tabId;
	}

	export const snapshot = {
		capture: () => activeTab,
		restore: (value: string) => {
			activeTab = value;
		}
	};

	const tabs: { id: string; label: string; iconId: IconId }[] = [
		{ id: 'general', label: 'Général', iconId: 'nav.settings' },
		{ id: 'privacy', label: 'Vie Privée', iconId: 'status.lock' },
		{ id: 'groups', label: 'Groupes', iconId: 'status.users' },
		{ id: 'feeds', label: 'Flux', iconId: 'nav.feed' },
		{ id: 'referral', label: 'Parrainage', iconId: 'status.users' },
		{ id: 'notifications', label: 'Notifications', iconId: 'nav.notifications' },
		{ id: 'media', label: 'Médias', iconId: 'media.image' },
		{ id: 'icons', label: 'Icônes', iconId: 'status.palette' },
		{ id: 'emojis', label: 'Emojis', iconId: 'status.tag' }
	];
</script>

<div class="settings-container">
	<TopNav title="Paramètres" />

	<nav class="tabs-nav">
		{#each tabs as tab (tab.id)}
			<button class="tab-btn" class:active={activeTab === tab.id} onclick={() => selectTab(tab.id)}>
				<span class="tab-icon"><Icon name={tab.iconId} size={18} /></span>
				{tab.label}
			</button>
		{/each}
	</nav>

	<main class="tab-content">
		{#if activeTab === 'general'}
			<SettingsGeneral user={data.user} {form} />
		{:else if activeTab === 'privacy'}
			<SettingsPrivacy
				user={data.user}
				groups={data.userGroups}
				blockedUsers={data.blockedUsers}
				{form}
			/>
		{:else if activeTab === 'feeds'}
			<SettingsFeeds
				feeds={data.feeds as UserFeed[]}
				groups={data.userGroups}
				trendingTags={data.trendingTags}
				{form}
			/>
		{:else if activeTab === 'referral'}
			<SettingsReferral maxInvites={data.user.maxInvites} keys={data.keys} {form} />
		{:else if activeTab === 'notifications'}
			<SettingsNotifications user={data.user} />
		{:else if activeTab === 'media'}
			<SettingsMedia
				mediaUsage={data.mediaUsage}
				currentUser={data.user}
				userGroups={data.userGroups}
			/>
		{:else if activeTab === 'groups'}
			<SettingsGroups groups={data.userGroups} />
		{:else if activeTab === 'icons'}
			<SettingsIcons />
		{:else if activeTab === 'emojis'}
			<SettingsEmojis />
		{/if}
	</main>
</div>

<style>
	.settings-container {
		padding: var(--space-4, 16px);
		width: 100%; /* S'appuie sur .app-content */
		/* max-width et margin: 0 auto supprimés */
	}

	/* NAVIGATION - MOBILE FIRST (Empilé / Stack) */
	.tabs-nav {
		display: flex;
		flex-direction: column; /* S'empile sur mobile */
		gap: 8px;
		margin-bottom: 24px;
	}

	.tab-btn {
		display: flex;
		align-items: center;
		justify-content: flex-start;
		gap: 12px; /* Espace fixe entre icône et texte */
		padding: 14px 16px;
		border: none;
		background: #f8f9fa; /* Fond léger sur mobile */
		border-radius: 12px;
		font-weight: 600;
		font-size: 1rem;
		color: #475569;
		cursor: pointer;
		transition: all 0.2s;
		width: 100%;
	}

	.tab-btn.active {
		background: #1a1a1a;
		color: white;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.tab-icon {
		flex-shrink: 0; /* Empêche l'icône de s'écraser sur petit écran */
		font-size: 1.2rem;
	}

	.tab-content {
		animation: fadeIn 0.2s ease-in-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(5px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* NAVIGATION - DESKTOP / TABLETTE (Menu horizontal) */
	@media (min-width: 640px) {
		.tabs-nav {
			flex-direction: row;
			flex-wrap: wrap; /* Passe à la ligne proprement si plus de place */
			background: #f8f9fa;
			padding: 8px;
			border-radius: 12px;
		}

		.tab-btn {
			flex: 1 1 auto; /* Prend la largeur nécessaire */
			justify-content: center;
			background: transparent;
			padding: 10px 16px;
			border-radius: 8px;
			font-size: 0.95rem;
			width: auto;
		}

		.tab-btn.active {
			background: white;
			color: #0f172a;
			box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
		}
	}
</style>
