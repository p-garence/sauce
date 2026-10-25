<script lang="ts">
	/**
	 * @component ChatGroupMetaCard
	 * @domain chat
	 * @description Présentation et modification des métadonnées d'un groupe de discussion (nom, description, restriction d'écriture admin-only et sourdine).
	 *
	 * @responsibilities
	 * - Afficher l'avatar, le nom, la description et les restrictions de messagerie du groupe.
	 * - Fournir le formulaire d'édition pour les administrateurs via `?/updateGroup`.
	 * - Permettre l'activation/désactivation de la sourdine des notifications via `?/toggleMute`.
	 */

	import { enhance } from '$app/forms';
	import { globalStream } from '$lib/client/globalStreamState.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	interface Props {
		/** Métadonnées du groupe */
		chat: {
			id: string;
			name: string | null;
			description: string | null;
			adminOnlyMessaging?: boolean;
		};
		/** L'utilisateur courant est-il administrateur du groupe */
		isAdmin?: boolean;
		/** Le groupe est-il actuellement en sourdine pour cet utilisateur */
		isMuted?: boolean;
	}

	let { chat, isAdmin = false, isMuted = false }: Props = $props();

	let isEditingInfos = $state(false);
	let isSubmitting = $state(false);
	let errorMessage = $state('');
</script>

<section class="info-section">
	<div class="avatar-large">
		<div class="avatar-placeholder">{(chat.name || '?').charAt(0).toUpperCase()}</div>
	</div>

	{#if isAdmin && isEditingInfos}
		<form
			method="POST"
			action="?/updateGroup"
			class="edit-group-form"
			use:enhance={() => {
				isSubmitting = true;
				errorMessage = '';
				return async ({ result, update }) => {
					isSubmitting = false;
					if (result.type === 'failure' || (result.type === 'success' && result.data?.error)) {
						errorMessage = (result.data?.error as string) || 'Erreur lors de la modification';
					} else {
						isEditingInfos = false;
					}
					await update({ reset: false });
				};
			}}
		>
			<label>
				Nom du groupe
				<input type="text" name="name" value={chat.name || ''} required disabled={isSubmitting} />
			</label>
			<label>
				Description
				<textarea name="description" rows="3" disabled={isSubmitting}
					>{chat.description || ''}</textarea
				>
			</label>

			<label class="checkbox-label">
				<input
					type="checkbox"
					name="adminOnlyMessaging"
					value="true"
					checked={chat.adminOnlyMessaging}
					disabled={isSubmitting}
				/>
				Seuls les admins peuvent envoyer des messages
			</label>

			{#if errorMessage}
				<div class="error-msg">{errorMessage}</div>
			{/if}

			<div class="form-actions">
				<button
					type="button"
					class="btn-cancel"
					onclick={() => (isEditingInfos = false)}
					disabled={isSubmitting}
				>
					Annuler
				</button>
				<button type="submit" class="btn-primary" disabled={isSubmitting}>Enregistrer</button>
			</div>
		</form>
	{:else}
		<div class="group-display">
			<h2 class="group-name">{chat.name}</h2>
			<p class="group-desc">{chat.description || 'Aucune description.'}</p>
			{#if chat.adminOnlyMessaging}
				<div class="readonly-badge">Lecture seule (Seuls les admins peuvent écrire)</div>
			{/if}

			{#if isAdmin}
				<button type="button" class="btn-edit" onclick={() => (isEditingInfos = true)}>
					<span class="icon"><Icon name="action.edit" size={16} /></span> Modifier les infos
				</button>
			{/if}
		</div>
	{/if}
</section>

<!-- SOURDINE DU GROUPE -->
<section class="mute-section">
	<form
		method="POST"
		action="?/toggleMute"
		use:enhance={() => {
			globalStream.setChatMuted(chat.id, !isMuted);
			return async ({ update }) => {
				await update();
			};
		}}
	>
		<input type="hidden" name="mute" value={isMuted ? 'false' : 'true'} />
		<button type="submit" class="mute-btn-row">
			<div class="mute-icon-box">
				<Icon name={isMuted ? 'status.mute' : 'nav.notifications'} size={20} />
			</div>
			<div class="mute-text-box">
				<span class="mute-label">
					{isMuted ? 'Sourdine activée' : 'Notifications normales'}
				</span>
				<span class="mute-sublabel">
					{isMuted
						? 'Aucune alerte pour ce groupe sauf si vous êtes mentionné (@)'
						: 'Vous recevez les alertes pour tous les messages du groupe'}
				</span>
			</div>
			<span class="mute-action-pill" class:is-muted={isMuted}>
				{isMuted ? 'Rétablir' : 'Couper'}
			</span>
		</button>
	</form>
</section>

<style>
	.info-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
		width: 100%;
		box-sizing: border-box;
	}

	.avatar-large {
		width: 100px;
		height: 100px;
		border-radius: 50%;
		overflow: hidden;
		background: #f1f5f9;
		border: 2px solid #eaeaea;
		flex-shrink: 0;
	}

	.avatar-placeholder {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 2.5rem;
		font-weight: bold;
		color: #94a3b8;
	}

	.group-display {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
	}

	.group-name {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 800;
		text-align: center;
	}

	.group-desc {
		margin: 0;
		font-size: 1rem;
		color: #64748b;
		text-align: center;
	}

	.readonly-badge {
		background: #fef08a;
		color: #854d0e;
		padding: 6px 12px;
		border-radius: 8px;
		font-size: 0.85rem;
		font-weight: bold;
		text-align: center;
	}

	.btn-edit {
		margin-top: 8px;
		background: #f1f5f9;
		color: #475569;
		border: 1px solid #cbd5e1;
		padding: 6px 14px;
		border-radius: 20px;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.btn-edit:hover {
		background: #e2e8f0;
		color: #1e293b;
	}

	.edit-group-form {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 12px;
		background: #f8fafc;
		padding: 16px;
		border-radius: 12px;
		border: 1px solid #e2e8f0;
		box-sizing: border-box;
	}

	.edit-group-form label {
		display: flex;
		flex-direction: column;
		font-size: 0.9rem;
		font-weight: 600;
		color: #475569;
		gap: 6px;
	}

	.edit-group-form input[type='text'],
	.edit-group-form textarea {
		padding: 10px 14px;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		font-size: 1rem;
		font-family: inherit;
	}

	.checkbox-label {
		display: flex;
		flex-direction: row !important;
		align-items: center;
		gap: 8px !important;
		font-weight: 500 !important;
		cursor: pointer;
		margin-top: 8px;
	}

	.checkbox-label input[type='checkbox'] {
		width: 18px;
		height: 18px;
		margin: 0;
		cursor: pointer;
	}

	.error-msg {
		color: #ef4444;
		font-size: 0.9rem;
		font-weight: 600;
		text-align: center;
	}

	.form-actions {
		display: flex;
		gap: 8px;
		margin-top: 8px;
	}

	.btn-cancel {
		flex: 1;
		background: white;
		border: 1px solid #cbd5e1;
		color: #475569;
		padding: 12px;
		border-radius: 8px;
		font-weight: bold;
		cursor: pointer;
	}

	.btn-primary {
		flex: 2;
		background: #0ea5e9;
		color: white;
		font-weight: bold;
		padding: 12px;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		transition: background 0.2s;
	}

	.btn-primary:hover {
		background: #0284c7;
	}

	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.mute-section {
		background: #f8fafc;
		border-radius: 12px;
		border: 1px solid #e2e8f0;
		overflow: hidden;
		width: 100%;
		box-sizing: border-box;
	}

	.mute-btn-row {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		padding: 12px 14px;
		background: none;
		border: none;
		text-align: left;
		cursor: pointer;
		color: inherit;
		font-family: inherit;
		transition: background 0.15s;
	}

	.mute-btn-row:hover {
		background: #f1f5f9;
	}

	.mute-icon-box {
		font-size: 1.4rem;
		line-height: 1;
		flex-shrink: 0;
	}

	.mute-text-box {
		display: flex;
		flex-direction: column;
		gap: 2px;
		flex: 1;
	}

	.mute-label {
		font-weight: 600;
		font-size: 0.95rem;
		color: #1e293b;
	}

	.mute-sublabel {
		font-size: 0.8rem;
		color: #64748b;
	}

	.mute-action-pill {
		font-size: 0.8rem;
		font-weight: 600;
		padding: 4px 10px;
		border-radius: 12px;
		background: #e2e8f0;
		color: #475569;
		flex-shrink: 0;
	}

	.mute-action-pill.is-muted {
		background: #e0f2fe;
		color: #0369a1;
	}
</style>
