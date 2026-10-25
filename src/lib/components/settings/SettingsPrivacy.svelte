<!--
  @component SettingsPrivacy
  @domain settings/privacy
  @description Panneau de configuration de la confidentialité du compte utilisateur et de la visibilité rétroactive.
  @responsibilities
    - Configurer les toggles d'approbation d'abonnements et de messages avec sauvegarde réactive
    - Piloter la visibilité des abonnés / abonnements et l'autorisation des mentions
    - Intégrer la modification rétroactive de la visibilité des publications/stories
    - Intégrer la gestion des utilisateurs bloqués
-->
<script lang="ts">
	import SettingsCard from '$lib/components/settings/ui/SettingsCard.svelte';
	import SettingsToggle from '$lib/components/settings/ui/SettingsToggle.svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import type { User, UserGroup } from '$lib/types';
	import PrivacyRetroactiveCard from './privacy/PrivacyRetroactiveCard.svelte';
	import PrivacyBlockedUsersCard from './privacy/PrivacyBlockedUsersCard.svelte';

	type FormResult = { success?: boolean; message?: string } | null;

	type BlockedUserItem = {
		id: string;
		username: string | null;
		name: string | null;
		image: string | null;
		blockedAt: Date;
	};

	/**
	 * Propriétés du composant SettingsPrivacy
	 */
	interface Props {
		/** Utilisateur connecté */
		user: User;
		/** Retour de soumission de formulaire SvelteKit */
		form?: FormResult;
		/** Groupes de l'utilisateur pour le sélecteur rétroactif */
		groups?: UserGroup[];
		/** Utilisateurs bloqués par l'utilisateur connecté */
		blockedUsers?: BlockedUserItem[];
	}

	let { user, form, groups = [], blockedUsers = [] }: Props = $props();

	let userGroups = $derived(
		groups && groups.length > 0 ? groups : (page.data?.userGroups as UserGroup[]) || []
	);

	// 1. Vérité serveur
	let serverRequireFollow = $derived(user.profileVisibility?.requireFollowRequest ?? false);
	let serverRequireMessage = $derived(user.profileVisibility?.requireMessageApproval ?? false);
	let serverShowFollowers = $derived(user.profileVisibility?.showFollowers ?? true);
	let serverShowFollowing = $derived(user.profileVisibility?.showFollowing ?? true);
	let serverAllowMentions = $derived(user.profileVisibility?.allowMentions ?? true);

	// 2. Overrides optimistes locaux
	let optRequireFollow = $state<boolean | null>(null);
	let optRequireMessage = $state<boolean | null>(null);
	let optShowFollowers = $state<boolean | null>(null);
	let optShowFollowing = $state<boolean | null>(null);
	let optAllowMentions = $state<boolean | null>(null);

	// 3. Fusion
	let requireFollowRequest = $derived(
		optRequireFollow !== null ? optRequireFollow : serverRequireFollow
	);
	let requireMessageApproval = $derived(
		optRequireMessage !== null ? optRequireMessage : serverRequireMessage
	);
	let showFollowers = $derived(optShowFollowers !== null ? optShowFollowers : serverShowFollowers);
	let showFollowing = $derived(optShowFollowing !== null ? optShowFollowing : serverShowFollowing);
	let allowMentions = $derived(optAllowMentions !== null ? optAllowMentions : serverAllowMentions);

	let formRef = $state<HTMLFormElement | undefined>();

	function handleChange() {
		formRef?.requestSubmit();
	}
</script>

{#if form?.message}
	<div class="alert-box" class:error={!form.success} class:success={form.success}>
		{form.message}
	</div>
{/if}

<!-- BLOC 1 : Les Toggles Automatiques -->
<form
	bind:this={formRef}
	method="POST"
	action="?/updatePrivacyToggles"
	use:enhance={({ formData }) => {
		formData.set('requireFollowRequest', String(requireFollowRequest));
		formData.set('showFollowers', String(showFollowers));
		formData.set('showFollowing', String(showFollowing));
		formData.set('requireMessageApproval', String(requireMessageApproval));
		formData.set('allowMentions', String(allowMentions));

		return async ({ update }) => {
			await update({ reset: false });
			optRequireFollow = null;
			optShowFollowers = null;
			optShowFollowing = null;
			optRequireMessage = null;
			optAllowMentions = null;
		};
	}}
>
	<SettingsCard
		title="Confidentialité du profil"
		description="Gérez comment les autres peuvent interagir avec votre compte public."
	>
		<SettingsToggle
			title="Approuver les abonnés"
			checked={requireFollowRequest}
			onchange={(e: Event) => {
				optRequireFollow = (e.target as HTMLInputElement).checked;
				handleChange();
			}}
		/>
		<SettingsToggle
			title="Approuver les messages"
			checked={requireMessageApproval}
			onchange={(e: Event) => {
				optRequireMessage = (e.target as HTMLInputElement).checked;
				handleChange();
			}}
		/>
		<SettingsToggle
			title="Montrer mes abonnés"
			checked={showFollowers}
			onchange={(e: Event) => {
				optShowFollowers = (e.target as HTMLInputElement).checked;
				handleChange();
			}}
		/>
		<SettingsToggle
			title="Montrer mes abonnements"
			checked={showFollowing}
			onchange={(e: Event) => {
				optShowFollowing = (e.target as HTMLInputElement).checked;
				handleChange();
			}}
		/>
		<SettingsToggle
			title="Autoriser les mentions (@)"
			checked={allowMentions}
			onchange={(e: Event) => {
				optAllowMentions = (e.target as HTMLInputElement).checked;
				handleChange();
			}}
		/>
	</SettingsCard>
</form>

<!-- BLOC 2 : Actions rétroactives -->
<PrivacyRetroactiveCard {userGroups} />

<!-- BLOC 3 : Utilisateurs bloqués -->
<PrivacyBlockedUsersCard {blockedUsers} />

<style>
	.alert-box {
		padding: 12px;
		border-radius: 6px;
		margin-bottom: 16px;
		font-size: 0.9rem;
		border: 1px solid transparent;
	}
	.alert-box.success {
		background: #dcfce7;
		color: #166534;
		border-color: #bbf7d0;
	}
	.alert-box.error {
		background: #fee2e2;
		color: #dc2626;
		border-color: #fecaca;
	}
</style>
