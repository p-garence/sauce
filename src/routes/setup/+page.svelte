<!--
  @component SetupPage
  @domain setup
  @description Page d'onboarding initial (/setup) guidant l'utilisateur à travers 4 étapes de configuration.
  @responsibilities
    - Coordonner les 4 étapes : Profil, Confidentialité, Flux et Finalisation
    - Gérer la barre de progression globale et l'état réactif partagé
    - Adapter la largeur de la carte de manière responsive selon l'étape active
-->
<script lang="ts">
	import {
		SetupProfileStep,
		SetupPrivacyStep,
		SetupFeedsStep,
		SetupFinishStep
	} from '$lib/components/setup';

	let { data, form } = $props();
	let user = $derived(data.sessionUser);

	const TOTAL_STEPS = 4;
	let step = $state(1);

	// Étape 1 : Profil
	// svelte-ignore state_referenced_locally
	let name = $state(data.sessionUser.name || '');
	// svelte-ignore state_referenced_locally
	let bio = $state(data.sessionUser.bio || '');
	// svelte-ignore state_referenced_locally
	let finalAvatarUrl = $state<string | null>(data.sessionUser.image || null);

	// Étape 2 : Confidentialité
	// svelte-ignore state_referenced_locally
	let requireFollowRequest = $state(
		user.profileVisibility?.requireFollowRequest ??
			data.instanceSettings?.privacySettings?.defaultRequireFollowRequest ??
			false
	);
	// svelte-ignore state_referenced_locally
	let requireMessageApproval = $state(
		user.profileVisibility?.requireMessageApproval ??
			data.instanceSettings?.privacySettings?.defaultRequireMessageApproval ??
			false
	);
	// svelte-ignore state_referenced_locally
	let showFollowers = $state(
		user.profileVisibility?.showFollowers ??
			data.instanceSettings?.privacySettings?.defaultShowFollowers ??
			true
	);
	// svelte-ignore state_referenced_locally
	let showFollowing = $state(
		user.profileVisibility?.showFollowing ??
			data.instanceSettings?.privacySettings?.defaultShowFollowing ??
			true
	);

	// --- NAVIGATION ---
	function nextStep() {
		if (step < TOTAL_STEPS) step++;
	}
	function prevStep() {
		if (step > 1) step--;
	}
</script>

<div class="setup-layout">
	<div class="setup-card" class:step-feeds={step === 3}>
		<div class="progress-bar">
			<div class="progress-fill" style="width: {(step / TOTAL_STEPS) * 100}%"></div>
		</div>

		{#if form?.error}
			<div class="alert-box error">{form.error}</div>
		{/if}

		<!-- ÉTAPE 1 : PROFIL -->
		{#if step === 1}
			<SetupProfileStep
				bind:name
				bind:bio
				bind:finalAvatarUrl
				username={user.username || ''}
				onNext={nextStep}
			/>
		{/if}

		<!-- ÉTAPE 2 : CONFIDENTIALITÉ -->
		{#if step === 2}
			<SetupPrivacyStep
				bind:requireFollowRequest
				bind:requireMessageApproval
				bind:showFollowers
				bind:showFollowing
				onPrev={prevStep}
				onNext={nextStep}
			/>
		{/if}

		<!-- ÉTAPE 3 : FLUX DE CONTENU -->
		{#if step === 3}
			<SetupFeedsStep
				feeds={data.feeds}
				groups={data.groups}
				trendingTags={data.trendingTags}
				feedError={form?.feedError}
				onPrev={prevStep}
				onNext={nextStep}
			/>
		{/if}

		<!-- ÉTAPE 4 : FINALISATION & PUSH NOTIFICATIONS -->
		{#if step === 4}
			<SetupFinishStep
				{name}
				{bio}
				{finalAvatarUrl}
				{requireFollowRequest}
				{requireMessageApproval}
				{showFollowers}
				{showFollowing}
				onPrev={prevStep}
			/>
		{/if}
	</div>
</div>

<style>
	.setup-layout {
		min-height: 100vh;
		background: #f9fafb;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px;
		color: #111827;
	}

	.setup-card {
		background: #ffffff;
		width: 100%;
		max-width: 440px;
		border-radius: 12px;
		border: 1px solid #e5e7eb;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
		overflow: hidden;
		transition: max-width 0.25s ease;
	}

	.setup-card.step-feeds {
		max-width: 580px;
	}

	.progress-bar {
		width: 100%;
		height: 4px;
		background: #f3f4f6;
	}
	.progress-fill {
		height: 100%;
		background: #111827;
		transition: width 0.3s ease;
	}

	.alert-box {
		padding: 12px;
		border-radius: 6px;
		margin: 16px;
		font-size: 0.85rem;
		text-align: center;
		border: 1px solid transparent;
	}
	.alert-box.error {
		background: #fef2f2;
		color: #991b1b;
		border-color: #fecaca;
	}
</style>
