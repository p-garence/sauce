<!--
  @component StoryEditModal
  @domain settings/media
  @description Modale d'édition des paramètres d'une story (visibilité, groupe ciblé, durée d'expiration, conservation en archive).
  @responsibilities
    - Permettre la modification de la visibilité et du groupe ciblé
    - Afficher l'état d'expiration restant
    - Modifier la durée d'expiration (prolongation, délai personnalisé, infinie)
    - Activer ou désactiver la conservation dans les archives après expiration
    - Enregistrer les modifications via l'API REST
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { formatBytes } from '$lib/utils/format';
	import type { UserMediaStoryItem } from '$lib/server/media';
	import type { PostVisibility, UserGroup } from '$lib/types';

	/**
	 * Propriétés du composant StoryEditModal
	 */
	interface Props {
		/** Story à modifier */
		story: UserMediaStoryItem;
		/** Groupes de l'utilisateur pour le sélecteur de groupe */
		userGroups: UserGroup[];
		/** Callback de fermeture de la modale */
		onClose: () => void;
		/** Callback appelé lors de la sauvegarde réussie */
		onSaved: (
			storyId: string,
			updated: {
				visibility: PostVisibility;
				groupId: string | null;
				isArchived: boolean;
				expiresAt?: Date;
			}
		) => void;
	}

	let {
		story,
		userGroups,
		onClose,
		onSaved
	}: Props = $props();

	let editStoryVisComposite = $state(
		untrack(() =>
			story.visibility === 'group' && story.groupId
				? `group:${story.groupId}`
				: story.visibility || 'public'
		)
	);
	let editStoryIsArchived = $state(untrack(() => story.isArchived ?? true));
	let editStoryDuration = $state<'keep' | '24h' | '48h' | 'custom' | 'never'>('keep');
	let editStoryCustomHours = $state(24);
	let isSavingStory = $state(false);
	let storyEditError = $state('');

	function formatDate(d: Date | string): string {
		const date = new Date(d);
		return date.toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

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

	async function handleSaveStoryModal() {
		if (isSavingStory) return;

		let newVis: PostVisibility;
		let newGroupId: string | null = null;

		if (editStoryVisComposite.startsWith('group:')) {
			newVis = 'group';
			newGroupId = editStoryVisComposite.split(':')[1] || null;
		} else {
			newVis = editStoryVisComposite as PostVisibility;
		}

		isSavingStory = true;
		storyEditError = '';

		try {
			const res = await fetch(`/api/stories/${story.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					visibility: newVis,
					groupId: newGroupId,
					isArchived: editStoryIsArchived,
					duration: editStoryDuration,
					customHours: editStoryDuration === 'custom' ? editStoryCustomHours : undefined
				})
			});

			const data = await res.json();
			if (res.ok && data.success) {
				const updatedExpiresAt = data.story?.expiresAt ? new Date(data.story.expiresAt) : undefined;
				onSaved(story.id, {
					visibility: newVis,
					groupId: newGroupId,
					isArchived: editStoryIsArchived,
					expiresAt: updatedExpiresAt
				});
				onClose();
			} else {
				storyEditError = data.message || 'Erreur lors de la modification';
			}
		} catch (e) {
			console.error('Erreur mise à jour story:', e);
			storyEditError = 'Erreur réseau';
		} finally {
			isSavingStory = false;
		}
	}
</script>

<div
	class="story-edit-backdrop"
	role="presentation"
	onclick={(e) => {
		if (e.target === e.currentTarget && !isSavingStory) {
			onClose();
		}
	}}
>
	<div class="story-edit-card" role="dialog" aria-modal="true" tabindex="-1">
		<header class="story-edit-header">
			<h3 class="story-edit-title">Paramètres de la story</h3>
			<button
				type="button"
				class="btn-close-modal"
				onclick={onClose}
				disabled={isSavingStory}
				aria-label="Fermer"
			>
				<Icon name="action.close" size={18} />
			</button>
		</header>

		<div class="story-edit-body">
			<div class="story-mini-summary">
				{#if story.mediaType === 'video'}
					<video
						src={story.mediaUrl}
						class="mini-thumb"
						preload="metadata"
						muted
						playsinline
					></video>
				{:else}
					<img src={story.mediaUrl} alt="Aperçu" class="mini-thumb" />
				{/if}
				<div class="mini-summary-details">
					<span class="mini-summary-caption">
						{story.caption || 'Story sans légende'}
					</span>
					<span class="mini-summary-date">
						Publiée le {formatDate(story.createdAt)} • {formatBytes(story.totalSizeBytes)}
					</span>
				</div>
			</div>

			<div class="edit-field">
				<label for="modal-story-visibility" class="field-label">Visibilité</label>
				<select
					id="modal-story-visibility"
					class="field-select"
					bind:value={editStoryVisComposite}
					disabled={isSavingStory}
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
					{#if userGroups.length > 0}
						<optgroup label="Groupes d'utilisateurs">
							{#each userGroups as group (group.id)}
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
				<p class="field-help">
					{#if editStoryVisComposite.startsWith('group:')}
						Visible uniquement par les membres du groupe sélectionné.
					{:else if editStoryVisComposite === 'public'}
						Accessible à l'ensemble du réseau.
					{:else if editStoryVisComposite === 'network'}
						Visible par votre réseau direct et abonnés.
					{:else if editStoryVisComposite === 'followers'}
						Visible uniquement par vos abonnés.
					{:else}
						Visible uniquement par vous-même.
					{/if}
				</p>
			</div>

			<div class="edit-field">
				<div class="expiration-status-box">
					<span class="expiration-status-label">État d'expiration :</span>
					<strong class="expiration-status-value">
						<Icon name="status.time" size={14} />
						{getStoryExpirationText(story.expiresAt)}
					</strong>
				</div>
			</div>

			<div class="edit-field">
				<label for="modal-story-duration" class="field-label">Faire expirer dans :</label>
				<select
					id="modal-story-duration"
					class="field-select"
					bind:value={editStoryDuration}
					disabled={isSavingStory}
				>
					<option value="keep">Ne pas changer</option>
					<option value="24h">24 heures</option>
					<option value="48h">48 heures</option>
					<option value="custom">Personnalisé (heures)</option>
					<option value="never">N'expire pas</option>
				</select>

				{#if editStoryDuration === 'custom'}
					<div class="custom-hours-row">
						<label for="modal-story-custom-hours" class="field-sublabel">Durée en heures :</label>
						<div class="custom-hours-inputs">
							<input
								id="modal-story-custom-hours"
								type="number"
								min="1"
								max="8760"
								bind:value={editStoryCustomHours}
								disabled={isSavingStory}
								class="custom-hours-field"
							/>
							<span class="custom-hours-hint">
								({Math.max(1, Math.round(editStoryCustomHours / 24))} jour{Math.round(
									editStoryCustomHours / 24
								) > 1
									? 's'
									: ''})
							</span>
						</div>
					</div>
				{/if}
			</div>

			<div class="edit-field">
				<label class="edit-toggle-card">
					<input
						type="checkbox"
						class="edit-checkbox"
						bind:checked={editStoryIsArchived}
						disabled={isSavingStory}
					/>
					<div class="edit-toggle-text">
						<span class="edit-toggle-title">Conserver dans les archives</span>
						<span class="edit-toggle-desc">
							{#if editStoryIsArchived}
								La story sera conservée dans vos archives.
							{:else}
								La story sera définitivement supprimée après son expiration.
							{/if}
						</span>
					</div>
				</label>
			</div>

			{#if storyEditError}
				<div class="edit-error-box">
					{storyEditError}
				</div>
			{/if}
		</div>

		<footer class="story-edit-footer">
			<button
				type="button"
				class="btn-modal-cancel"
				onclick={onClose}
				disabled={isSavingStory}
			>
				Annuler
			</button>
			<button
				type="button"
				class="btn-modal-save"
				onclick={handleSaveStoryModal}
				disabled={isSavingStory}
			>
				{#if isSavingStory}
					Enregistrement...
				{:else}
					Enregistrer
				{/if}
			</button>
		</footer>
	</div>
</div>

<style>
	.story-edit-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: var(--z-modal, 9999);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px;
		backdrop-filter: blur(4px);
	}

	.story-edit-card {
		background: #ffffff;
		border-radius: 14px;
		max-width: 480px;
		width: 100%;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
		overflow: hidden;
		animation: modalFadeIn 0.18s ease-out;
		display: flex;
		flex-direction: column;
	}

	@keyframes modalFadeIn {
		from {
			opacity: 0;
			transform: scale(0.96);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.story-edit-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		border-bottom: 1px solid #e5e7eb;
	}

	.story-edit-title {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 600;
		color: #111827;
	}

	.btn-close-modal {
		background: none;
		border: none;
		cursor: pointer;
		color: #6b7280;
		padding: 4px;
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.btn-close-modal:hover {
		color: #111827;
		background: #f3f4f6;
	}

	.story-edit-body {
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	.story-mini-summary {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 12px;
		background: #f8fafc;
		border-radius: 10px;
		border: 1px solid #e2e8f0;
	}

	.mini-thumb {
		width: 40px;
		height: 52px;
		border-radius: 6px;
		object-fit: cover;
		background: #000;
		flex-shrink: 0;
	}

	.mini-summary-details {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.mini-summary-caption {
		font-size: 0.85rem;
		font-weight: 500;
		color: #1e293b;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.mini-summary-date {
		font-size: 0.75rem;
		color: #64748b;
	}

	.edit-field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.field-label {
		font-size: 0.85rem;
		font-weight: 600;
		color: #374151;
	}

	.field-select {
		padding: 9px 12px;
		border-radius: 8px;
		border: 1px solid #d1d5db;
		background: #ffffff;
		font-size: 0.9rem;
		color: #1f2937;
		outline: none;
		cursor: pointer;
	}

	.field-select:focus {
		border-color: #0ea5e9;
		box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.2);
	}

	.field-help {
		margin: 0;
		font-size: 0.78rem;
		color: #6b7280;
		line-height: 1.35;
	}

	.expiration-status-box {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 9px 12px;
		background: #f8fafc;
		border-radius: 8px;
		border: 1px solid #e2e8f0;
	}

	.expiration-status-label {
		font-size: 0.82rem;
		color: #64748b;
		font-weight: 500;
	}

	.expiration-status-value {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 0.86rem;
		font-weight: 600;
		color: #0369a1;
	}

	.custom-hours-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-top: 4px;
		padding: 8px 12px;
		background: #f1f5f9;
		border-radius: 8px;
	}

	.field-sublabel {
		font-size: 0.82rem;
		font-weight: 500;
		color: #475569;
	}

	.custom-hours-inputs {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.custom-hours-field {
		width: 70px;
		padding: 5px 8px;
		border-radius: 6px;
		border: 1px solid #cbd5e1;
		font-size: 0.85rem;
		font-weight: 600;
		color: #1e293b;
		outline: none;
		background: #ffffff;
	}

	.custom-hours-field:focus {
		border-color: #0ea5e9;
	}

	.custom-hours-hint {
		font-size: 0.78rem;
		color: #64748b;
	}

	.edit-toggle-card {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 10px;
		padding: 12px;
		cursor: pointer;
		user-select: none;
	}

	.edit-toggle-card:hover {
		background: #f3f4f6;
	}

	.edit-checkbox {
		width: 18px;
		height: 18px;
		margin-top: 2px;
		accent-color: #0ea5e9;
		cursor: pointer;
		flex-shrink: 0;
	}

	.edit-toggle-text {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.edit-toggle-title {
		font-size: 0.88rem;
		font-weight: 600;
		color: #1f2937;
	}

	.edit-toggle-desc {
		font-size: 0.78rem;
		color: #6b7280;
		line-height: 1.35;
	}

	.edit-error-box {
		padding: 8px 12px;
		border-radius: 6px;
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #b91c1c;
		font-size: 0.82rem;
	}

	.story-edit-footer {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
		padding: 14px 20px;
		border-top: 1px solid #e5e7eb;
		background: #fafafa;
	}

	.btn-modal-cancel {
		padding: 8px 16px;
		border-radius: 8px;
		border: 1px solid #d1d5db;
		background: #ffffff;
		color: #374151;
		font-size: 0.85rem;
		font-weight: 500;
		cursor: pointer;
	}

	.btn-modal-cancel:hover:not(:disabled) {
		background: #f3f4f6;
	}

	.btn-modal-save {
		padding: 8px 18px;
		border-radius: 8px;
		border: none;
		background: #0ea5e9;
		color: #ffffff;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s;
	}

	.btn-modal-save:hover:not(:disabled) {
		background: #0284c7;
	}

	.btn-modal-save:disabled,
	.btn-modal-cancel:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
