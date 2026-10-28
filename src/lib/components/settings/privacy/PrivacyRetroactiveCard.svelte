<!--
  @component PrivacyRetroactiveCard
  @domain settings/privacy
  @description Carte permettant de modifier en masse la visibilité de tout l'historique de publications et stories.
  @responsibilities
    - Sélectionner la visibilité cible (public, réseau, abonnés, privé, groupe)
    - Choisir les types de contenus impactés (publications, stories)
    - Afficher une modale d'alerte et de confirmation explicite
    - Exécuter la mise à jour globale via l'action serveur SvelteKit
-->
<script lang="ts">
	import SettingsCard from '$lib/components/settings/ui/SettingsCard.svelte';
	import SettingsButton from '$lib/components/settings/ui/SettingsButton.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import type { UserGroup } from '$lib/types';

	/**
	 * Propriétés du composant PrivacyRetroactiveCard
	 */
	interface Props {
		/** Liste des groupes de l'utilisateur pour le sélecteur */
		userGroups?: UserGroup[];
	}

	let { userGroups = [] }: Props = $props();

	let isPublicInstance = $derived(
		page.data.instanceSettings?.privacySettings?.isPublicInstance !== false
	);
	let selectedVisibility = $state<string>('followers');
	let updatePosts = $state(true);
	let updateStories = $state(true);
	let isConfirmModalOpen = $state(false);
	let isSubmittingBulk = $state(false);
	let bulkFormRef = $state<HTMLFormElement | undefined>();

	let selectedVisibilityLabel = $derived.by(() => {
		if (selectedVisibility === 'public') return 'Public (Tout le monde)';
		if (selectedVisibility === 'network') return 'Réseau (Réseau et abonnés)';
		if (selectedVisibility === 'followers') return 'Abonné(e)s uniquement';
		if (selectedVisibility === 'private') return 'Moi uniquement (Privé)';
		if (selectedVisibility.startsWith('group:')) {
			const gId = selectedVisibility.split(':')[1];
			const grp = userGroups.find((g) => g.id === gId);
			return grp ? `Groupe : ${grp.name}` : 'Groupe';
		}
		return selectedVisibility;
	});

	let selectedTargetsText = $derived.by(() => {
		if (updatePosts && updateStories) return 'publications et stories';
		if (updatePosts) return 'publications';
		if (updateStories) return 'stories';
		return 'contenus';
	});
</script>

<SettingsCard title="Modifier la visibilité de toutes les publications">
	<div class="bulk-panel">
		<div class="bulk-field">
			<label for="bulk-visibility" class="field-label">
				<span class="label-icon"><Icon name="status.visibility" size={16} /></span>
				<span>Nouvelle visibilité cible :</span>
			</label>
			<div class="select-container">
				<select
					id="bulk-visibility"
					class="bulk-select"
					bind:value={selectedVisibility}
					disabled={isSubmittingBulk}
					onchange={(e: Event) => {
						if ((e.target as HTMLSelectElement).value === '__create_group__') {
							window.location.href = '/parametres?tab=groups';
						}
					}}
				>
					{#if isPublicInstance}
						<option value="public">Public (Tout le monde)</option>
					{/if}
					<option value="network">Réseau (Réseau et abonnés)</option>
					<option value="followers">Abonné(e)s uniquement</option>
					<option value="private">Moi uniquement (Privé)</option>

					{#if userGroups.length > 0}
						<optgroup label="Mes Groupes">
							{#each userGroups as group (group.id)}
								<option value="group:{group.id}">
									Groupe : {group.name}
								</option>
							{/each}
						</optgroup>
					{:else}
						<optgroup label="Mes Groupes">
							<option value="__create_group__">
								Vous n'avez pas de groupes (Créer un groupe...)
							</option>
						</optgroup>
					{/if}
				</select>
			</div>
		</div>

		<div class="targets-container">
			<span class="targets-title">Contenus concernés :</span>
			<div class="targets-list">
				<label class="target-card">
					<input type="checkbox" bind:checked={updatePosts} disabled={isSubmittingBulk} />
					<span class="target-text">Toutes mes publications passées</span>
				</label>
				<label class="target-card">
					<input type="checkbox" bind:checked={updateStories} disabled={isSubmittingBulk} />
					<span class="target-text">Toutes mes stories passées</span>
				</label>
			</div>
		</div>

		<div class="submit-row">
			<SettingsButton
				type="button"
				variant="danger"
				disabled={(!updatePosts && !updateStories) || isSubmittingBulk}
				onclick={() => (isConfirmModalOpen = true)}
			>
				Modifier la visibilité de tout mon historique
			</SettingsButton>
		</div>
	</div>
</SettingsCard>

<!-- Formulaire masqué soumis après confirmation -->
<form
	bind:this={bulkFormRef}
	method="POST"
	action="?/bulkUpdateVisibility"
	use:enhance={() => {
		isSubmittingBulk = true;
		return async ({ update }) => {
			isSubmittingBulk = false;
			isConfirmModalOpen = false;
			await update();
		};
	}}
>
	<input type="hidden" name="visibility" value={selectedVisibility} />
	<input type="hidden" name="updatePosts" value={String(updatePosts)} />
	<input type="hidden" name="updateStories" value={String(updateStories)} />
</form>

<!-- Modal de confirmation claire -->
<Modal
	isOpen={isConfirmModalOpen}
	title="Confirmation de modification globale"
	onclose={() => (isConfirmModalOpen = false)}
>
	<div class="confirm-content">
		<div class="warning-alert">
			<div class="warning-icon-wrap">
				<Icon name="status.lock" size={22} />
			</div>
			<div class="warning-body">
				<strong>Attention</strong>
				<p>
					La visibilité de l'intégralité de vos
					{selectedTargetsText} passées va être modifiée.
				</p>
			</div>
		</div>

		<div class="confirm-detail">
			<span class="detail-label">Nouvelle visibilité appliquée :</span>
			<div class="detail-value">
				<Icon name="status.visibility" size={16} />
				<span>{selectedVisibilityLabel}</span>
			</div>
		</div>

		<p class="confirm-prompt">
			Confirmez-vous vouloir passer toutes vos <strong>{selectedTargetsText}</strong> en
			<em>"{selectedVisibilityLabel}"</em> ?
		</p>
	</div>

	{#snippet footer()}
		<div class="modal-footer-btns">
			<button
				type="button"
				class="btn-modal-back"
				onclick={() => (isConfirmModalOpen = false)}
				disabled={isSubmittingBulk}
			>
				Annuler
			</button>
			<button
				type="button"
				class="btn-modal-execute"
				disabled={isSubmittingBulk}
				onclick={() => {
					bulkFormRef?.requestSubmit();
				}}
			>
				{isSubmittingBulk ? 'Modification en cours...' : 'Oui, appliquer à tout mon historique'}
			</button>
		</div>
	{/snippet}
</Modal>

<style>
	.bulk-panel {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.bulk-field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.field-label {
		display: flex;
		align-items: center;
		gap: 6px;
		font-weight: 600;
		font-size: 0.95rem;
		color: #1e293b;
	}
	.label-icon {
		display: flex;
		align-items: center;
		color: #0ea5e9;
	}
	.select-container {
		position: relative;
	}
	.bulk-select {
		width: 100%;
		padding: 10px 14px;
		border-radius: 8px;
		border: 1px solid #cbd5e1;
		background: #ffffff;
		font-size: 0.95rem;
		color: #1e293b;
		cursor: pointer;
		outline: none;
		transition: border-color 0.15s ease;
	}
	.bulk-select:focus {
		border-color: #0ea5e9;
	}
	.targets-container {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.targets-title {
		font-weight: 600;
		font-size: 0.9rem;
		color: #334155;
	}
	.targets-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.target-card {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 14px;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		cursor: pointer;
		user-select: none;
	}
	.target-card:hover {
		background: #f1f5f9;
	}
	.target-card input[type='checkbox'] {
		width: 18px;
		height: 18px;
		cursor: pointer;
		accent-color: #0ea5e9;
	}
	.target-text {
		font-size: 0.9rem;
		color: #1e293b;
	}
	.submit-row {
		margin-top: 8px;
	}

	.confirm-content {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.warning-alert {
		display: flex;
		gap: 12px;
		background: #fffbeb;
		border: 1px solid #fef3c7;
		border-left: 4px solid #f59e0b;
		padding: 12px 14px;
		border-radius: 8px;
	}
	.warning-icon-wrap {
		color: #f59e0b;
		display: flex;
		align-items: flex-start;
		margin-top: 2px;
	}
	.warning-body strong {
		display: block;
		font-size: 0.95rem;
		color: #92400e;
		margin-bottom: 2px;
	}
	.warning-body p {
		margin: 0;
		font-size: 0.85rem;
		color: #b45309;
		line-height: 1.4;
	}
	.confirm-detail {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.detail-label {
		font-size: 0.8rem;
		color: #64748b;
		font-weight: 500;
	}
	.detail-value {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 1rem;
		font-weight: 700;
		color: #0ea5e9;
	}
	.confirm-prompt {
		font-size: 0.95rem;
		color: #334155;
		margin: 0;
		line-height: 1.5;
	}
	.modal-footer-btns {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
		width: 100%;
	}
	.btn-modal-back {
		padding: 8px 16px;
		border-radius: 8px;
		border: 1px solid #cbd5e1;
		background: #ffffff;
		color: #475569;
		font-weight: 600;
		font-size: 0.9rem;
		cursor: pointer;
	}
	.btn-modal-back:hover:not(:disabled) {
		background: #f8fafc;
	}
	.btn-modal-execute {
		padding: 8px 16px;
		border-radius: 8px;
		border: none;
		background: #dc2626;
		color: #ffffff;
		font-weight: 600;
		font-size: 0.9rem;
		cursor: pointer;
	}
	.btn-modal-execute:hover:not(:disabled) {
		background: #b91c1c;
	}
	.btn-modal-execute:disabled,
	.btn-modal-back:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
