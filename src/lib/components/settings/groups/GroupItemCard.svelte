<!--
  @component GroupItemCard
  @domain settings/groups
  @description Carte d'affichage d'un groupe utilisateur avec mode édition inline et suppression.
  @responsibilities
    - Afficher le badge coloré, le nom et le compte de membres du groupe
    - Proposer la modification inline (nom, couleur, icône)
    - Gérer la suppression sécurisée du groupe avec confirmation
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { untrack } from 'svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconId } from '$lib/icons/types';
	import type { UserGroup } from '$lib/types';

	/**
	 * Propriétés du composant GroupItemCard
	 */
	interface Props {
		/** Groupe d'utilisateurs à afficher */
		group: UserGroup;
		/** La carte est-elle en cours d'édition ? */
		isEditing: boolean;
		/** Callback pour activer le mode édition */
		onStartEdit: () => void;
		/** Callback pour annuler le mode édition */
		onCancelEdit: () => void;
	}

	let { group, isEditing, onStartEdit, onCancelEdit }: Props = $props();

	const GROUP_ICON_OPTIONS: { id: IconId | ''; label: string }[] = [
		{ id: '', label: 'Aucune' },
		{ id: 'status.users', label: 'Groupe' },
		{ id: 'action.like', label: 'Cœur' },
		{ id: 'status.lock', label: 'Privé' },
		{ id: 'status.visibility', label: 'Vue' },
		{ id: 'action.message', label: 'Message' },
		{ id: 'status.tag', label: 'Tag' },
		{ id: 'status.palette', label: 'Palette' },
		{ id: 'media.camera', label: 'Photo' },
		{ id: 'media.video', label: 'Vidéo' },
		{ id: 'nav.feed', label: 'Maison' },
		{ id: 'nav.explore', label: 'Boussole' },
		{ id: 'nav.notifications', label: 'Cloche' },
		{ id: 'action.check', label: 'Check' }
	];

	let isSubmitting = $state(false);
	let editName = $state(untrack(() => group.name));
	let editColor = $state(untrack(() => group.color || '#10b981'));
	let editIcon = $state<IconId | ''>(
		untrack(() => (group.icon && group.icon !== 'star' ? (group.icon as IconId) : ''))
	);

	$effect(() => {
		editName = group.name;
		editColor = group.color || '#10b981';
		editIcon = group.icon && group.icon !== 'star' ? (group.icon as IconId) : '';
	});
</script>

<div class="group-card">
	{#if isEditing}
		<!-- FORMULAIRE DE MODIFICATION -->
		<form
			method="POST"
			action="?/updateGroup"
			class="edit-group-form"
			use:enhance={() => {
				isSubmitting = true;
				return async ({ result, update }) => {
					isSubmitting = false;
					if (result.type === 'success') {
						onCancelEdit();
					}
					await update({ reset: false });
				};
			}}
		>
			<input type="hidden" name="groupId" value={group.id} />
			<input type="hidden" name="icon" value={editIcon} />

			<div class="form-row">
				<label for="edit_group_name_{group.id}" class="label-text">Nom</label>
				<input
					id="edit_group_name_{group.id}"
					type="text"
					name="name"
					bind:value={editName}
					required
					maxlength="50"
				/>
			</div>

			<div class="form-row">
				<label class="color-picker-label">
					<span class="label-text">Couleur</span>
					<div class="color-input-wrapper">
						<input type="color" name="color" bind:value={editColor} class="color-input" />
						<span class="color-hex">{editColor.toUpperCase()}</span>
					</div>
				</label>
			</div>

			<div class="form-row">
				<span class="label-text">Icône du groupe</span>
				<div class="icon-selector-grid">
					{#each GROUP_ICON_OPTIONS as opt (opt.id)}
						<button
							type="button"
							class="icon-option-btn"
							class:active={editIcon === opt.id}
							onclick={() => (editIcon = opt.id)}
							title={opt.label}
						>
							{#if opt.id}
								<Icon name={opt.id} size={18} />
							{:else}
								<span class="no-icon-label">∅</span>
							{/if}
							<span class="opt-name">{opt.label}</span>
						</button>
					{/each}
				</div>
			</div>

			<div class="edit-actions">
				<button type="submit" class="btn-save-edit" disabled={isSubmitting || !editName.trim()}>
					Enregistrer
				</button>
				<button type="button" class="btn-cancel-edit" onclick={onCancelEdit}> Annuler </button>
			</div>
		</form>
	{:else}
		<!-- VUE CARTE -->
		<div class="group-info">
			<div class="group-badge" style="background-color: {group.color}20; color: {group.color};">
				{#if group.icon && group.icon !== 'star'}
					<Icon name={group.icon as IconId} size={22} color={group.color} />
				{:else}
					{group.name.charAt(0).toUpperCase()}
				{/if}
			</div>
			<div class="group-text">
				<span class="group-name">{group.name}</span>
				<span class="group-members">
					{group.membersCount} membre{group.membersCount > 1 ? 's' : ''}
				</span>
			</div>
		</div>

		<div class="group-actions">
			<button
				type="button"
				class="btn-edit"
				onclick={onStartEdit}
				title="Modifier le groupe"
				aria-label="Modifier le groupe"
			>
				<Icon name="action.edit" size={14} />
			</button>

			<form
				method="POST"
				action="?/deleteGroup"
				use:enhance={() => {
					return async ({ update }) => {
						await update();
					};
				}}
			>
				<input type="hidden" name="groupId" value={group.id} />
				<button
					type="submit"
					class="btn-delete"
					onclick={(e) => {
						if (
							!confirm(`Supprimer le groupe "${group.name}" ? Les posts liés redeviendront privés.`)
						)
							e.preventDefault();
					}}
					title="Supprimer le groupe"
					aria-label="Supprimer le groupe"
				>
					<Icon name="action.close" size={14} />
				</button>
			</form>
		</div>
	{/if}
</div>

<style>
	.group-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px;
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
	}
	.group-info {
		display: flex;
		align-items: center;
		gap: 16px;
	}
	.group-badge {
		width: 48px;
		height: 48px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.5rem;
		font-weight: bold;
		flex-shrink: 0;
	}
	.group-text {
		display: flex;
		flex-direction: column;
	}
	.group-name {
		font-weight: bold;
		font-size: 1.1rem;
		color: #1e293b;
	}
	.group-members {
		font-size: 0.85rem;
		color: #64748b;
	}
	.group-actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.btn-edit {
		background: #f1f5f9;
		color: #475569;
		border: none;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s;
	}
	.btn-edit:hover {
		background: #e2e8f0;
		color: #0ea5e9;
	}
	.btn-delete {
		background: #fee2e2;
		color: #ef4444;
		border: none;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s;
	}
	.btn-delete:hover {
		background: #fca5a5;
		color: white;
		transform: scale(1.05);
	}
	.edit-group-form {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.form-row {
		margin-bottom: 12px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.label-text {
		font-weight: 600;
		font-size: 0.9rem;
		color: #475569;
	}
	input[type='text'] {
		width: 100%;
		padding: 10px 14px;
		border: 1px solid #cbd5e1;
		border-radius: 10px;
		font-size: 0.95rem;
		outline: none;
		box-sizing: border-box;
	}
	input[type='text']:focus {
		border-color: #0ea5e9;
	}
	.color-picker-label {
		display: flex;
		flex-direction: column;
		gap: 8px;
		cursor: pointer;
	}
	.color-input-wrapper {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 6px 10px;
		background: white;
		border: 1px solid #cbd5e1;
		border-radius: 10px;
		width: fit-content;
	}
	.color-input {
		-webkit-appearance: none;
		-moz-appearance: none;
		appearance: none;
		width: 28px;
		height: 28px;
		background-color: transparent;
		border: none;
		cursor: pointer;
		padding: 0;
	}
	.color-hex {
		font-family: monospace;
		color: #64748b;
		font-size: 0.9rem;
	}
	.icon-selector-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(68px, 1fr));
		gap: 6px;
		margin-top: 4px;
	}
	.icon-option-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 4px;
		padding: 6px 4px;
		background: white;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		cursor: pointer;
		color: #475569;
		transition: all 0.15s ease;
		font-family: inherit;
	}
	.icon-option-btn:hover {
		background: #f1f5f9;
		border-color: #94a3b8;
	}
	.icon-option-btn.active {
		background: #f0f9ff;
		border-color: #0ea5e9;
		color: #0284c7;
		font-weight: 600;
	}
	.no-icon-label {
		font-size: 1.1rem;
		line-height: 1;
		color: #94a3b8;
	}
	.opt-name {
		font-size: 0.72rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 100%;
	}
	.edit-actions {
		display: flex;
		gap: 8px;
		margin-top: 4px;
	}
	.btn-save-edit {
		padding: 8px 16px;
		background: #0ea5e9;
		color: white;
		border: none;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
	}
	.btn-save-edit:hover:not(:disabled) {
		background: #0284c7;
	}
	.btn-save-edit:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.btn-cancel-edit {
		padding: 8px 16px;
		background: #f1f5f9;
		color: #475569;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
	}
	.btn-cancel-edit:hover {
		background: #e2e8f0;
	}
</style>
