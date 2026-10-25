<script lang="ts">
	/**
	 * @component AdminSystemPost
	 * @domain admin
	 * @description Interface administrateur pour composer et publier un post système accompagné d'une notification push globale diffusée à tous les utilisateurs.
	 *
	 * @responsibilities
	 * - Saisir le message d'alerte/notification globale push.
	 * - Composer la publication système (texte, carrousel photo/vidéo, légende, tags).
	 * - Envoyer le post via l'action serveur `?/createSystemPost`.
	 * - Afficher la bannière de succès avec lien vers le nouveau post.
	 */

	import { enhance } from '$app/forms';
	import { onDestroy } from 'svelte';
	import { resolve } from '$app/paths';
	import type { EditorCarouselItem, EmojiItem } from '$lib/types';
	import { MAX_MEDIA_SIZE_BYTES } from '$lib/constants';
	import { mediaEditor } from '$lib/client/mediaEditorState.svelte';
	import { generateId } from '$lib/utils/id';
	import MentionSuggestions from '$lib/components/ui/MentionSuggestions.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import EmojiButton from '$lib/components/ui/EmojiButton.svelte';
	import RichTextInput from '$lib/components/ui/RichTextInput.svelte';
	import TrendingTagsBar from '$lib/components/post/TrendingTagsBar.svelte';
	import CarouselSlideEditor from '$lib/components/post/editor/CarouselSlideEditor.svelte';
	import CarouselThumbnailsBar from '$lib/components/post/editor/CarouselThumbnailsBar.svelte';

	interface TrendingTagItem {
		name: string;
		count?: number;
	}

	interface Props {
		/** Liste des tags tendance pour suggestion rapide */
		trendingTags?: (string | TrendingTagItem)[];
	}

	let { trendingTags = [] }: Props = $props();

	let notificationMessage = $state('');
	let caption = $state('');
	let loading = $state(false);
	let errorMessage = $state('');
	let successPostId = $state<string | null>(null);

	let fileInput = $state<HTMLInputElement>();
	let captionRichInputRef = $state<RichTextInput | null>(null);
	let captionMentionRef: MentionSuggestions | undefined = $state();
	let notifMentionRef: MentionSuggestions | undefined = $state();
	let notifInputElement = $state<HTMLInputElement | null>(null);

	function insertCaptionEmoji(emoji: EmojiItem) {
		captionRichInputRef?.insertEmoji(emoji);
	}

	// Structure du carrousel de slides
	let items = $state<EditorCarouselItem[]>([
		{ id: generateId(), type: 'text', text: '', url: '', file: null, align: 'center' }
	]);
	let currentIndex = $state(0);
	let isSimpleText = $derived(items.length === 1 && items[0].type === 'text');

	onDestroy(() => {
		for (const item of items) {
			if (item.url && item.url.startsWith('blob:')) {
				try {
					URL.revokeObjectURL(item.url);
				} catch {
					/* ignore */
				}
			}
		}
	});

	function handleFileSelect(e: Event) {
		const target = e.target as HTMLInputElement;
		errorMessage = '';

		if (target.files && target.files.length > 0) {
			const validFiles = Array.from(target.files).filter((file) => {
				if (file.size > MAX_MEDIA_SIZE_BYTES) {
					errorMessage = `Le fichier "${file.name}" est trop lourd.`;
					return false;
				}
				return true;
			});

			if (validFiles.length > 0) {
				mediaEditor.open(validFiles, '4:5', onEditorSave);
			}
			target.value = '';
		}
	}

	function onEditorSave(croppedFile: File) {
		const newItem: EditorCarouselItem = {
			id: generateId(),
			type: croppedFile.type.startsWith('video') ? 'video' : 'image',
			text: '',
			url: URL.createObjectURL(croppedFile),
			file: croppedFile
		};

		if (items.length === 1 && items[0].type === 'text' && items[0].text.trim() === '') {
			items = [newItem];
			currentIndex = 0;
		} else {
			items = [...items, newItem];
			currentIndex = items.length - 1;
		}
	}

	async function editMediaItem(index: number) {
		const item = items[index];
		if (!item) return;

		let fileToEdit = item.file;
		if (!fileToEdit && item.url) {
			try {
				const res = await fetch(item.url);
				const blob = await res.blob();
				const filename = item.url.split('/').pop() || 'photo.webp';
				fileToEdit = new File([blob], filename, { type: blob.type || 'image/webp' });
			} catch (e) {
				console.error("Impossible de charger l'image pour modification:", e);
				return;
			}
		}

		if (fileToEdit) {
			mediaEditor.open([fileToEdit], '4:5', (croppedFile: File) => {
				if (item.url && item.url.startsWith('blob:')) {
					URL.revokeObjectURL(item.url);
				}
				items[index] = {
					...item,
					file: croppedFile,
					url: URL.createObjectURL(croppedFile),
					type: croppedFile.type.startsWith('video') ? 'video' : 'image'
				};
			});
		}
	}

	function addTextPanel() {
		items = [
			...items,
			{ id: generateId(), type: 'text', text: '', url: '', file: null, align: 'center' }
		];
		currentIndex = items.length - 1;
	}

	function removeItem(index: number) {
		const item = items[index];
		if (item.url) URL.revokeObjectURL(item.url);

		items.splice(index, 1);

		if (items.length === 0) {
			items = [{ id: generateId(), type: 'text', text: '', url: '', file: null, align: 'center' }];
			currentIndex = 0;
		} else if (currentIndex >= items.length) {
			currentIndex = items.length - 1;
		}
	}

	function move(index: number, direction: 'left' | 'right') {
		const newIndex = direction === 'left' ? index - 1 : index + 1;
		if (newIndex >= 0 && newIndex < items.length) {
			const temp = items[index];
			items[index] = items[newIndex];
			items[newIndex] = temp;
			currentIndex = newIndex;
		}
	}

	let customTags = $state<string[]>([]);
	let removedTags = $state<string[]>([]);
	let tagInputValue = $state('');

	function addCustomTag(rawInput: string) {
		if (!rawInput.trim()) return;
		const tokens = rawInput
			.split(/[\s,]+/)
			.map((t) => t.trim().toLowerCase().replace(/^#+/, '').slice(0, 50))
			.filter((t) => t.length > 0);

		for (const token of tokens) {
			removedTags = removedTags.filter((t) => t !== token);
			if (!customTags.includes(token)) {
				customTags = [...customTags, token];
			}
		}
		tagInputValue = '';
	}

	function removeTag(tagName: string) {
		customTags = customTags.filter((t) => t !== tagName);
		if (!removedTags.includes(tagName)) {
			removedTags = [...removedTags, tagName];
		}
	}

	function handleTagKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
			e.preventDefault();
			addCustomTag(tagInputValue);
		}
	}

	let detectedTagsFromText = $derived.by(() => {
		const text = isSimpleText
			? items[0].text || ''
			: `${caption || ''} ${items
					.filter((i) => i.type === 'text')
					.map((i) => i.text || '')
					.join(' ')}`;
		const matches = text.match(/#([a-zA-Z0-9_\p{L}]+)/gu);
		if (!matches) return [];
		return Array.from(new Set(matches.map((m) => m.slice(1).toLowerCase())));
	});

	let allActiveTags = $derived(
		Array.from(new Set([...customTags, ...detectedTagsFromText])).filter(
			(t) => !removedTags.includes(t)
		)
	);

	function resetForm() {
		successPostId = null;
		notificationMessage = '';
		caption = '';
		items.forEach((i) => {
			if (i.url && i.url.startsWith('blob:')) {
				try {
					URL.revokeObjectURL(i.url);
				} catch {
					/* ignore */
				}
			}
		});
		items = [{ id: generateId(), type: 'text', text: '', url: '', file: null, align: 'center' }];
		currentIndex = 0;
		customTags = [];
		removedTags = [];
		tagInputValue = '';
		errorMessage = '';
	}
</script>

<div class="system-post-card">
	<div class="system-post-header">
		<div class="header-badge">
			<Icon name="status.server" size={20} />
			<h2>Créer un Post Notification Système</h2>
		</div>
		<p class="header-desc">
			Ce post sera publié en tant que <strong>« Le serveur »</strong> (auteur non cliquable, sans profil
			individuel). Tous les utilisateurs recevront une notification système en temps réel et web push
			les redirigeant vers ce post.
		</p>
	</div>

	{#if successPostId}
		<div class="success-banner">
			<div class="success-content">
				<span class="success-icon">✓</span>
				<div>
					<h3>Post système publié avec succès !</h3>
					<p>La notification a été diffusée à tous les utilisateurs enregistrés.</p>
				</div>
			</div>
			<div class="success-actions">
				<a href={resolve(`/post/${successPostId}`)} target="_blank" class="btn btn-view-post">
					Voir la publication
				</a>
				<button type="button" class="btn btn-reset" onclick={resetForm}>
					Créer un autre post
				</button>
			</div>
		</div>
	{:else}
		<form
			method="POST"
			action="?/createSystemPost"
			enctype="multipart/form-data"
			class="system-post-form"
			use:enhance={({ formData, cancel }) => {
				if (!notificationMessage.trim()) {
					errorMessage = 'Le message de la notification est obligatoire.';
					cancel();
					return;
				}

				const hasText = isSimpleText
					? Boolean(items[0]?.text?.trim())
					: items.some((i) => i.type === 'text' && i.text.trim()) || caption.trim();
				const hasMedia = items.some((i) => i.type !== 'text');
				if (!hasText && !hasMedia) {
					errorMessage = 'Veuillez saisir du texte ou ajouter un média pour la publication.';
					cancel();
					return;
				}

				loading = true;
				errorMessage = '';

				const layout = items.map((item) => {
					if (item.type === 'text') return { type: 'text', text: item.text, align: item.align };
					return { type: 'media' };
				});

				formData.append('layout', JSON.stringify(layout));
				formData.delete('media');

				items.forEach((item) => {
					if (item.type !== 'text' && item.file) {
						formData.append('media', item.file);
					}
				});

				formData.set('notificationMessage', notificationMessage.trim());
				formData.set('caption', isSimpleText ? '' : caption.trim());
				formData.set('tags', JSON.stringify(allActiveTags));

				return async ({ result }) => {
					loading = false;
					if (result.type === 'success' && result.data?.postId) {
						successPostId = result.data.postId as string;
					} else if (result.type === 'failure') {
						errorMessage =
							(result.data?.message as string) || 'Une erreur est survenue lors de la création.';
					}
				};
			}}
		>
			<!-- 1. MESSAGE DE NOTIFICATION -->
			<div class="form-group notif-msg-group">
				<label for="notif-message-input">
					<span class="label-title">
						<Icon name="nav.notifications" size={16} />
						Message de la notification (envoyé à tous les utilisateurs)
					</span>
					<span class="required-star">*</span>
				</label>
				<div class="notif-input-wrapper">
					<MentionSuggestions
						bind:this={notifMentionRef}
						bind:value={notificationMessage}
						inputElement={notifInputElement}
						placement="bottom"
					/>
					<input
						id="notif-message-input"
						type="text"
						class="notif-input"
						placeholder="Ex : 🚀 Nouvelle mise à jour majeure disponible ! Cliquez pour en savoir plus."
						bind:value={notificationMessage}
						bind:this={notifInputElement}
						onkeydown={(e) => notifMentionRef?.handleKeydown(e)}
						required
					/>
				</div>
				<span class="field-hint">
					Ce message apparaîtra dans la bulle de notification et l'alerte push chez tous les
					utilisateurs.
				</span>
			</div>

			<!-- 2. CONTENU DU POST -->
			<div class="post-editor-box">
				<CarouselSlideEditor
					item={items[currentIndex]}
					{isSimpleText}
					onRemove={() => removeItem(currentIndex)}
					onEditMedia={() => editMediaItem(currentIndex)}
				/>

				<input
					type="file"
					multiple
					accept="image/jpeg, image/png, image/webp, video/mp4, video/quicktime"
					bind:this={fileInput}
					onchange={handleFileSelect}
					hidden
				/>

				{#if isSimpleText}
					<div class="simple-actions">
						<button type="button" class="btn-add-media" onclick={() => fileInput?.click()}>
							<span class="btn-icon"><Icon name="media.camera" size={16} /></span>
							<span class="btn-text">Ajouter Photo/Vidéo</span>
						</button>
						<button type="button" class="btn-add-text" onclick={addTextPanel}>
							<span class="btn-icon"><Icon name="media.text" size={16} /></span>
							<span class="btn-text">Ajouter panneau texte</span>
						</button>
					</div>
				{/if}

				{#if !isSimpleText}
					<CarouselThumbnailsBar
						bind:currentIndex
						{items}
						onMove={move}
						onAddMedia={() => fileInput?.click()}
						onAddText={addTextPanel}
					/>

					<div class="caption-section">
						<MentionSuggestions
							bind:this={captionMentionRef}
							bind:value={caption}
							inputElement={captionRichInputRef?.getElement()}
						/>
						<RichTextInput
							bind:this={captionRichInputRef}
							bind:value={caption}
							placeholder="Ajouter une description globale (optionnelle)..."
							class="caption-rich-input"
							onkeydown={(e) => captionMentionRef?.handleKeydown(e)}
						/>
						<div class="caption-toolbar">
							<EmojiButton onSelect={insertCaptionEmoji} variant="inline" align="left" />
						</div>
					</div>
				{/if}

				<!-- SECTION HASHTAGS -->
				<div class="tags-section">
					<div class="tags-section-header">
						<span class="tags-icon"><Icon name="status.tag" size={16} /></span>
						<span class="tags-title">Tags & Mots-clés</span>
					</div>

					<div class="tag-input-row">
						<input
							type="text"
							class="tag-input"
							placeholder="Ajouter un tag"
							bind:value={tagInputValue}
							onkeydown={handleTagKeydown}
						/>
						<button
							type="button"
							class="btn-add-tag"
							onclick={() => addCustomTag(tagInputValue)}
							disabled={!tagInputValue.trim()}
						>
							Ajouter
						</button>
					</div>

					{#if allActiveTags.length > 0}
						<div class="active-tags-list">
							{#each allActiveTags as tag (tag)}
								<span class="active-tag-chip">
									#{tag}
									<button
										type="button"
										class="btn-remove-tag"
										onclick={() => removeTag(tag)}
										aria-label="Supprimer le tag {tag}"
									>
										✕
									</button>
								</span>
							{/each}
						</div>
					{/if}

					<TrendingTagsBar
						tags={trendingTags}
						onTagClick={(t: string) => addCustomTag(t)}
						selectedTags={allActiveTags}
					/>
				</div>
			</div>

			<!-- MESSAGES D'ERREUR -->
			{#if errorMessage}
				<div class="alert-box error">
					<Icon name="action.close" size={18} />
					<span>{errorMessage}</span>
				</div>
			{/if}

			<!-- BOUTON DE SOUMISSION -->
			<div class="form-actions">
				<button type="submit" class="btn btn-submit" disabled={loading}>
					{#if loading}
						<Icon name="status.time" size={18} />
						<span>Publication et diffusion en cours...</span>
					{:else}
						<Icon name="status.server" size={18} />
						<span>Diffuser la notification système</span>
					{/if}
				</button>
			</div>
		</form>
	{/if}
</div>

<style>
	.system-post-card {
		background: #ffffff;
		border-radius: 16px;
		border: 1px solid #e2e8f0;
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 24px;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
	}

	.system-post-header {
		display: flex;
		flex-direction: column;
		gap: 8px;
		border-bottom: 1px solid #f1f5f9;
		padding-bottom: 16px;
	}

	.header-badge {
		display: flex;
		align-items: center;
		gap: 10px;
		color: #0284c7;
	}

	.header-badge h2 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 700;
		color: #0f172a;
	}

	.header-desc {
		margin: 0;
		font-size: 0.9rem;
		color: #64748b;
		line-height: 1.5;
	}

	.system-post-form {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.notif-msg-group {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		padding: 16px;
	}

	.label-title {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.95rem;
		font-weight: 600;
		color: #1e293b;
	}

	.required-star {
		color: #ef4444;
	}

	.notif-input {
		width: 100%;
		padding: 12px 14px;
		border: 1.5px solid #cbd5e1;
		border-radius: 8px;
		font-size: 1rem;
		color: #0f172a;
		background: #ffffff;
		outline: none;
		box-sizing: border-box;
		transition: border-color 0.2s;
	}

	.notif-input:focus {
		border-color: #0284c7;
	}

	.field-hint {
		font-size: 0.8rem;
		color: #64748b;
	}

	.notif-input-wrapper {
		position: relative;
		width: 100%;
	}

	.post-editor-box {
		position: relative;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		background: #f8fafc;
	}

	.simple-actions {
		display: flex;
		gap: 12px;
		padding: 16px;
		background: #ffffff;
		border-top: 1px solid #e2e8f0;
	}

	.simple-actions button {
		flex: 1;
		padding: 10px 14px;
		background: #f1f5f9;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		font-size: 0.9rem;
		font-weight: 600;
		color: #334155;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		transition: all 0.15s ease;
	}

	.simple-actions button:hover {
		background: #e2e8f0;
		color: #0f172a;
	}

	.caption-section {
		position: relative;
		padding: 16px;
		background: #ffffff;
		border-top: 1px solid #e2e8f0;
	}

	:global(.caption-rich-input) {
		width: 100%;
		min-height: 48px;
		font-size: 0.95rem;
		font-family: inherit;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		padding: 10px 12px;
		outline: none;
		box-sizing: border-box;
	}

	.caption-toolbar {
		display: flex;
		align-items: center;
		margin-top: 8px;
	}

	.tags-section {
		padding: 16px;
		background: #ffffff;
		border-top: 1px solid #e2e8f0;
	}

	.tags-section-header {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 10px;
	}

	.tags-title {
		font-weight: 600;
		font-size: 0.9rem;
		color: #334155;
	}

	.tags-icon {
		color: #0284c7;
		display: flex;
		align-items: center;
	}

	.tag-input-row {
		display: flex;
		gap: 8px;
		margin-bottom: 10px;
	}

	.tag-input {
		flex: 1;
		padding: 8px 12px;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		font-size: 0.9rem;
		outline: none;
	}

	.tag-input:focus {
		border-color: #0284c7;
	}

	.btn-add-tag {
		padding: 8px 16px;
		background: #0284c7;
		color: #ffffff;
		border: none;
		border-radius: 8px;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s;
		white-space: nowrap;
	}

	.btn-add-tag:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.btn-add-tag:not(:disabled):hover {
		background: #0369a1;
	}

	.active-tags-list {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		padding: 4px 0 10px 0;
	}

	.active-tag-chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		border-radius: 14px;
		background: #e0f2fe;
		color: #0369a1;
		font-size: 0.85rem;
		font-weight: 600;
	}

	.btn-remove-tag {
		background: none;
		border: none;
		color: #0284c7;
		font-size: 0.75rem;
		cursor: pointer;
		padding: 0 2px;
		line-height: 1;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.btn-remove-tag:hover {
		color: #ef4444;
	}

	.alert-box {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px 16px;
		border-radius: 8px;
		font-size: 0.9rem;
		font-weight: 500;
	}

	.alert-box.error {
		background: #fef2f2;
		color: #dc2626;
		border: 1px solid #fecaca;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
	}

	.btn-submit {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		background: #0284c7;
		color: #ffffff;
		border: none;
		padding: 14px 28px;
		border-radius: 10px;
		font-size: 1rem;
		font-weight: 700;
		cursor: pointer;
		transition:
			background 0.2s,
			transform 0.1s;
		box-shadow: 0 4px 6px -1px rgba(2, 132, 199, 0.2);
	}

	.btn-submit:hover:not(:disabled) {
		background: #0369a1;
	}

	.btn-submit:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.success-banner {
		display: flex;
		flex-direction: column;
		gap: 16px;
		background: #f0fdf4;
		border: 1.5px solid #86efac;
		border-radius: 12px;
		padding: 24px;
	}

	.success-content {
		display: flex;
		align-items: flex-start;
		gap: 14px;
	}

	.success-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		background: #22c55e;
		color: #ffffff;
		border-radius: 50%;
		font-size: 1.2rem;
		font-weight: 700;
		flex-shrink: 0;
	}

	.success-content h3 {
		margin: 0 0 4px 0;
		font-size: 1.15rem;
		color: #15803d;
	}

	.success-content p {
		margin: 0;
		font-size: 0.9rem;
		color: #166534;
	}

	.success-actions {
		display: flex;
		gap: 12px;
		padding-left: 50px;
	}

	.btn-view-post {
		display: inline-flex;
		align-items: center;
		padding: 8px 16px;
		background: #16a34a;
		color: #ffffff;
		border-radius: 8px;
		font-size: 0.9rem;
		font-weight: 600;
		text-decoration: none;
		transition: background 0.15s;
	}

	.btn-view-post:hover {
		background: #15803d;
	}

	.btn-reset {
		display: inline-flex;
		align-items: center;
		padding: 8px 16px;
		background: #ffffff;
		color: #374151;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s;
	}

	.btn-reset:hover {
		background: #f9fafb;
	}
</style>
