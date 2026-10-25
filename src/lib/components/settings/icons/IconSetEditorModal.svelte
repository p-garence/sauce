<!--
  @component IconSetEditorModal
  @domain settings/icons
  @description Carte de mosaïque des icônes et formulaire de sauvegarde d'un pack d'icônes personnalisé.
  @responsibilities
    - Afficher la mosaïque de toutes les icônes du système avec indicateur de personnalisation
    - Permettre la sélection d'une icône pour ouverture du sous-éditeur
    - Permettre la saisie du nom et de la description du pack
    - Déclencher la sauvegarde du pack personnalisé dans la bibliothèque
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import SettingsCard from '$lib/components/settings/ui/SettingsCard.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconId } from '$lib/icons/types';
	import { iconTheme } from '$lib/client/iconTheme.svelte';

	interface IconEntry {
		id: IconId;
		label: string;
	}

	/**
	 * Propriétés du composant IconSetEditorModal
	 */
	interface Props {
		/** Liste de toutes les entrées d'icônes éditables */
		icons: IconEntry[];
		/** Identifiant du set en cours d'édition (ou null) */
		editingSetId: string | null;
		/** Nom initial du set */
		initialName?: string;
		/** Description initiale */
		initialDescription?: string;
		/** Au moins une icône a été modifiée par rapport au défaut */
		hasModifiedCustomIcons: boolean;
		/** Callback lors du clic sur une icône de la mosaïque */
		onSelectIcon: (item: IconEntry) => void;
		/** Callback pour enregistrer le pack */
		onSave: (payload: { name: string; description?: string }) => Promise<void> | void;
		/** Callback pour annuler l'édition */
		onCancel: () => void;
	}

	let {
		icons,
		editingSetId,
		initialName = '',
		initialDescription = '',
		hasModifiedCustomIcons,
		onSelectIcon,
		onSave,
		onCancel
	}: Props = $props();

	let setName = $state(untrack(() => initialName));
	let setDescription = $state(untrack(() => initialDescription));
	let isSaving = $state(false);
	let saveErrorMessage = $state<string | null>(null);
	let saveSuccessMessage = $state<string | null>(null);

	$effect(() => {
		setName = initialName;
		setDescription = initialDescription;
		saveErrorMessage = null;
	});

	async function handleSubmit() {
		if (!setName.trim()) {
			saveErrorMessage = 'Le nom du pack est requis.';
			return;
		}

		const wasEditing = Boolean(editingSetId);
		isSaving = true;
		saveErrorMessage = null;
		saveSuccessMessage = null;
		try {
			await onSave({
				name: setName.trim(),
				description: setDescription.trim() || undefined
			});
			setName = '';
			setDescription = '';
			saveSuccessMessage = wasEditing
				? 'Pack mis à jour dans votre bibliothèque !'
				: 'Pack sauvegardé dans votre bibliothèque !';
		} catch (err: unknown) {
			saveErrorMessage = err instanceof Error ? err.message : 'Impossible de sauvegarder le pack.';
		} finally {
			isSaving = false;
		}
	}
</script>

<div class="editor-scroll-anchor">
	<SettingsCard
		title={editingSetId ? `Modifier le pack : ${setName}` : 'Prévisualisation & Éditeur'}
	>
		<p class="mosaic-hint">
			Cliquez sur une icône pour la remplacer par un SVG ou une image de votre choix.
		</p>
		<div class="mosaic-grid">
			{#each icons as item (item.id)}
				{@const hasCustom = Boolean(iconTheme.getCustomIcon(item.id))}
				<button
					type="button"
					class="mosaic-tile"
					class:has-custom={hasCustom}
					onclick={() => onSelectIcon(item)}
					title="{item.label} (Cliquer pour modifier)"
				>
					<Icon name={item.id} size={24} />
					{#if hasCustom}
						<span class="custom-dot" title="Personnalisée"></span>
					{/if}
				</button>
			{/each}
		</div>

		{#if hasModifiedCustomIcons || editingSetId || saveSuccessMessage}
			<div class="save-set-box">
				<h4 class="save-box-title">
					{editingSetId
						? `Modifier le pack "${setName}"`
						: 'Sauvegarder ce pack dans ma bibliothèque'}
				</h4>
				<p class="save-box-desc">
					{editingSetId
						? 'Modifiez le nom, la description ou les icônes de ce pack, puis enregistrez les modifications.'
						: "Enregistrez votre composition d'icônes actuelle. Vous pourrez l'activer à tout moment ou la publier si vous le souhaitez."}
				</p>

				{#if saveErrorMessage}
					<div class="alert-error">{saveErrorMessage}</div>
				{/if}
				{#if saveSuccessMessage}
					<div class="alert-success">{saveSuccessMessage}</div>
				{/if}

				<div class="save-inputs-row">
					<input
						type="text"
						class="text-input"
						placeholder="Nom du pack (ex: Néo-Pixel)"
						maxlength="50"
						bind:value={setName}
					/>
					<input
						type="text"
						class="text-input"
						placeholder="Description (optionnel)"
						bind:value={setDescription}
					/>
					<div class="save-buttons-row">
						<button
							type="button"
							class="btn-save-pack"
							disabled={isSaving || !setName.trim()}
							onclick={handleSubmit}
						>
							{isSaving
								? 'Enregistrement...'
								: editingSetId
									? 'Mettre à jour le pack'
									: 'Sauvegarder dans ma bibliothèque'}
						</button>
						{#if editingSetId}
							<button type="button" class="btn-cancel-edit" onclick={onCancel}>
								Annuler la modification
							</button>
						{/if}
					</div>
				</div>
			</div>
		{/if}
	</SettingsCard>
</div>

<style>
	.editor-scroll-anchor {
		scroll-margin-top: 80px;
	}

	.mosaic-hint {
		margin: 0 0 16px 0;
		font-size: 0.88rem;
		color: #475569;
		line-height: 1.4;
	}

	.mosaic-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(52px, 1fr));
		gap: 8px;
		margin-bottom: 20px;
	}

	.mosaic-tile {
		aspect-ratio: 1;
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		position: relative;
		transition: all 0.15s ease;
		color: #1e293b;
		padding: 0;
	}

	.mosaic-tile:hover {
		border-color: #0ea5e9;
		background: #f0f9ff;
		transform: translateY(-2px);
		box-shadow: 0 4px 6px -1px rgba(14, 165, 233, 0.15);
	}

	.mosaic-tile.has-custom {
		border-color: #10b981;
		background: #ecfdf5;
	}

	.custom-dot {
		position: absolute;
		top: 4px;
		right: 4px;
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: #10b981;
	}

	.save-set-box {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.save-box-title {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 700;
		color: #0f172a;
	}

	.save-box-desc {
		margin: 0;
		font-size: 0.82rem;
		color: #64748b;
		line-height: 1.4;
	}

	.save-inputs-row {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.text-input {
		width: 100%;
		padding: 10px 12px;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		font-size: 0.88rem;
		outline: none;
		background: #ffffff;
		box-sizing: border-box;
	}

	.text-input:focus {
		border-color: #0ea5e9;
	}

	.save-buttons-row {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}

	.btn-save-pack {
		padding: 10px 18px;
		background: #0ea5e9;
		color: #ffffff;
		border: none;
		border-radius: 8px;
		font-size: 0.88rem;
		font-weight: 700;
		cursor: pointer;
	}

	.btn-save-pack:hover:not(:disabled) {
		background: #0284c7;
	}

	.btn-save-pack:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-cancel-edit {
		padding: 10px 14px;
		background: #ffffff;
		color: #475569;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		font-size: 0.88rem;
		font-weight: 600;
		cursor: pointer;
	}

	.alert-error {
		padding: 8px 12px;
		background: #fee2e2;
		color: #991b1b;
		border-radius: 6px;
		font-size: 0.82rem;
		font-weight: 600;
	}

	.alert-success {
		padding: 8px 12px;
		background: #dcfce7;
		color: #166534;
		border-radius: 6px;
		font-size: 0.82rem;
		font-weight: 600;
	}
</style>
