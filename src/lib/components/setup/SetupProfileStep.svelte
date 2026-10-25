<!--
  @component SetupProfileStep
  @domain setup
  @description Étape 1 de l'onboarding : configuration du profil (avatar, nom affiché, biographie).
  @responsibilities
    - Sélection et recadrage de la photo de profil (format 1:1) via le MediaEditor
    - Upload asynchrone sécurisé de l'avatar vers /api/upload
    - Validation en direct de la longueur minimale du nom affiché (>= 3 caractères)
    - Déclenchement du passage à l'étape suivante via le callback onNext
-->
<script lang="ts">
	import { mediaEditor } from '$lib/client/mediaEditorState.svelte';

	/**
	 * Propriétés du composant SetupProfileStep
	 */
	interface Props {
		/** Nom affiché de l'utilisateur (lié bidirectionnellement) */
		name: string;
		/** Biographie de l'utilisateur (liée bidirectionnellement) */
		bio: string;
		/** URL finale de l'avatar sauvegardé sur le serveur (liée bidirectionnellement) */
		finalAvatarUrl: string | null;
		/** Identifiant unique (username) pour l'initiale par défaut */
		username: string;
		/** Callback appelé pour passer à l'étape suivante */
		onNext: () => void;
	}

	let {
		name = $bindable(''),
		bio = $bindable(''),
		finalAvatarUrl = $bindable(null),
		username,
		onNext
	}: Props = $props();

	let fileInput = $state<HTMLInputElement>();
	let avatarPreview = $state<string | null>(finalAvatarUrl);
	let isUploading = $state(false);

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
</script>

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
					{(username || '?').charAt(0).toUpperCase()}
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

	<div class="form-group">
		<label for="name">Nom affiché <span class="required">*</span></label>
		<input id="name" type="text" bind:value={name} placeholder="Votre nom" minlength="3" required />

		{#if name.trim().length > 0 && name.trim().length < 3}
			<span class="input-hint error">3 caractères minimum requis.</span>
		{/if}
	</div>

	<div class="form-group">
		<label for="bio">Bio</label>
		<textarea id="bio" bind:value={bio} placeholder="Quelques mots sur vous..." rows="2"></textarea>
	</div>

	<div class="actions end">
		<button type="button" class="btn-primary" onclick={onNext} disabled={name.trim().length < 3}>
			Suivant
		</button>
	</div>
</div>

<style>
	.step-content {
		padding: 32px 24px;
		animation: fadeIn 0.3s ease;
	}

	.title {
		margin: 0 0 8px 0;
		font-size: 1.25rem;
		font-weight: 600;
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

	.actions {
		display: flex;
		align-items: center;
		margin-top: 24px;
	}
	.actions.end {
		justify-content: flex-end;
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
