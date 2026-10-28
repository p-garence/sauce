<!--
  @component AdminPrivacySettings
  @domain admin
  @description Gestion des paramètres de confidentialité, du mode d'instance (Public vs Privé) et des règles d'inscription.
  @responsibilities
    - Permettre la bascule du statut de l'instance avec confirmation explicite.
    - Configurer la visibilité par défaut des publications et stories.
    - Configurer les politiques d'inscription et de confidentialité par défaut des profils.
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { InstancePrivacySettings } from '$lib/types';
	import AdminConfirmModal from './AdminConfirmModal.svelte';

	interface Props {
		/** Paramètres de confidentialité actuels de l'instance */
		privacySettings: InstancePrivacySettings;
	}

	let { privacySettings }: Props = $props();

	let showConfirmModal = $state(false);
	let targetMode = $state<'public' | 'private'>('public');
	let isToggling = $state(false);
	let isSaving = $state(false);

	let isPublic = $derived(privacySettings.isPublicInstance);
	// svelte-ignore state_referenced_locally
	let defaultPostVisibility = $state(privacySettings.defaultPostVisibility);
	// svelte-ignore state_referenced_locally
	let defaultStoryVisibility = $state(privacySettings.defaultStoryVisibility);
	// svelte-ignore state_referenced_locally
	let defaultRequireFollowRequest = $state(privacySettings.defaultRequireFollowRequest ?? false);
	// svelte-ignore state_referenced_locally
	let defaultRequireMessageApproval = $state(
		privacySettings.defaultRequireMessageApproval ?? false
	);
	// svelte-ignore state_referenced_locally
	let defaultShowFollowers = $state(privacySettings.defaultShowFollowers ?? true);
	// svelte-ignore state_referenced_locally
	let defaultShowFollowing = $state(privacySettings.defaultShowFollowing ?? true);

	$effect(() => {
		defaultPostVisibility = privacySettings.defaultPostVisibility;
		defaultStoryVisibility = privacySettings.defaultStoryVisibility;
		defaultRequireFollowRequest = privacySettings.defaultRequireFollowRequest ?? false;
		defaultRequireMessageApproval = privacySettings.defaultRequireMessageApproval ?? false;
		defaultShowFollowers = privacySettings.defaultShowFollowers ?? true;
		defaultShowFollowing = privacySettings.defaultShowFollowing ?? true;
	});

	function openToggleModal() {
		targetMode = isPublic ? 'private' : 'public';
		showConfirmModal = true;
	}

	function closeToggleModal() {
		showConfirmModal = false;
	}
</script>

<div class="settings-card">
	<div class="card-header">
		<h2 class="card-title">Statut global de l'instance</h2>
		<p class="card-description">
			Définit si l'instance est ouverte à la consultation publique ou strictement réservée aux
			membres connectés.
		</p>
	</div>

	<div class="status-banner" class:status-private={!isPublic} class:status-public={isPublic}>
		<div class="status-info">
			<span class="status-indicator"></span>
			<div>
				<strong>Mode actuel : {isPublic ? 'Public' : 'Privé'}</strong>
				<p class="status-hint">
					{isPublic
						? 'Les visiteurs non connectés peuvent consulter les publications publiques.'
						: "Seuls les membres connectés peuvent accéder à l'application. Les visiteurs sont redirigés vers la connexion."}
				</p>
			</div>
		</div>

		<button type="button" class="btn-toggle-status" onclick={openToggleModal}>
			{isPublic ? 'Passer en mode Privé' : 'Passer en mode Public'}
		</button>
	</div>
</div>

<div class="settings-card">
	<div class="card-header">
		<h2 class="card-title">Politiques de visibilité et confidentialité par défaut</h2>
		<p class="card-description">
			Configurez les valeurs présélectionnées pour les nouveaux comptes, nouvelles publications et
			interactions.
		</p>
	</div>

	<form
		method="POST"
		action="?/savePrivacy"
		use:enhance={() => {
			isSaving = true;
			return async ({ update }) => {
				await update({ reset: false });
				isSaving = false;
			};
		}}
		class="settings-form"
	>
		<div class="form-grid">
			<div class="form-group">
				<label for="defaultPostVisibility" class="form-label">
					Visibilité par défaut des publications
				</label>
				<select
					id="defaultPostVisibility"
					name="defaultPostVisibility"
					class="form-select"
					bind:value={defaultPostVisibility}
				>
					{#if isPublic}
						<option value="public">Public</option>
					{/if}
					<option value="network">Réseau (Membres de l'instance)</option>
					<option value="followers">Abonné(e)s</option>
					<option value="private">Moi uniquement</option>
				</select>
				<span class="field-hint">
					{isPublic
						? 'Présélectionné lors de la rédaction d’un post.'
						: 'En mode privé, la visibilité publique n’est pas disponible pour les nouveaux posts.'}
				</span>
			</div>

			<div class="form-group">
				<label for="defaultStoryVisibility" class="form-label">
					Visibilité par défaut des stories
				</label>
				<select
					id="defaultStoryVisibility"
					name="defaultStoryVisibility"
					class="form-select"
					bind:value={defaultStoryVisibility}
				>
					{#if isPublic}
						<option value="public">Public</option>
					{/if}
					<option value="network">Réseau (Membres de l'instance)</option>
					<option value="followers">Abonné(e)s</option>
					<option value="private">Moi uniquement</option>
				</select>
				<span class="field-hint">Présélectionné lors de la création d'une nouvelle story.</span>
			</div>
		</div>

		<div class="sub-section">
			<h3 class="sub-section-title">Confidentialité des profils et interactions par défaut</h3>
			<p class="sub-section-desc">
				Préférences initiales configurées pour chaque nouvel arrivant lors de son inscription.
				Chaque membre conserve la liberté d'ajuster ses propres paramètres ensuite.
			</p>

			<div class="checkboxes-section">
				<label class="checkbox-label">
					<input
						type="checkbox"
						name="defaultRequireFollowRequest"
						bind:checked={defaultRequireFollowRequest}
					/>
					<div class="checkbox-text">
						<strong>Approbation des abonnés par défaut</strong>
						<span>Exige que l'utilisateur valide manuellement chaque demande d'abonnement.</span>
					</div>
				</label>

				<label class="checkbox-label">
					<input
						type="checkbox"
						name="defaultRequireMessageApproval"
						bind:checked={defaultRequireMessageApproval}
					/>
					<div class="checkbox-text">
						<strong>Approbation des messages par défaut</strong>
						<span
							>Nécessite d'approuver une demande de contact avant de recevoir des messages privés de
							non-abonnés.</span
						>
					</div>
				</label>

				<label class="checkbox-label">
					<input type="checkbox" name="defaultShowFollowers" bind:checked={defaultShowFollowers} />
					<div class="checkbox-text">
						<strong>Afficher la liste des abonnés par défaut</strong>
						<span>La liste des abonnés du membre est visible sur son profil public.</span>
					</div>
				</label>

				<label class="checkbox-label">
					<input type="checkbox" name="defaultShowFollowing" bind:checked={defaultShowFollowing} />
					<div class="checkbox-text">
						<strong>Afficher la liste des abonnements par défaut</strong>
						<span>La liste des abonnements du membre est visible sur son profil public.</span>
					</div>
				</label>
			</div>
		</div>

		<div class="policy-note">
			<strong>Règle du réseau (Parrainage exclusif)</strong>
			<p>
				Les inscriptions libres sont désactivées sur l'instance. Chaque nouvel arrivant doit
				obligatoirement être invité via une clé de parrainage générée par un membre existant.
			</p>
		</div>

		<div class="form-actions">
			<button type="submit" class="btn-save" disabled={isSaving}>
				{isSaving ? 'Enregistrement...' : 'Enregistrer les paramètres de confidentialité'}
			</button>
		</div>
	</form>
</div>

<!-- Formulaire caché déclenché après confirmation de la modale -->
<form
	id="toggleInstanceModeForm"
	method="POST"
	action="?/toggleInstanceMode"
	use:enhance={() => {
		isToggling = true;
		return async ({ update }) => {
			await update();
			isToggling = false;
			showConfirmModal = false;
		};
	}}
	style="display: none;"
>
	<input type="hidden" name="isPublic" value={targetMode === 'public' ? 'true' : 'false'} />
</form>

<AdminConfirmModal
	isOpen={showConfirmModal}
	targetStatus={targetMode}
	loading={isToggling}
	onConfirm={() => {
		const formEl = document.getElementById('toggleInstanceModeForm') as HTMLFormElement;
		formEl?.requestSubmit();
	}}
	onCancel={closeToggleModal}
/>

<style>
	.settings-card {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		padding: 24px;
		margin-bottom: 24px;
	}

	.card-header {
		margin-bottom: 20px;
	}

	.card-title {
		font-size: 1.15rem;
		font-weight: 700;
		color: #0f172a;
		margin: 0 0 6px 0;
	}

	.card-description {
		font-size: 0.9rem;
		color: #64748b;
		margin: 0;
	}

	.status-banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		border-radius: 8px;
		border: 1px solid transparent;
		gap: 16px;
	}

	.status-public {
		background: #f0fdf4;
		border-color: #bbf7d0;
	}

	.status-public .status-indicator {
		background: #16a34a;
	}

	.status-private {
		background: #fffbeb;
		border-color: #fde68a;
	}

	.status-private .status-indicator {
		background: #d97706;
	}

	.status-info {
		display: flex;
		align-items: flex-start;
		gap: 12px;
	}

	.status-indicator {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		margin-top: 4px;
		flex-shrink: 0;
	}

	.status-info strong {
		color: #0f172a;
		font-size: 0.95rem;
	}

	.status-hint {
		margin: 4px 0 0 0;
		font-size: 0.88rem;
		color: #475569;
	}

	.btn-toggle-status {
		padding: 8px 16px;
		border-radius: 6px;
		border: 1px solid #cbd5e1;
		background: #ffffff;
		color: #0f172a;
		font-weight: 600;
		font-size: 0.88rem;
		cursor: pointer;
		white-space: nowrap;
	}

	.btn-toggle-status:hover {
		background: #f1f5f9;
	}

	.settings-form {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.form-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 20px;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.form-label {
		font-size: 0.88rem;
		font-weight: 600;
		color: #1e293b;
	}

	.form-select {
		padding: 8px 12px;
		border: 1px solid #cbd5e1;
		border-radius: 6px;
		font-size: 0.9rem;
		color: #0f172a;
		background: #ffffff;
		outline: none;
	}

	.form-select:focus {
		border-color: #0284c7;
	}

	.field-hint {
		font-size: 0.8rem;
		color: #64748b;
	}

	.sub-section {
		border-top: 1px solid #e2e8f0;
		padding-top: 20px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.sub-section-title {
		font-size: 1.02rem;
		font-weight: 600;
		color: #0f172a;
		margin: 0;
	}

	.sub-section-desc {
		font-size: 0.85rem;
		color: #64748b;
		margin: 0;
	}

	.checkboxes-section {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.checkbox-label {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		cursor: pointer;
	}

	.checkbox-label input[type='checkbox'] {
		margin-top: 3px;
		cursor: pointer;
		width: 16px;
		height: 16px;
	}

	.checkbox-text {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.checkbox-text strong {
		font-size: 0.9rem;
		color: #0f172a;
	}

	.checkbox-text span {
		font-size: 0.82rem;
		color: #64748b;
	}

	.policy-note {
		padding: 14px 16px;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.policy-note strong {
		font-size: 0.9rem;
		color: #0f172a;
	}

	.policy-note p {
		margin: 0;
		font-size: 0.84rem;
		color: #64748b;
		line-height: 1.4;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		padding-top: 10px;
	}

	.btn-save {
		padding: 9px 20px;
		border-radius: 6px;
		border: none;
		background: #0284c7;
		color: #ffffff;
		font-weight: 600;
		font-size: 0.9rem;
		cursor: pointer;
	}

	.btn-save:hover:not(:disabled) {
		background: #0369a1;
	}

	.btn-save:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
