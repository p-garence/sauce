<!--
  @component EmojiSetEditorModal
  @domain settings/emojis
  @description Carte et formulaire d'édition ou de création d'une collection d'émojis personnalisés.
  @responsibilities
    - Saisir le nom et la description de la collection
    - Téléverser de nouveaux émojis (image/png, webp, gif, svg)
    - Nettoyer le slug du token avec cleanEmojiToken
    - Retirer des émojis de la composition
    - Sauvegarder la collection (création ou mise à jour)
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import SettingsCard from '$lib/components/settings/ui/SettingsCard.svelte';
	import type { EmojiItem, EmojiSet } from '$lib/types';
	import { cleanEmojiToken } from '$lib/emojis';
	import { generateId } from '$lib/utils/id';

	/**
	 * Propriétés du composant EmojiSetEditorModal
	 */
	interface Props {
		/** Collection en cours d'édition (ou null en création) */
		editingSet?: EmojiSet | null;
		/** Callback appelé pour enregistrer la collection */
		onSave: (payload: {
			id?: string;
			name: string;
			description?: string;
			emojis: EmojiItem[];
		}) => Promise<void> | void;
		/** Callback pour annuler l'édition */
		onCancel: () => void;
	}

	let {
		editingSet = null,
		onSave,
		onCancel
	}: Props = $props();

	let setName = $state(untrack(() => editingSet?.name || ''));
	let setDescription = $state(untrack(() => editingSet?.description || ''));
	let setEmojis = $state<EmojiItem[]>(
		untrack(() => (editingSet?.emojis ? [...((editingSet.emojis as EmojiItem[]) || [])] : []))
	);

	let isUploadingEmoji = $state(false);
	let isSaving = $state(false);
	let saveErrorMessage = $state<string | null>(null);
	let saveSuccessMessage = $state<string | null>(null);
	let fileInputRef = $state<HTMLInputElement | null>(null);

	$effect(() => {
		setName = editingSet?.name || '';
		setDescription = editingSet?.description || '';
		setEmojis = editingSet?.emojis ? [...((editingSet.emojis as EmojiItem[]) || [])] : [];
		saveErrorMessage = null;
		saveSuccessMessage = null;
	});

	async function handleUploadEmoji(e: Event) {
		const target = e.target as HTMLInputElement;
		const files = target.files ? Array.from(target.files) : [];
		if (files.length === 0) return;

		isUploadingEmoji = true;
		saveErrorMessage = null;
		saveSuccessMessage = null;
		try {
			const uploadedEmojis: EmojiItem[] = [];
			for (const file of files) {
				const formData = new FormData();
				formData.append('file', file);
				const res = await fetch('/api/upload', { method: 'POST', body: formData });
				const data = await res.json();

				if (!res.ok || !data.success || !data.media?.[0]?.url) {
					throw new Error(data.message || 'Échec du téléversement');
				}

				const rawName = file.name.split('.')[0] || 'emoji';
				const cleanName = cleanEmojiToken(rawName, 30) || 'emoji';
				const emojiId = `em_${generateId()}`;

				uploadedEmojis.push({
					id: emojiId,
					name: cleanName,
					url: data.media[0].url
				});
			}

			setEmojis = [...setEmojis, ...uploadedEmojis];
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Erreur lors de l'envoi de l'emoji.";
			saveErrorMessage = msg;
		} finally {
			isUploadingEmoji = false;
			target.value = '';
		}
	}

	function removeEmoji(id: string) {
		setEmojis = setEmojis.filter((e) => e.id !== id);
	}

	async function handleSubmit() {
		if (!setName.trim()) {
			saveErrorMessage = 'Le nom de la collection est requis.';
			return;
		}

		const wasEditing = Boolean(editingSet?.id);
		isSaving = true;
		saveErrorMessage = null;
		saveSuccessMessage = null;
		try {
			await onSave({
				id: editingSet?.id,
				name: setName.trim(),
				description: setDescription.trim() || undefined,
				emojis: setEmojis
			});
			setName = '';
			setDescription = '';
			setEmojis = [];
			saveSuccessMessage = wasEditing
				? 'Collection mise à jour dans votre bibliothèque !'
				: 'Collection enregistrée dans votre bibliothèque !';
		} catch (err: unknown) {
			saveErrorMessage =
				err instanceof Error ? err.message : "Impossible d'enregistrer la collection.";
		} finally {
			isSaving = false;
		}
	}
</script>

<div class="editor-scroll-anchor">
	<SettingsCard title={editingSet ? `Modifier : ${editingSet.name}` : "Créer une collection d'emojis"}>
		<p class="editor-desc">
			Ajoutez vos images pour concevoir un pack d'emojis personnalisé.
		</p>

		{#if saveErrorMessage}
			<div class="alert-error">{saveErrorMessage}</div>
		{/if}
		{#if saveSuccessMessage}
			<div class="alert-success">{saveSuccessMessage}</div>
		{/if}

		<div class="form-grid">
			<div class="input-group">
				<label for="emoji_set_name">Nom de la collection</label>
				<input
					id="emoji_set_name"
					type="text"
					class="text-input"
					placeholder="Ex: Chats"
					maxlength="50"
					bind:value={setName}
				/>
			</div>

			<div class="input-group">
				<label for="emoji_set_desc">Description (optionnelle)</label>
				<input
					id="emoji_set_desc"
					type="text"
					class="text-input"
					placeholder="Des emojis de chats"
					bind:value={setDescription}
				/>
			</div>
		</div>

		<!-- Liste des emojis de la collection -->
		<div class="emojis-management-section">
			<div class="emojis-section-header">
				<h4 class="subheading">Emojis de la collection ({setEmojis.length})</h4>

				<div class="add-emoji-bar">
					<input
						type="file"
						accept="image/png,image/webp,image/gif,image/jpeg,image/svg+xml"
						multiple
						bind:this={fileInputRef}
						onchange={handleUploadEmoji}
						style="display: none;"
					/>
					<button
						type="button"
						class="btn-add-emoji"
						disabled={isUploadingEmoji}
						onclick={() => fileInputRef?.click()}
					>
						{isUploadingEmoji ? 'Envoi...' : '+ Ajouter une image'}
					</button>
				</div>
			</div>

			<div class="emojis-grid">
				{#each setEmojis as emoji (emoji.id)}
					<div class="emoji-card">
						<img src={emoji.url} alt="Emoji" class="emoji-preview-img" />
						<div class="emoji-card-actions">
							<button
								type="button"
								class="btn-delete-emoji"
								title="Supprimer"
								onclick={() => removeEmoji(emoji.id)}
							>
								✕
							</button>
						</div>
					</div>
				{/each}
				{#if setEmojis.length === 0}
					<div class="no-emojis-box">Ajoutez vos premières images d'emojis ci-dessus.</div>
				{/if}
			</div>
		</div>

		<div class="editor-actions">
			<button
				type="button"
				class="btn-save-collection"
				disabled={isSaving || !setName.trim()}
				onclick={handleSubmit}
			>
				{isSaving
					? 'Enregistrement...'
					: editingSet
						? 'Mettre à jour la collection'
						: 'Enregistrer dans ma bibliothèque'}
			</button>
			{#if editingSet}
				<button type="button" class="btn-cancel-edit" onclick={onCancel}>
					Annuler la modification
				</button>
			{/if}
		</div>
	</SettingsCard>
</div>

<style>
	.editor-scroll-anchor {
		scroll-margin-top: 80px;
	}

	.editor-desc {
		margin: 0 0 16px 0;
		font-size: 0.88rem;
		color: #475569;
		line-height: 1.4;
	}

	.form-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 12px;
	}

	@media (min-width: 640px) {
		.form-grid {
			grid-template-columns: 1fr 1fr;
		}
	}

	.input-group label {
		display: block;
		margin-bottom: 6px;
		font-weight: 700;
		font-size: 0.85rem;
		color: #1e293b;
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

	.emojis-management-section {
		margin-top: 20px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.emojis-section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 10px;
	}

	.subheading {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 700;
		color: #1e293b;
	}

	.add-emoji-bar {
		display: flex;
		gap: 8px;
		align-items: center;
	}

	.btn-add-emoji {
		padding: 8px 14px;
		background: #0ea5e9;
		color: #ffffff;
		border: none;
		border-radius: 8px;
		font-size: 0.82rem;
		font-weight: 600;
		cursor: pointer;
		white-space: nowrap;
	}

	.btn-add-emoji:hover:not(:disabled) {
		background: #0284c7;
	}

	.emojis-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
		gap: 10px;
		margin-top: 4px;
	}

	.emoji-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 8px;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		position: relative;
		gap: 4px;
	}

	.emoji-preview-img {
		width: 40px;
		height: 40px;
		object-fit: contain;
	}

	.emoji-card-actions {
		display: flex;
		gap: 6px;
		align-items: center;
	}

	.btn-delete-emoji {
		background: none;
		border: none;
		font-size: 0.75rem;
		color: #ef4444;
		cursor: pointer;
		padding: 2px 4px;
	}

	.no-emojis-box {
		grid-column: 1 / -1;
		padding: 20px;
		text-align: center;
		background: #f8fafc;
		border: 1px dashed #cbd5e1;
		border-radius: 10px;
		font-size: 0.85rem;
		color: #94a3b8;
	}

	.editor-actions {
		margin-top: 20px;
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}

	.btn-save-collection {
		padding: 10px 18px;
		background: #0ea5e9;
		color: #ffffff;
		border: none;
		border-radius: 8px;
		font-size: 0.88rem;
		font-weight: 700;
		cursor: pointer;
	}

	.btn-save-collection:hover:not(:disabled) {
		background: #0284c7;
	}

	.btn-save-collection:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-cancel-edit {
		padding: 10px 14px;
		background: #f1f5f9;
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
		margin-bottom: 12px;
	}

	.alert-success {
		padding: 8px 12px;
		background: #dcfce7;
		color: #166534;
		border-radius: 6px;
		font-size: 0.82rem;
		font-weight: 600;
		margin-bottom: 12px;
	}
</style>
