<script lang="ts">
	/**
	 * @component ModifierPostPage
	 * @domain post
	 * @description Page d'édition d'une publication existante (modification des slides du carrousel, de la légende, des tags et des assets joints).
	 *
	 * @responsibilities
	 * - Charger le contenu initial du post (texte, médias, tags, visibilité, pack joint).
	 * - Gérer l'ajout/suppression/recadrage de médias et panneaux texte avec upload asynchrone.
	 * - Enregistrer les modifications et rafraîchir l'état du flux.
	 */

	import { enhance } from '$app/forms';
	import { onDestroy, untrack } from 'svelte';
	import { invalidateAll, goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { mediaEditor } from '$lib/client/mediaEditorState.svelte';
	import { clearMainFeedState } from '$lib/client/feedMemory.svelte';
	import { generateId } from '$lib/utils/id';
	import PageHeader from '$lib/components/navigation/PageHeader.svelte';
	import MentionSuggestions from '$lib/components/ui/MentionSuggestions.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import AttachedAssetPicker from '$lib/components/post/editor/AttachedAssetPicker.svelte';
	import EmojiButton from '$lib/components/ui/EmojiButton.svelte';
	import RichTextInput from '$lib/components/ui/RichTextInput.svelte';
	import TrendingTagsBar from '$lib/components/post/TrendingTagsBar.svelte';
	import CarouselSlideEditor from '$lib/components/post/editor/CarouselSlideEditor.svelte';
	import CarouselThumbnailsBar from '$lib/components/post/editor/CarouselThumbnailsBar.svelte';
	import type {
		CarouselItem as DbCarouselItem,
		EditorCarouselItem,
		EmojiItem,
		EmojiSet,
		IconSet,
		PostVisibility,
		TrendingTagItem,
		InstanceSettingsData
	} from '$lib/types';

	interface Props {
		data: {
			post: {
				id: string;
				content?: string;
				mediaUrls?: DbCarouselItem[];
				visibility: PostVisibility;
				tags?: string[];
				iconSet?: IconSet | null;
				emojiSet?: EmojiSet | null;
			};
			trendingTags?: TrendingTagItem[];
			userOwnedIconSets?: IconSet[];
			userOwnedEmojiSets?: EmojiSet[];
			instanceSettings?: InstanceSettingsData;
		};
		form?: { success?: boolean; message?: string };
	}

	let { data, form }: Props = $props();

	let attachedIconSet = $state<IconSet | null>(untrack(() => data.post.iconSet || null));
	let attachedEmojiSet = $state<EmojiSet | null>(untrack(() => data.post.emojiSet || null));

	let captionRichInputRef = $state<RichTextInput | null>(null);
	let captionMentionRef: MentionSuggestions | undefined = $state();

	function insertCaptionEmoji(emoji: EmojiItem) {
		captionRichInputRef?.insertEmoji(emoji);
	}

	let isSaving = $state(false);

	function initialItems(): EditorCarouselItem[] {
		const media = data.post.mediaUrls as DbCarouselItem[];
		if (!media || media.length === 0) {
			return [
				{ id: generateId(), type: 'text', text: '', url: '', isUploading: false, align: 'left' }
			];
		}
		return media.map((item) => ({
			id: generateId(),
			type: item.type,
			text: item.type === 'text' ? item.content : '',
			url: item.type !== 'text' ? item.content : '',
			isUploading: false,
			align: item.align || (media.length === 1 && item.type === 'text' ? 'left' : 'center')
		}));
	}

	let items = $state<EditorCarouselItem[]>(initialItems());
	let currentIndex = $state(0);
	let caption = $state(untrack(() => data.post.content || ''));
	let visibility = $state<PostVisibility>(untrack(() => data.post.visibility));
	let errorMessage = $state('');
	let isSimpleText = $derived(items.length === 1 && items[0].type === 'text');
	let isAnyUploading = $derived(items.some((i) => i.isUploading));

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

	let fileInput = $state<HTMLInputElement>();

	function handleFileSelect(e: Event) {
		const target = e.target as HTMLInputElement;
		errorMessage = '';

		if (target.files && target.files.length > 0) {
			const maxMb = data.instanceSettings?.mediaSettings?.maxMediaSizeMb || 1000;
			const maxBytes = maxMb * 1024 * 1024;
			const validFiles = Array.from(target.files).filter((file) => {
				if (file.size > maxBytes) {
					errorMessage = `Le fichier "${file.name}" dépasse la taille maximale de ${maxMb} Mo.`;
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

	async function onEditorSave(croppedFile: File) {
		const isVideo = croppedFile.type.startsWith('video');
		const newItem: EditorCarouselItem = {
			id: generateId(),
			type: isVideo ? 'video' : 'image',
			text: '',
			url: URL.createObjectURL(croppedFile),
			isUploading: true
		};

		if (items.length === 1 && items[0].type === 'text' && items[0].text.trim() === '') {
			items = [newItem];
			currentIndex = 0;
		} else {
			items = [...items, newItem];
			currentIndex = items.length - 1;
		}

		const uploadData = new FormData();
		uploadData.append('file', croppedFile);

		try {
			const response = await fetch('/api/upload', { method: 'POST', body: uploadData });
			const result = await response.json();
			const target = items.find((i) => i.id === newItem.id);
			if (target && result.success && result.media.length > 0) {
				URL.revokeObjectURL(target.url);
				target.url = result.media[0].url;
			}
		} catch (error) {
			console.error('Erreur upload média:', error);
			alert("Erreur lors de l'upload du média");
		} finally {
			const target = items.find((i) => i.id === newItem.id);
			if (target) target.isUploading = false;
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
				console.error("Impossible de charger l'image:", e);
				return;
			}
		}

		if (fileToEdit) {
			mediaEditor.open([fileToEdit], '4:5', async (croppedFile: File) => {
				const uploadData = new FormData();
				uploadData.append('file', croppedFile);
				items[index] = { ...item, isUploading: true };

				try {
					const response = await fetch('/api/upload', { method: 'POST', body: uploadData });
					const result = await response.json();
					if (result.success && result.media.length > 0) {
						if (item.url && item.url.startsWith('blob:')) {
							URL.revokeObjectURL(item.url);
						}
						items[index] = {
							...item,
							url: result.media[0].url,
							file: croppedFile,
							isUploading: false
						};
					}
				} catch (err) {
					console.error('Erreur upload:', err);
					alert("Erreur lors de l'enregistrement de l'image modifiée");
				} finally {
					if (items[index]) items[index].isUploading = false;
				}
			});
		}
	}

	function addTextPanel() {
		items = [
			...items,
			{ id: generateId(), type: 'text', text: '', url: '', isUploading: false, align: 'center' }
		];
		currentIndex = items.length - 1;
	}

	function removeItem(index: number) {
		const item = items[index];
		if (item.url && item.url.startsWith('blob:')) URL.revokeObjectURL(item.url);

		items.splice(index, 1);

		if (items.length === 0) {
			items = [
				{
					id: generateId(),
					type: 'text',
					text: '',
					url: '',
					isUploading: false,
					align: isSimpleText ? 'left' : 'center'
				}
			];
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

	let customTags = $state<string[]>(untrack(() => data.post.tags || []));
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
</script>

<div class="edit-post-page">
	<PageHeader title="Modifier le post" back_location={`/post/${data.post.id}`}>
		<button
			type="submit"
			form="edit-post-form"
			class="header-save-btn"
			disabled={isSaving ||
				isAnyUploading ||
				(isSimpleText && !items[0].text.trim() && !attachedIconSet && !attachedEmojiSet)}
		>
			{#if isSaving}
				<Icon name="status.time" size={18} />
			{:else}
				Enregistrer
			{/if}
		</button>
	</PageHeader>

	<main class="form-container">
		{#if form?.success}
			<div class="success-banner">Post mis à jour avec succès !</div>
		{/if}
		{#if errorMessage || form?.message}
			<div class="error-banner">{errorMessage || form?.message}</div>
		{/if}

		<form
			id="edit-post-form"
			method="POST"
			use:enhance={({ formData }) => {
				isSaving = true;

				let layout = items.map((item) => {
					if (item.type === 'text')
						return {
							type: 'text',
							content: item.text,
							align: item.align || (isSimpleText ? 'left' : 'center')
						};
					return { type: item.type, content: item.url };
				});

				if (
					items.length === 1 &&
					items[0].type === 'text' &&
					!items[0].text.trim() &&
					(attachedIconSet || attachedEmojiSet)
				) {
					layout = [];
				}

				formData.set('layout', JSON.stringify(layout));
				formData.set('caption', caption);
				formData.set('iconSetId', attachedIconSet?.id || '');
				formData.set('emojiSetId', attachedEmojiSet?.id || '');
				formData.set('visibility', visibility);
				formData.set('tags', JSON.stringify(allActiveTags));

				return async ({ result, update }) => {
					if (result.type === 'success') {
						clearMainFeedState();
						await invalidateAll();
						const hasNavigated = sessionStorage.getItem('app_navigated') === 'true';
						if (hasNavigated) {
							window.history.back();
						} else {
							goto(resolve(`/post/${data.post.id}`), { replaceState: true });
						}
					} else {
						await update({ reset: false });
						isSaving = false;
					}
				};
			}}
		>
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
						placeholder="Ajouter une description (optionnelle)..."
						class="caption-rich-input"
						onkeydown={(e) => {
							captionMentionRef?.handleKeydown(e);
						}}
					/>

					<div class="caption-toolbar">
						<EmojiButton onSelect={insertCaptionEmoji} variant="inline" align="left" />
					</div>
				</div>
			{/if}

			<AttachedAssetPicker
				bind:attachedIconSet
				bind:attachedEmojiSet
				userOwnedIconSets={data.userOwnedIconSets || []}
				userOwnedEmojiSets={data.userOwnedEmojiSets || []}
			/>

			<div class="tags-section">
				<div class="tags-section-header">
					<span class="tags-icon"><Icon name="status.tag" size={16} /></span>
					<span class="tags-title">Tags</span>
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
					tags={data.trendingTags}
					onTagClick={(t: string) => addCustomTag(t)}
					selectedTags={allActiveTags}
				/>
			</div>
		</form>
	</main>
</div>

<style>
	.edit-post-page {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background: #ffffff;
	}

	.header-save-btn {
		background: #0ea5e9;
		color: white;
		border: none;
		padding: 6px 14px;
		border-radius: 20px;
		font-weight: 600;
		font-size: 0.9rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 90px;
		height: 32px;
		transition: background 0.15s;
	}

	.header-save-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.form-container {
		flex: 1;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
	}

	.success-banner {
		background: #dcfce7;
		color: #166534;
		padding: 12px 16px;
		font-size: 0.9rem;
		text-align: center;
		font-weight: 500;
	}

	.error-banner {
		background: #fee2e2;
		color: #991b1b;
		padding: 12px 16px;
		font-size: 0.9rem;
		text-align: center;
		font-weight: 500;
	}

	.simple-actions {
		padding: var(--space-4, 16px);
		display: flex;
		gap: 10px;
	}

	.simple-actions button {
		flex: 1;
		padding: var(--space-3, 12px);
		background: var(--bg-default, #f0f0f0);
		border: none;
		border-radius: var(--space-2, 8px);
		font-family: inherit;
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--text-default, #1a1a1a);
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		line-height: 1;
	}

	.btn-add-media,
	.btn-add-text {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		line-height: 1;
	}

	.simple-actions .btn-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
		flex-shrink: 0;
	}

	.simple-actions .btn-text {
		display: inline-flex;
		align-items: center;
		line-height: 1;
	}

	.caption-section {
		padding: var(--space-4, 16px);
		border-bottom: 1px solid var(--border-color, #eaeaea);
		position: relative;
	}

	:global(.caption-rich-input) {
		width: 100%;
		min-height: 44px;
		font-size: 1rem;
		font-family: inherit;
		color: var(--text-default, #1a1a1a);
		border: none;
		outline: none;
		box-sizing: border-box;
	}

	.caption-toolbar {
		display: flex;
		align-items: center;
		justify-content: flex-start;
		gap: 8px;
		margin-top: 6px;
	}

	.tags-section {
		padding: var(--space-4, 16px);
		border-bottom: 1px solid var(--border-color, #eaeaea);
	}

	.tags-section-header {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 10px;
	}

	.tags-title {
		font-weight: 600;
		font-size: 0.95rem;
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
		border-radius: 20px;
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
</style>
