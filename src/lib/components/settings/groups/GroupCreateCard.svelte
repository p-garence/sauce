<!--
  @component GroupCreateCard
  @domain settings/groups
  @description Carte et formulaire de création d'un nouveau groupe de visibilité.
  @responsibilities
    - Saisir le nom du groupe
    - Choisir la couleur représentative via une palette
    - Choisir l'icône représentative parmi la liste prédéfinie
    - Soumettre l'action serveur ?/createGroup avec gestion d'état et reset
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconId } from '$lib/icons/types';

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
	let errorMessage = $state('');
	let groupName = $state('');
	let selectedColor = $state('#10b981');
	let selectedIcon = $state<IconId | ''>('');

	function resetForm() {
		groupName = '';
		selectedColor = '#10b981';
		selectedIcon = '';
		errorMessage = '';
	}
</script>

<div class="create-box">
	<h3>Créer un nouveau groupe</h3>
	<form
		method="POST"
		action="?/createGroup"
		use:enhance={() => {
			isSubmitting = true;
			errorMessage = '';
			return async ({ result, update }) => {
				isSubmitting = false;
				if (result.type === 'success') {
					resetForm();
				} else if (result.type === 'failure') {
					errorMessage = (result.data?.error as string) || 'Erreur lors de la création';
				}
				await update({ reset: false });
			};
		}}
	>
		<input type="hidden" name="icon" value={selectedIcon} />

		<div class="form-row">
			<label for="create_group_name" class="label-text">Nom du groupe</label>
			<input
				id="create_group_name"
				type="text"
				name="name"
				bind:value={groupName}
				placeholder="Nom du groupe (ex: Amis proches, Veille...)"
				required
				maxlength="50"
			/>
		</div>

		<div class="form-row">
			<label class="color-picker-label">
				<span class="label-text">Couleur</span>
				<div class="color-input-wrapper">
					<input type="color" name="color" bind:value={selectedColor} class="color-input" />
					<span class="color-hex">{selectedColor.toUpperCase()}</span>
				</div>
			</label>
		</div>

		<div class="form-row">
			<span class="label-text">Icône du groupe (optionnelle)</span>
			<div class="icon-selector-grid">
				{#each GROUP_ICON_OPTIONS as opt (opt.id)}
					<button
						type="button"
						class="icon-option-btn"
						class:active={selectedIcon === opt.id}
						onclick={() => (selectedIcon = opt.id)}
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

		{#if errorMessage}
			<div class="error-msg">{errorMessage}</div>
		{/if}

		<button type="submit" class="btn-create" disabled={isSubmitting || !groupName.trim()}>
			{isSubmitting ? 'Création...' : 'Créer le groupe'}
		</button>
	</form>
</div>

<style>
	.create-box {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		padding: 20px;
		border-radius: 16px;
	}
	h3 {
		margin: 0 0 16px 0;
		font-size: 1.1rem;
		color: #334155;
	}
	.form-row {
		margin-bottom: 16px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	input[type='text'] {
		width: 100%;
		padding: 12px 16px;
		border: 1px solid #cbd5e1;
		border-radius: 12px;
		font-size: 1rem;
		outline: none;
		box-sizing: border-box;
	}
	input[type='text']:focus {
		border-color: #0ea5e9;
	}
	.icon-selector-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
		gap: 8px;
		margin-top: 4px;
	}
	.icon-option-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 4px;
		padding: 8px 4px;
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
	.color-picker-label {
		display: flex;
		flex-direction: column;
		gap: 8px;
		cursor: pointer;
	}
	.label-text {
		font-weight: 600;
		font-size: 0.9rem;
		color: #475569;
	}
	.color-input-wrapper {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 8px 12px;
		background: white;
		border: 1px solid #cbd5e1;
		border-radius: 12px;
		width: fit-content;
	}
	.color-input {
		-webkit-appearance: none;
		-moz-appearance: none;
		appearance: none;
		width: 32px;
		height: 32px;
		background-color: transparent;
		border: none;
		cursor: pointer;
		padding: 0;
	}
	.color-input::-webkit-color-swatch {
		border-radius: 50%;
		border: 2px solid #e2e8f0;
	}
	.color-input::-moz-color-swatch {
		border-radius: 50%;
		border: 2px solid #e2e8f0;
	}
	.color-hex {
		font-family: monospace;
		color: #64748b;
		font-size: 0.95rem;
	}
	.btn-create {
		width: 100%;
		padding: 14px;
		background: #0ea5e9;
		color: white;
		border: none;
		border-radius: 12px;
		font-weight: bold;
		font-size: 1rem;
		cursor: pointer;
		transition: background 0.2s;
	}
	.btn-create:hover:not(:disabled) {
		background: #0284c7;
	}
	.btn-create:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.error-msg {
		color: #ef4444;
		font-size: 0.9rem;
		margin-bottom: 12px;
		font-weight: 600;
	}
</style>
