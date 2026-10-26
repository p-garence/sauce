<!--
  @component SetupFinishStep
  @domain setup
  @description Étape 4 de l'onboarding : activation optionnelle des notifications push sur l'appareil et finalisation.
  @responsibilities
    - Proposer l'activation immédiate des notifications Web Push sur cet appareil
    - Gérer les états spécifiques des notifications (permission accordée/refusée, iOS PWA, support navigateur)
    - Soumettre le formulaire final completeSetup avec enrichissement progressif SvelteKit
    - Transmettre l'ensemble des données d'onboarding (profil, avatar, visibilité)
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import SettingsToggle from '$lib/components/settings/ui/SettingsToggle.svelte';
	import {
		getPushSubscriptionState,
		subscribeToPush,
		unsubscribeFromPush
	} from '$lib/client/pushNotifications';

	/**
	 * Propriétés du composant SetupFinishStep
	 */
	interface Props {
		/** Nom affiché validé lors de l'étape 1 */
		name: string;
		/** Biographie rédigée lors de l'étape 1 */
		bio: string;
		/** URL de l'avatar téléversé */
		finalAvatarUrl: string | null;
		/** Approbation manuelle des abonnés */
		requireFollowRequest: boolean;
		/** Approbation manuelle des messages */
		requireMessageApproval: boolean;
		/** Afficher les abonnés */
		showFollowers: boolean;
		/** Afficher les abonnements */
		showFollowing: boolean;
		/** Callback pour revenir à l'étape précédente */
		onPrev: () => void;
	}

	let {
		name,
		bio,
		finalAvatarUrl,
		requireFollowRequest,
		requireMessageApproval,
		showFollowers,
		showFollowing,
		onPrev
	}: Props = $props();

	let isLoadingForm = $state(false);

	// États Web Push
	let pushSupported = $state(true);
	let iosNeedsInstall = $state(false);
	let pushPermission = $state<NotificationPermission>('default');
	let pushSubscribed = $state(false);
	let isTogglingPush = $state(false);
	let pushFeedback = $state<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

	onMount(async () => {
		const pushState = await getPushSubscriptionState();
		pushSupported = pushState.isSupported;
		iosNeedsInstall = pushState.isIosNeedsInstall;
		pushPermission = pushState.permission;
		pushSubscribed = pushState.isSubscribed;
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
						message: res.message || "Erreur lors de l'activation."
					};
				}
			}
		} finally {
			isTogglingPush = false;
		}
	}
</script>

<form
	method="POST"
	action="?/completeSetup"
	use:enhance={() => {
		isLoadingForm = true;
		return async ({ update, result }) => {
			isLoadingForm = false;
			if (result.type === 'success') {
				await goto(resolve('/flux'));
			} else {
				await update({ reset: false });
			}
		};
	}}
>
	<!-- Données consolidées de tout l'onboarding -->
	<input type="hidden" name="name" value={name} />
	<input type="hidden" name="bio" value={bio} />
	<input type="hidden" name="avatarUrl" value={finalAvatarUrl || ''} />
	<input type="hidden" name="requireFollowRequest" value={String(requireFollowRequest)} />
	<input type="hidden" name="requireMessageApproval" value={String(requireMessageApproval)} />
	<input type="hidden" name="showFollowers" value={String(showFollowers)} />
	<input type="hidden" name="showFollowing" value={String(showFollowing)} />

	<div class="step-content center-content">
		<h2 class="title">Tout est prêt.</h2>

		<!-- Activation des notifications Push sur cet appareil -->
		<div class="notification-setup-box">
			{#if pushFeedback}
				<div
					class="alert-box mini"
					class:error={pushFeedback.type === 'error'}
					class:success={pushFeedback.type === 'success'}
					class:info={pushFeedback.type === 'info'}
				>
					{pushFeedback.message}
				</div>
			{/if}

			{#if iosNeedsInstall}
				<div class="ios-install-box">
					<div class="ios-content">
						<strong>Installation requise sur iPhone / iPad</strong>
						<p>
							Pour recevoir les alertes, appuyez sur <strong>Partager ⎋</strong> dans Safari puis
							sur <strong>« Sur l'écran d'accueil »</strong>.
						</p>
					</div>
				</div>
			{:else if !pushSupported}
				<div class="push-unsupported-note">
					Les notifications Web Push ne sont pas prises en charge par ce navigateur.
				</div>
			{:else if pushPermission === 'denied'}
				<div class="alert-box error mini">
					Les notifications sont bloquées dans votre navigateur. Vous pouvez les autoriser dans les
					paramètres de votre navigateur.
				</div>
			{:else}
				<SettingsToggle
					title="Notifications sur cet appareil"
					description={pushSubscribed
						? 'Cet appareil recevra les notifications et messages en temps réel.'
						: 'Soyez prévenu(e) en direct des nouveaux messages et mentions.'}
					checked={pushSubscribed}
					onchange={handlePushToggle}
				/>
			{/if}
		</div>

		<div class="actions space-between" style="width: 100%; margin-top: 32px;">
			<button type="button" class="btn-secondary" onclick={onPrev}>Retour</button>
			<button type="submit" class="btn-primary" disabled={isLoadingForm}>
				{isLoadingForm ? 'Enregistrement...' : 'Terminer'}
			</button>
		</div>
	</div>
</form>

<style>
	.step-content {
		padding: 32px 24px;
		animation: fadeIn 0.3s ease;
	}
	.step-content.center-content {
		text-align: center;
		padding-top: 48px;
		padding-bottom: 48px;
	}

	.title {
		margin: 0 0 8px 0;
		font-size: 1.25rem;
		font-weight: 600;
	}

	.actions {
		display: flex;
		align-items: center;
	}
	.actions.space-between {
		justify-content: space-between;
	}

	button {
		font-family: inherit;
		font-size: 0.9rem;
		font-weight: 500;
		cursor: pointer;
		padding: 10px 16px;
		border-radius: 6px;
		transition: all 0.2s;
	}
	button:disabled {
		opacity: 0.5;
		cursor: wait;
	}

	.btn-primary {
		background: #111827;
		color: white;
		border: 1px solid #111827;
	}
	.btn-primary:hover:not(:disabled) {
		background: #374151;
	}

	.btn-secondary {
		background: #ffffff;
		color: #374151;
		border: 1px solid #d1d5db;
	}
	.btn-secondary:hover:not(:disabled) {
		background: #f9fafb;
	}

	.alert-box {
		padding: 12px;
		border-radius: 6px;
		margin-bottom: 16px;
		font-size: 0.85rem;
		text-align: center;
		border: 1px solid transparent;
	}
	.alert-box.error {
		background: #fef2f2;
		color: #991b1b;
		border-color: #fecaca;
	}
	.alert-box.success {
		background: #ecfdf5;
		color: #065f46;
		border-color: #a7f3d0;
	}
	.alert-box.info {
		background: #eff6ff;
		color: #1e40af;
		border-color: #bfdbfe;
	}
	.alert-box.mini {
		padding: 8px 12px;
		margin-bottom: 12px;
		font-size: 0.8rem;
	}

	.notification-setup-box {
		margin-top: 24px;
		padding: 16px;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		text-align: left;
	}
	.push-unsupported-note {
		font-size: 0.85rem;
		color: #94a3b8;
		text-align: center;
		padding: 4px 0;
	}
	.ios-install-box {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 8px 0;
		font-size: 0.85rem;
	}

	.ios-content strong {
		display: block;
		margin-bottom: 4px;
		color: #1e293b;
		font-size: 0.85rem;
	}
	.ios-content p {
		margin: 0;
		color: #64748b;
		font-size: 0.8rem;
		line-height: 1.4;
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
</style>
