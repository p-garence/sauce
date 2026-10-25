<!--
  @component StorySettingsDrawer
  @domain stories
  @description Tiroir modal permettant à l'auteur de modifier la visibilité (publique, abonnés, privé, groupe), le délai d'expiration et la conservation en archives d'une story.
  @responsibilities
    - Sélectionner la portée de visibilité et les groupes associés
    - Afficher l'état d'expiration restant en temps réel
    - Configurer la durée avant expiration (24h, 48h, personnalisé, jamais)
    - Basculer l'archivage automatique après expiration
    - Valider et soumettre les modifications
-->
<script lang="ts">
	import type { StoryItem, PostVisibility, UserGroup } from '$lib/types';
	import Icon from '$lib/components/ui/Icon.svelte';

	interface Props {
		isOpen: boolean;
		currentStory: StoryItem;
		availableGroups?: UserGroup[];
		isSaving?: boolean;
		errorMessage?: string;
		onClose: () => void;
		onSave: (settings: {
			visibility: PostVisibility;
			groupId: string | null;
			isArchived: boolean;
			duration: 'keep' | '24h' | '48h' | 'custom' | 'never';
			customHours?: number;
		}) => void;
	}

	let {
		isOpen = false,
		currentStory,
		availableGroups = [],
		isSaving = false,
		errorMessage = '',
		onClose,
		onSave
	}: Props = $props();

	let editVisibilityComposite = $state('public');
	let editIsArchived = $state(true);
	let editDuration = $state<'keep' | '24h' | '48h' | 'custom' | 'never'>('keep');
	let editCustomHours = $state(24);

	$effect(() => {
		if (isOpen && currentStory) {
			if (currentStory.visibility === 'group' && currentStory.groupId) {
				editVisibilityComposite = `group:${currentStory.groupId}`;
			} else {
				editVisibilityComposite = currentStory.visibility || 'public';
			}
			editIsArchived = currentStory.isArchived ?? true;
			editDuration = 'keep';
			editCustomHours = 24;
		}
	});

	function getStoryExpirationText(expiresAt: Date | string): string {
		const d = new Date(expiresAt);
		if (d.getFullYear() >= 3000) {
			return "N'expire pas";
		}
		const diffMs = d.getTime() - Date.now();
		if (diffMs <= 0) {
			return 'Expirée';
		}
		const hours = Math.round(diffMs / (1000 * 3600));
		if (hours <= 1) {
			const mins = Math.max(1, Math.round(diffMs / 60000));
			return `Expire dans ${mins < 60 ? `${mins} minute${mins > 1 ? 's' : ''}` : '1 heure'}`;
		}
		return `Expire dans ${hours} heures`;
	}

	function handleSave() {
		let newVis: PostVisibility;
		let newGroupId: string | null = null;

		if (editVisibilityComposite.startsWith('group:')) {
			newVis = 'group';
			newGroupId = editVisibilityComposite.split(':')[1] || null;
		} else {
			newVis = editVisibilityComposite as PostVisibility;
		}

		onSave({
			visibility: newVis,
			groupId: newGroupId,
			isArchived: editIsArchived,
			duration: editDuration,
			customHours: editDuration === 'custom' ? editCustomHours : undefined
		});
	}
</script>

{#if isOpen && currentStory}
	<div
		class="settings-drawer-backdrop"
		role="presentation"
		onclick={(e) => {
			if (e.target === e.currentTarget && !isSaving) {
				e.stopPropagation();
				onClose();
			}
		}}
	>
		<div class="settings-drawer" role="dialog" aria-modal="true" tabindex="-1">
			<header class="drawer-header">
				<h3 class="drawer-title">
					<Icon name="action.edit" size={16} color="#38bdf8" />
					Paramètres de la story
				</h3>
				<button
					type="button"
					class="btn-close-drawer"
					onclick={onClose}
					disabled={isSaving}
					aria-label="Fermer"
				>
					<Icon name="action.close" size={18} color="white" />
				</button>
			</header>

			<div class="drawer-form">
				<div class="form-field">
					<label for="story-viewer-visibility" class="form-label">
						<Icon name="status.visibility" size={16} /> Visibilité
					</label>
					<select
						id="story-viewer-visibility"
						class="drawer-select"
						bind:value={editVisibilityComposite}
						disabled={isSaving}
						onchange={(e: Event) => {
							if ((e.target as HTMLSelectElement).value === '__create_group__') {
								window.location.href = '/parametres?tab=groups';
							}
						}}
					>
						<option value="public">Public (Tout le monde)</option>
						<option value="network">Réseau (Réseau et abonnés)</option>
						<option value="followers">Abonné(e)s uniquement</option>
						<option value="private">Moi uniquement (Privé)</option>
						{#if availableGroups.length > 0}
							<optgroup label="Groupes d'utilisateurs">
								{#each availableGroups as group (group.id)}
									<option value="group:{group.id}">
										Groupe : {group.name}
									</option>
								{/each}
							</optgroup>
						{:else}
							<optgroup label="Groupes d'utilisateurs">
								<option value="__create_group__">
									Vous n'avez pas de groupes (Créer un groupe...)
								</option>
							</optgroup>
						{/if}
					</select>
					<p class="form-help">
						{#if editVisibilityComposite.startsWith('group:')}
							Visible uniquement par les membres du groupe sélectionné.
						{:else if editVisibilityComposite === 'public'}
							Accessible à l'ensemble du réseau public.
						{:else if editVisibilityComposite === 'network'}
							Visible pour votre réseau direct et abonnés.
						{:else if editVisibilityComposite === 'followers'}
							Visible uniquement par vos abonnés.
						{:else}
							Visible uniquement par vous-même.
						{/if}
					</p>
				</div>

				<div class="form-field">
					<div class="drawer-expiration-box">
						<span class="drawer-expiration-label">État d'expiration :</span>
						<strong class="drawer-expiration-value">
							<Icon name="status.time" size={14} color="#38bdf8" />
							{getStoryExpirationText(currentStory.expiresAt)}
						</strong>
					</div>
				</div>

				<div class="form-field">
					<label for="story-viewer-duration" class="form-label">
						<Icon name="status.time" size={16} /> Faire expirer dans :
					</label>
					<select
						id="story-viewer-duration"
						class="drawer-select"
						bind:value={editDuration}
						disabled={isSaving}
					>
						<option value="keep">Ne pas changer</option>
						<option value="24h">24 heures</option>
						<option value="48h">48 heures</option>
						<option value="custom">Personnalisé (heures)</option>
						<option value="never">N'expire pas</option>
					</select>

					{#if editDuration === 'custom'}
						<div class="drawer-custom-hours">
							<label for="drawer_custom_hours_input" class="custom-hours-label"
								>Durée en heures :</label
							>
							<div class="custom-hours-row">
								<input
									id="drawer_custom_hours_input"
									type="number"
									min="1"
									max="8760"
									bind:value={editCustomHours}
									disabled={isSaving}
									class="drawer-custom-hours-input"
								/>
								<span class="custom-hours-hint">
									({Math.max(1, Math.round(editCustomHours / 24))} jour{Math.round(
										editCustomHours / 24
									) > 1
										? 's'
										: ''})
								</span>
							</div>
						</div>
					{/if}
				</div>

				<div class="form-field">
					<label class="archive-toggle-card">
						<input
							type="checkbox"
							class="archive-checkbox"
							bind:checked={editIsArchived}
							disabled={isSaving}
						/>
						<div class="archive-toggle-content">
							<span class="archive-toggle-title">Conserver dans les archives</span>
							<span class="archive-toggle-desc">
								{#if editIsArchived}
									La story sera conservée dans vos archives après expiration.
								{:else}
									La story sera définitivement supprimée après expiration.
								{/if}
							</span>
						</div>
					</label>
				</div>

				{#if errorMessage}
					<div class="drawer-error-box">
						{errorMessage}
					</div>
				{/if}

				<div class="drawer-actions-row">
					<button
						type="button"
						class="btn-drawer-cancel"
						onclick={onClose}
						disabled={isSaving}
					>
						Annuler
					</button>
					<button
						type="button"
						class="btn-drawer-save"
						onclick={handleSave}
						disabled={isSaving}
					>
						{#if isSaving}
							Enregistrement...
						{:else}
							Enregistrer
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.settings-drawer-backdrop {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.7);
		z-index: 60;
		display: flex;
		align-items: flex-end;
		backdrop-filter: blur(6px);
	}

	.settings-drawer {
		background: #0f172a;
		color: #fff;
		width: 100%;
		border-radius: 20px 20px 0 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		animation: drawerSlideUp 0.22s ease-out;
		border-top: 1px solid rgba(255, 255, 255, 0.15);
		box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.5);
	}

	@keyframes drawerSlideUp {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
		}
	}

	.drawer-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 16px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.drawer-title {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 700;
		color: #fff;
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.btn-close-drawer {
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.7);
		font-size: 1.1rem;
		cursor: pointer;
		padding: 4px;
		border-radius: 6px;
	}

	.drawer-form {
		padding: 16px 18px 24px;
		display: flex;
		flex-direction: column;
		gap: 18px;
		overflow-y: auto;
		max-height: 70vh;
	}

	.form-field {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.form-label {
		font-size: 0.88rem;
		font-weight: 600;
		color: #e2e8f0;
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.drawer-select {
		width: 100%;
		padding: 10px 14px;
		border-radius: 10px;
		background: #1e293b;
		border: 1px solid rgba(255, 255, 255, 0.15);
		color: #fff;
		font-size: 0.92rem;
		outline: none;
		cursor: pointer;
	}

	.drawer-select:focus {
		border-color: #38bdf8;
	}

	.drawer-select option,
	.drawer-select optgroup {
		background: #0f172a;
		color: #fff;
	}

	.form-help {
		margin: 0;
		font-size: 0.78rem;
		color: rgba(255, 255, 255, 0.6);
		line-height: 1.4;
	}

	.drawer-expiration-box {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 14px;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 10px;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.drawer-expiration-label {
		font-size: 0.82rem;
		color: rgba(255, 255, 255, 0.65);
		font-weight: 500;
	}

	.drawer-expiration-value {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 0.88rem;
		font-weight: 600;
		color: #38bdf8;
	}

	.drawer-custom-hours {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-top: 4px;
		padding: 8px 12px;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 8px;
	}

	.custom-hours-label {
		font-size: 0.82rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.8);
	}

	.drawer-custom-hours-input {
		width: 70px;
		padding: 6px 8px;
		border-radius: 6px;
		border: 1px solid rgba(255, 255, 255, 0.2);
		background: #0f172a;
		color: #fff;
		font-size: 0.88rem;
		font-weight: 600;
		outline: none;
	}

	.drawer-custom-hours-input:focus {
		border-color: #38bdf8;
	}

	.custom-hours-hint {
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.archive-toggle-card {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.1);
		padding: 12px 14px;
		border-radius: 12px;
		cursor: pointer;
		user-select: none;
	}

	.archive-toggle-card:hover {
		background: rgba(255, 255, 255, 0.07);
	}

	.archive-checkbox {
		width: 18px;
		height: 18px;
		margin-top: 2px;
		accent-color: #0ea5e9;
		cursor: pointer;
		flex-shrink: 0;
	}

	.archive-toggle-content {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.archive-toggle-title {
		font-size: 0.9rem;
		font-weight: 600;
		color: #fff;
	}

	.archive-toggle-desc {
		font-size: 0.78rem;
		color: rgba(255, 255, 255, 0.65);
		line-height: 1.35;
	}

	.drawer-actions-row {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
		margin-top: 6px;
	}

	.btn-drawer-cancel {
		padding: 9px 16px;
		border-radius: 10px;
		border: 1px solid rgba(255, 255, 255, 0.2);
		background: transparent;
		color: #e2e8f0;
		font-size: 0.88rem;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.15s;
	}

	.btn-drawer-cancel:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.1);
	}

	.btn-drawer-save {
		padding: 9px 20px;
		border-radius: 10px;
		border: none;
		background: #0ea5e9;
		color: #fff;
		font-size: 0.88rem;
		font-weight: 600;
		cursor: pointer;
		transition:
			background 0.15s,
			opacity 0.15s;
	}

	.btn-drawer-save:hover:not(:disabled) {
		background: #0284c7;
	}

	.btn-drawer-save:disabled,
	.btn-drawer-cancel:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.drawer-error-box {
		padding: 8px 12px;
		border-radius: 8px;
		background: rgba(239, 68, 68, 0.15);
		border: 1px solid rgba(239, 68, 68, 0.3);
		color: #fca5a5;
		font-size: 0.82rem;
	}
</style>
