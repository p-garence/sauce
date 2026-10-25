<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import SettingsCard from '$lib/components/settings/ui/SettingsCard.svelte';
	import SettingsButton from '$lib/components/settings/ui/SettingsButton.svelte';
	import SettingsToggle from './ui/SettingsToggle.svelte';
	import { enhance } from '$app/forms';

	import type { User } from '$lib/types';

	let { user }: { user: User } = $props();

	let serverDoubleTap = $derived(user.doubleTap ?? false);
	let optDoubleTap = $state<boolean | null>(null);
	let doubleTap = $derived(
		optDoubleTap !== null ? optDoubleTap : serverDoubleTap
	);

	let formRef = $state<HTMLFormElement | undefined>();

	function handleChange() {
		formRef?.requestSubmit();
	}

	async function handleLogout() {
		await authClient.signOut();
		await invalidateAll();
		await goto(resolve('/'));
	}
</script>

<SettingsCard
	title="À propos & Avancement"
	description="Suivez l'avancement du projet et découvrez les prochaines nouveautés prévues."
>
	<SettingsButton href={resolve('/parametres/calendrier')} variant="secondary">
		Voir la feuille de route
	</SettingsButton>
</SettingsCard>

<form
	bind:this={formRef}
	method="POST"
	action="?/updateBehaviorToggles"
	use:enhance={({ formData }) => {
		formData.set('doubleTap', String(doubleTap));

		return async ({ update }) => {
			await update({ reset: false });
			optDoubleTap = null;
		};
	}}
>
	<SettingsCard title="Comportement de l'app" description="comportements spécifiques">
		<SettingsToggle
			title="Activer la double touche pour aimer"
			checked={doubleTap}
			onchange={(e: Event) => {
				optDoubleTap = (e.target as HTMLInputElement).checked;
				handleChange();
			}}
		/>
	</SettingsCard>
</form>
{#if user?.role === 'admin'}
	<SettingsCard
		title="Administration"
		description="Accédez à l'interface de gestion de l'instance."
	>
		<SettingsButton href={resolve('/admin')} variant="info">
			Ouvrir le panneau d'administration
		</SettingsButton>
	</SettingsCard>
{/if}

<SettingsCard
	title="Déconnexion"
	description="Vous pourrez vous reconnecter à tout moment avec vos identifiants."
>
	<SettingsButton variant="danger" onclick={handleLogout}>Se déconnecter</SettingsButton>
</SettingsCard>
