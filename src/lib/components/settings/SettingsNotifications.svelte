<script lang="ts">
	import SettingsCard from '$lib/components/settings/ui/SettingsCard.svelte';
	import SettingsToggle from '$lib/components/settings/ui/SettingsToggle.svelte';
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import type { User } from '$lib/types';
	import {
		getPushSubscriptionState,
		subscribeToPush,
		unsubscribeFromPush
	} from '$lib/client/pushNotifications';

	type FormResult = { success?: boolean; message?: string } | null;
	let {
		user,
		form
	}: {
		user: User;
		form?: FormResult;
	} = $props();

	// 1. Vérité serveur des préférences de compte
	let serverMessage = $derived(user.notificationSettings?.message ?? true);
	let serverFollow = $derived(user.notificationSettings?.follow ?? true);
	let serverComment = $derived(user.notificationSettings?.comment ?? true);
	let serverLike = $derived(user.notificationSettings?.like ?? true);

	// 2. Overrides optimistes locaux
	let optMessage = $state<boolean | null>(null);
	let optFollow = $state<boolean | null>(null);
	let optComment = $state<boolean | null>(null);
	let optLike = $state<boolean | null>(null);

	// 3. Fusion
	let message = $derived(optMessage !== null ? optMessage : serverMessage);
	let follow = $derived(optFollow !== null ? optFollow : serverFollow);
	let comment = $derived(optComment !== null ? optComment : serverComment);
	let like = $derived(optLike !== null ? optLike : serverLike);

	let formRef = $state<HTMLFormElement | undefined>();

	// Déclenche la sauvegarde silencieuse au clic
	function handleChange() {
		formRef?.requestSubmit();
	}

	// 4. Gestion Web Push par appareil
	let pushSupported = $state(true);
	let iosNeedsInstall = $state(false);
	let pushPermission = $state<NotificationPermission>('default');
	let pushSubscribed = $state(false);
	let isTogglingPush = $state(false);
	let pushFeedback = $state<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

	onMount(async () => {
		const state = await getPushSubscriptionState();
		pushSupported = state.isSupported;
		iosNeedsInstall = state.isIosNeedsInstall;
		pushPermission = state.permission;
		pushSubscribed = state.isSubscribed;
	});

	async function handlePushToggle() {
		if (isTogglingPush) return;
		isTogglingPush = true;
		pushFeedback = null;

		try {
			if (pushSubscribed) {
				const res = await unsubscribeFromPush();
				if (res.success) {
					pushSubscribed = false;
					pushFeedback = {
						type: 'info',
						message: res.message || 'Notifications désactivées sur cet appareil.'
					};
				} else {
					pushFeedback = {
						type: 'error',
						message: res.message || 'Erreur lors de la désactivation.'
					};
				}
			} else {
				const res = await subscribeToPush();
				if (res.success) {
					pushSubscribed = true;
					pushPermission = 'granted';
					pushFeedback = {
						type: 'success',
						message: res.message || 'Notifications activées avec succès !'
					};
				} else {
					pushFeedback = {
						type: 'error',
						message: res.message || 'Erreur lors de l’activation.'
					};
				}
			}
		} finally {
			isTogglingPush = false;
		}
	}
</script>

{#if form?.message}
	<div class="alert-box" class:error={!form.success} class:success={form.success}>
		{form.message}
	</div>
{/if}

<!-- SECTION 1 : Activation Push sur cet appareil -->
<SettingsCard
	title="Notifications sur cet appareil"
	description="Activez les alertes directes sur cet appareil (téléphone ou ordinateur), même lorsque l'application est fermée."
>
	{#if pushFeedback}
		<div
			class="alert-box"
			class:error={pushFeedback.type === 'error'}
			class:success={pushFeedback.type === 'success'}
			class:info={pushFeedback.type === 'info'}
		>
			{pushFeedback.message}
		</div>
	{/if}

	{#if iosNeedsInstall}
		<div class="ios-install-box">
			<span class="ios-icon">📲</span>
			<div class="ios-content">
				<strong>Installation requise sur iPhone / iPad</strong>
				<p>
					Apple impose d’ajouter l’application à l’écran d’accueil pour autoriser les notifications.
					Appuyez sur <strong>Partager ⎋</strong> dans Safari puis sur
					<strong>« Sur l'écran d'accueil »</strong>.
				</p>
			</div>
		</div>
	{:else if !pushSupported}
		<div class="alert-box error">
			Votre navigateur ne prend pas en charge les notifications Web Push.
		</div>
	{:else if pushPermission === 'denied'}
		<div class="alert-box error">
			⚠️ Les notifications sont bloquées dans les paramètres de votre navigateur. Veuillez les
			autoriser pour ce site dans les préférences de votre navigateur.
		</div>
	{:else}
		<SettingsToggle
			title="Activer les notifications sur cet appareil"
			description={pushSubscribed
				? 'Cet appareil est configuré pour recevoir les notifications Push en temps réel.'
				: 'Autorisez les alertes pour recevoir les notifications sur cet appareil.'}
			checked={pushSubscribed}
			onchange={handlePushToggle}
		/>
	{/if}
</SettingsCard>

<div style="height: 16px;"></div>

<!-- SECTION 2 : Préférences par type de notification -->
<form
	bind:this={formRef}
	method="POST"
	action="?/updateNotificationToggles"
	use:enhance={({ formData }) => {
		const hasAny = message || follow || comment || like;
		formData.set('all', String(hasAny));
		formData.set('message', String(message));
		formData.set('follow', String(follow));
		formData.set('comment', String(comment));
		formData.set('like', String(like));

		return async ({ update }) => {
			await update({ reset: false });
			optMessage = null;
			optFollow = null;
			optComment = null;
			optLike = null;
		};
	}}
>
	<SettingsCard
		title="Préférences des notifications"
		description="Choisissez les catégories d'alertes que vous souhaitez recevoir pour votre compte."
	>
		<SettingsToggle
			title="Messages"
			description="Alertes lors de la réception d’un nouveau message privé."
			checked={message}
			onchange={(e: Event) => {
				optMessage = (e.target as HTMLInputElement).checked;
				handleChange();
			}}
		/>

		<SettingsToggle
			title="Nouveaux abonnés"
			description="Alerte lorsqu’un utilisateur s’abonne à votre compte."
			checked={follow}
			onchange={(e: Event) => {
				optFollow = (e.target as HTMLInputElement).checked;
				handleChange();
			}}
		/>

		<SettingsToggle
			title="Commentaires"
			description="Alerte lors d’un nouveau commentaire ou d’une réponse sur vos posts."
			checked={comment}
			onchange={(e: Event) => {
				optComment = (e.target as HTMLInputElement).checked;
				handleChange();
			}}
		/>

		<SettingsToggle
			title="Mentions J’aime"
			description="Alerte lorsqu’un membre aime vos publications ou vos stories."
			checked={like}
			onchange={(e: Event) => {
				optLike = (e.target as HTMLInputElement).checked;
				handleChange();
			}}
		/>
	</SettingsCard>
</form>

<style>
	.alert-box {
		padding: 12px;
		border-radius: 8px;
		margin-bottom: 16px;
		font-size: 0.9rem;
		border: 1px solid transparent;
		line-height: 1.4;
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
	.alert-box.info {
		background: #eff6ff;
		color: #1e40af;
		border-color: #bfdbfe;
	}

	.ios-install-box {
		display: flex;
		gap: 12px;
		padding: 14px;
		border-radius: 8px;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		color: #334155;
		margin-bottom: 8px;
	}
	.ios-icon {
		font-size: 1.5rem;
		flex-shrink: 0;
	}
	.ios-content strong {
		display: block;
		font-size: 0.95rem;
		color: #0f172a;
		margin-bottom: 4px;
	}
	.ios-content p {
		font-size: 0.85rem;
		margin: 0;
		line-height: 1.4;
	}
</style>
