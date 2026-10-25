<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import SettingsToggle from '$lib/components/settings/ui/SettingsToggle.svelte';
	import { mediaEditor } from '$lib/client/mediaEditorState.svelte';
	import { resolve } from '$app/paths';

	let { data, form } = $props();
	let user = $derived(data.sessionUser);

	let step = $state(1);
	let isLoadingForm = $state(false);

	// Étape 1 : Profil
	// svelte-ignore state_referenced_locally
	let name = $state(data.sessionUser.name || '');
	// svelte-ignore state_referenced_locally
	let bio = $state(data.sessionUser.bio || '');
	let fileInput = $state<HTMLInputElement>();
	// svelte-ignore state_referenced_locally
	let avatarPreview = $state<string | null>(data.sessionUser.image || null);
	// svelte-ignore state_referenced_locally
	let finalAvatarUrl = $state<string | null>(data.sessionUser.image || null);
	let isUploading = $state(false);

	// Étape 2 : Confidentialité
	// svelte-ignore state_referenced_locally
	let requireFollowRequest = $state(user.profileVisibility?.requireFollowRequest ?? false);
	// svelte-ignore state_referenced_locally
	let requireMessageApproval = $state(user.profileVisibility?.requireMessageApproval ?? false);
	// svelte-ignore state_referenced_locally
	let showFollowers = $state(user.profileVisibility?.showFollowers ?? true);
	// svelte-ignore state_referenced_locally
	let showFollowing = $state(user.profileVisibility?.showFollowing ?? true);

	// --- LOGIQUE AVATAR (Comme dans modifier_profil) ---
	function handleFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) {
			mediaEditor.open([file], '1:1', handleCropped);
		}
		target.value = '';
	}

	async function handleCropped(croppedFile: File) {
		isUploading = true;
		const uploadData = new FormData();
		uploadData.append('file', croppedFile);

		try {
			const response = await fetch('/api/upload', {
				method: 'POST',
				body: uploadData
			});
			const result = await response.json();
			if (result.success && result.media.length > 0) {
				finalAvatarUrl = result.media[0].url;
				avatarPreview = result.media[0].url;
			}
		} catch (error) {
			console.error('Erreur upload avatar:', error);
			alert("Erreur lors de l'upload de l'image");
		} finally {
			isUploading = false;
		}
	}

	// --- NAVIGATION ---
	function nextStep() {
		if (step < 3) step++;
	}
	function prevStep() {
		if (step > 1) step--;
	}
</script>

<div class="setup-layout">
	<div class="setup-card">
		<div class="progress-bar">
			<div class="progress-fill" style="width: {(step / 3) * 100}%"></div>
		</div>

		{#if form?.error}
			<div class="alert-box error">{form.error}</div>
		{/if}

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
			<!-- Champs cachés pour envoyer TOUTES les données indépendamment de l'étape affichée -->
			<input type="hidden" name="name" value={name} />
			<input type="hidden" name="bio" value={bio} />
			<input type="hidden" name="avatarUrl" value={finalAvatarUrl || ''} />
			<input type="hidden" name="requireFollowRequest" value={String(requireFollowRequest)} />
			<input type="hidden" name="requireMessageApproval" value={String(requireMessageApproval)} />
			<input type="hidden" name="showFollowers" value={String(showFollowers)} />
			<input type="hidden" name="showFollowing" value={String(showFollowing)} />

			<!-- ============================== -->
			<!-- ÉTAPE 1 : PROFIL               -->
			<!-- ============================== -->
			{#if step === 1}
				<div class="step-content">
					<h2 class="title">Personnalisez votre profil</h2>

					<div class="avatar-section">
						<div class="avatar-wrapper">
							{#if isUploading}
								<div class="avatar-placeholder loader">...</div>
							{:else if avatarPreview}
								<img src={avatarPreview} alt="Aperçu" class="avatar-img" />
							{:else}
								<div class="avatar-placeholder">
									{(user.username || '?').charAt(0).toUpperCase()}
								</div>
							{/if}
						</div>
						<button
							type="button"
							class="btn-text"
							onclick={() => fileInput?.click()}
							disabled={isUploading}
						>
							Choisir une photo
						</button>
						<input
							type="file"
							accept="image/jpeg, image/png, image/webp"
							bind:this={fileInput}
							onchange={handleFileChange}
							hidden
						/>
					</div>

					<!-- 👇 MISE À JOUR DU CHAMP NOM -->
					<div class="form-group">
						<label for="name">Nom affiché <span class="required">*</span></label>
						<input
							id="name"
							type="text"
							bind:value={name}
							placeholder="Votre nom"
							minlength="3"
							required
						/>

						<!-- Petit message d'aide en direct -->
						{#if name.trim().length > 0 && name.trim().length < 3}
							<span class="input-hint error">3 caractères minimum requis.</span>
						{/if}
					</div>

					<div class="form-group">
						<label for="bio">Biographie</label>
						<textarea id="bio" bind:value={bio} placeholder="Quelques mots sur vous..." rows="2"
						></textarea>
					</div>

					<div class="actions end">
						<!-- 👇 BOUTON DÉSACTIVÉ SI < 3 -->
						<button
							type="button"
							class="btn-primary"
							onclick={nextStep}
							disabled={name.trim().length < 3}
						>
							Suivant
						</button>
					</div>
				</div>
			{/if}

			<!-- ============================== -->
			<!-- ÉTAPE 2 : CONFIDENTIALITÉ      -->
			<!-- ============================== -->
			{#if step === 2}
				<div class="step-content">
					<h2 class="title">Confidentialité</h2>
					<p class="subtitle">Ces paramètres restent modifiables à tout moment.</p>

					<div class="privacy-list">
						<SettingsToggle title="Approuver les abonnés" bind:checked={requireFollowRequest} />
						<SettingsToggle title="Approuver les messages" bind:checked={requireMessageApproval} />
						<SettingsToggle title="Montrer mes abonnés" bind:checked={showFollowers} />
						<SettingsToggle title="Montrer mes abonnements" bind:checked={showFollowing} />
					</div>

					<div class="actions space-between">
						<button type="button" class="btn-secondary" onclick={prevStep}>Retour</button>
						<button type="button" class="btn-primary" onclick={nextStep}>Suivant</button>
					</div>
				</div>
			{/if}

			<!-- ============================== -->
			<!-- ÉTAPE 3 : FINALISATION         -->
			<!-- ============================== -->
			{#if step === 3}
				<div class="step-content center-content">
					<h2 class="title">Tout est prêt.</h2>
					<p class="subtitle">
						Votre compte est configuré. Vous pouvez maintenant rejoindre votre réseau social.
					</p>

					<div class="actions space-between" style="width: 100%; margin-top: 40px;">
						<button type="button" class="btn-secondary" onclick={prevStep}>Retour</button>
						<button type="submit" class="btn-primary" disabled={isLoadingForm}>
							{isLoadingForm ? 'Enregistrement...' : 'Terminer'}
						</button>
					</div>
				</div>
			{/if}
		</form>
	</div>
</div>

<style>
	/* DESIGN SOBRE ET COMPACT */
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
		max-width: 420px;
		border-radius: 12px;
		border: 1px solid #e5e7eb;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
		overflow: hidden;
	}

	.progress-bar {
		width: 100%;
		height: 4px;
		background: #f3f4f6;
	}
	.progress-fill {
		height: 100%;
		background: #111827; /* Noir sobre */
		transition: width 0.3s ease;
	}

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
	.subtitle {
		margin: 0 0 24px 0;
		font-size: 0.9rem;
		color: #6b7280;
	}

	/* Avatar */
	.avatar-section {
		display: flex;
		align-items: center;
		gap: 16px;
		margin-bottom: 24px;
	}
	.avatar-wrapper {
		width: 64px;
		height: 64px;
		border-radius: 50%;
		border: 1px solid #e5e7eb;
		overflow: hidden;
		background: #f3f4f6;
		flex-shrink: 0;
	}
	.avatar-img,
	.avatar-placeholder {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		object-fit: cover;
	}
	.avatar-placeholder {
		font-size: 1.5rem;
		font-weight: 600;
		color: #9ca3af;
	}
	.loader {
		animation: pulse 1.5s infinite;
		font-size: 0.8rem;
	}

	.btn-text {
		background: none;
		border: none;
		color: #111827;
		font-weight: 500;
		font-size: 0.9rem;
		cursor: pointer;
		text-decoration: underline;
		padding: 0;
	}
	.btn-text:disabled {
		opacity: 0.5;
		cursor: wait;
	}

	/* Form Inputs */
	.form-group {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin-bottom: 16px;
	}
	.form-group label {
		font-size: 0.85rem;
		font-weight: 500;
		color: #4b5563;
	}
	.form-group input,
	.form-group textarea {
		width: 100%;
		padding: 10px 12px;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 0.95rem;
		font-family: inherit;
		outline: none;
		resize: none;
		transition: border-color 0.2s;
	}
	.form-group input:focus,
	.form-group textarea:focus {
		border-color: #111827;
	}

	.privacy-list {
		display: flex;
		flex-direction: column;
		gap: 8px; /* Plus compact */
		margin-bottom: 24px;
	}

	/* Actions */
	.actions {
		display: flex;
		align-items: center;
		margin-top: 24px;
	}
	.actions.end {
		justify-content: flex-end;
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

	.required {
		color: #dc2626;
	}
	.input-hint {
		font-size: 0.8rem;
		margin-top: 4px;
	}
	.input-hint.error {
		color: #dc2626;
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
	@keyframes pulse {
		0%,
		100% {
			opacity: 0.5;
		}
		50% {
			opacity: 1;
		}
	}
</style>
