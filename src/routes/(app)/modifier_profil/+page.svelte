<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import PageHeader from '$lib/components/navigation/PageHeader.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { mediaEditor } from '$lib/client/mediaEditorState.svelte';
	import { formatFullDate } from '$lib/dates';
	let { data, form } = $props();
	let isSaving = $state(false);

	// États pour l'avatar
	// svelte-ignore state_referenced_locally
	let avatarPreview = $state(data.profile.image);
	// svelte-ignore state_referenced_locally
	let finalAvatarUrl = $state(data.profile.image);

	let fileInput: HTMLInputElement;
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

<div class="edit-profile-page">
	<PageHeader
		title={data.profile.name}
		username={data.profile.username}
		back_location={`/profil/${data.sessionUser.username}`}
	>
		<button
			type="submit"
			form="edit-profile-form"
			class="header-save-btn"
			disabled={isSaving || isUploading}
		>
			{#if isSaving}
				<Icon name="status.time" size={18} />
			{:else}
				Enregistrer
			{/if}
		</button>
	</PageHeader>

	<main class="form-container">
		{#if form?.success}
			<div class="success-banner">Profil mis à jour avec succès !</div>
		{/if}
		{#if form?.message}
			<div class="error-banner">{form.message}</div>
		{/if}

		<form
			id="edit-profile-form"
			method="POST"
			class="edit-form"
			use:enhance={() => {
				isSaving = true;
				return async ({ result, update }) => {
					if (result.type === 'success') {
						await invalidateAll();

						// On vérifie si l'utilisateur a un historique interne à l'app
						const hasNavigated = sessionStorage.getItem('app_navigated') === 'true';

						if (hasNavigated) {
							window.history.back(); // Retour naturel (efface la page modifier)
						} else {
							// Vient d'un lien direct : on le redirige explicitement vers le post
							goto(resolve(`/profil/${data.profile.username}`), { replaceState: true });
						}
					} else {
						await update({ reset: false });
						isSaving = false;
					}
				};
			}}
		>
			<div class="avatar-section">
				<div class="avatar-wrapper">
					{#if isUploading}
						<div class="avatar-placeholder loader"><Icon name="status.time" size={24} /></div>
					{:else if avatarPreview}
						<img src={avatarPreview} alt="Avatar preview" class="avatar-img" />
					{:else}
						<div class="avatar-placeholder">
							{(data.profile.username || '?').charAt(0).toUpperCase()}
						</div>
					{/if}
					<button
						type="button"
						class="change-avatar-btn"
						onclick={() => fileInput.click()}
						disabled={isUploading}
					>
						<span class="btn-icon"><Icon name="media.camera" size={14} /></span>
						<span class="btn-text">Changer</span>
					</button>
				</div>

				<input
					type="file"
					accept="image/png, image/jpeg, image/webp"
					bind:this={fileInput}
					onchange={handleFileChange}
					style="display: none;"
				/>
				<input type="hidden" name="avatarUrl" value={finalAvatarUrl || ''} />
			</div>

			<div class="input-group">
				<label for="username">Nom d'utilisateur (Pseudo)</label>
				<input
					id="username"
					type="text"
					value={data.profile.username}
					disabled
					class="disabled-input"
				/>
				<span class="field-hint" style="font-size: 0.8rem; color: #71717a; margin-top: 4px;">
					Pour modifier votre pseudo, rendez-vous dans <a
						href={resolve('/parametres?tab=general')}
						style="color: #2563eb; text-decoration: underline;">Paramètres &gt; Général</a
					>.
				</span>
			</div>

			<div class="input-group">
				<label for="name">Nom complet</label>
				<input id="name" name="name" type="text" value={data.profile.name} />
			</div>

			<div class="input-group">
				<div class="label-row">
					<label for="bio">Bio</label>
					<label class="toggle-label">
						<input type="checkbox" name="show_bio" checked={data.profile.visibility.bio} />
						Afficher
					</label>
				</div>
				<textarea id="bio" name="bio" rows="3">{data.profile.bio}</textarea>
			</div>

			<div class="input-group">
				<div class="label-row">
					<label for="contactEmail">Email de contact (Public)</label>
					<label class="toggle-label">
						<input
							type="checkbox"
							name="show_contactEmail"
							checked={data.profile.visibility.contactEmail}
						/>
						Afficher
					</label>
				</div>
				<input
					id="contactEmail"
					name="contactEmail"
					type="text"
					placeholder="contact@mondomaine.com"
					value={data.profile.contactEmail}
				/>
			</div>

			<div class="input-group">
				<div class="label-row">
					<label for="site">Site web</label>
					<label class="toggle-label">
						<input type="checkbox" name="show_site" checked={data.profile.visibility.site} />
						Afficher
					</label>
				</div>
				<input
					id="site"
					name="site"
					type="text"
					placeholder="https://..."
					value={data.profile.site}
				/>
			</div>

			<div class="input-group row-group">
				<div class="half-group">
					<div class="label-row">
						<label for="age">Âge</label>
						<label class="toggle-label">
							<input type="checkbox" name="show_age" checked={data.profile.visibility.age} />
							<Icon name="status.visibility" size={14} />
						</label>
					</div>
					<input id="age" name="age" type="text" value={data.profile.age} />
				</div>

				<div class="half-group">
					<div class="label-row">
						<label for="genre">Pronom(s)</label>
						<label class="toggle-label">
							<input type="checkbox" name="show_genre" checked={data.profile.visibility.genre} />
							<Icon name="status.visibility" size={14} />
						</label>
					</div>
					<input id="genre" name="genre" type="text" placeholder="" value={data.profile.genre} />
				</div>
			</div>

			<div class="info-text">
				<p>Inscrit le : {formatFullDate(data.profile.createdAt)}</p>
			</div>
		</form>
	</main>
</div>

<style>
	.edit-profile-page {
		width: 100%;
		max-width: var(--max-content-width, 600px);
		margin: 0 auto;
		background: var(--bg-surface, #ffffff);
		flex: 1;
		/* Espace pour éviter que le clavier ou la barre iOS ne cache le bas du formulaire */
		padding-bottom: calc(env(safe-area-inset-bottom) + 80px);
	}

	.header-save-btn {
		background: transparent;
		color: var(--primary, #0ea5e9);
		border: none;
		font-size: 1rem;
		font-weight: bold;
		cursor: pointer;
		padding: 4px 8px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 28px;
	}
	.header-save-btn:hover:not(:disabled) {
		text-decoration: underline;
	}
	.header-save-btn:disabled {
		opacity: 0.5;
		cursor: wait;
	}

	/* === AVATAR === */
	.avatar-section {
		display: flex;
		justify-content: center;
		margin-bottom: 16px;
	}
	.avatar-wrapper {
		position: relative;
		width: 100px;
		height: 100px;
		border-radius: 50%;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}
	.avatar-img,
	.avatar-placeholder {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		object-fit: cover;
		border: 2px solid var(--border-color, #eaeaea);
		background: var(--bg-default, #f0f0f0);
	}
	.avatar-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 2.5rem;
		font-weight: bold;
		color: var(--text-muted, #666);
	}
	.change-avatar-btn {
		position: absolute;
		bottom: -10px;
		left: 50%;
		transform: translateX(-50%);
		background: var(--text-default, #1a1a1a);
		color: var(--bg-surface, #ffffff);
		border: none;
		border-radius: 20px;
		padding: 4px 12px;
		font-size: 0.75rem;
		font-weight: bold;
		cursor: pointer;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
		white-space: nowrap;
		transition: background 0.2s;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		line-height: 1;
	}
	.change-avatar-btn .btn-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
	}
	.change-avatar-btn .btn-text {
		display: inline-flex;
		align-items: center;
		line-height: 1;
	}
	.change-avatar-btn:hover:not(:disabled) {
		opacity: 0.8;
	}
	.change-avatar-btn:disabled {
		opacity: 0.5;
		cursor: wait;
	}
	.loader {
		font-size: 2rem;
		animation: pulse 1.5s infinite;
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

	/* === FORMULAIRE === */
	.form-container {
		padding: 24px 16px;
	}

	/* Couleurs sémantiques gardées en dur car elles ne dépendent pas du thème principal */
	.success-banner {
		background: #dcfce7;
		color: #166534;
		padding: 12px;
		border-radius: 8px;
		text-align: center;
		font-weight: bold;
		margin-bottom: 24px;
		border: 1px solid #bbf7d0;
	}
	.error-banner {
		background: #fee2e2;
		color: #dc2626;
		padding: 12px;
		border-radius: 8px;
		text-align: center;
		font-weight: bold;
		margin-bottom: 24px;
		border: 1px solid #fecaca;
	}

	.edit-form {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.input-group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.input-group label {
		font-weight: bold;
		font-size: 0.9rem;
		color: var(--text-default, #1a1a1a);
	}

	.input-group input,
	.input-group textarea {
		width: 100%; /* Important pour le mobile */
		min-width: 0;
		padding: 12px;
		border: 1px solid var(--border-color, #ccc);
		border-radius: 8px;
		font-size: 1rem;
		font-family: inherit;
		background: var(--bg-surface, #ffffff);
		color: var(--text-default, #1a1a1a);
		resize: vertical;
	}

	.input-group input:focus,
	.input-group textarea:focus {
		outline: none;
		border-color: var(--primary, #0ea5e9);
	}

	.disabled-input {
		background: var(--bg-default, #f9fafb) !important;
		color: var(--text-muted, #9ca3af) !important;
		border-color: var(--border-color, #eaeaea) !important;
	}

	.label-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.toggle-label {
		display: flex;
		align-items: center;
		gap: 6px;
		font-weight: normal !important;
		font-size: 0.75rem !important;
		color: var(--text-muted, #666) !important;
		cursor: pointer;
		/* Sécurité tactile pour ne pas cliquer à côté */
		padding: 4px;
		margin: -4px;
	}
	.toggle-label input[type='checkbox'] {
		margin: 0;
		width: auto;
		cursor: pointer;
		accent-color: var(--primary, #0ea5e9);
	}

	/* Gestion intelligente de la rangée Âge/Genre */
	.row-group {
		display: flex;
		flex-direction: row;
		gap: 16px;
		/* Sur les écrans minuscules (< 320px), permet de passer à la ligne */
		flex-wrap: wrap;
	}
	.half-group {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 8px;
		min-width: 120px; /* Si l'écran est trop petit, ça force le flex-wrap */
	}

	.info-text {
		font-size: 0.85rem;
		color: var(--text-muted, #888);
		text-align: center;
		margin-top: 8px;
	}
</style>
