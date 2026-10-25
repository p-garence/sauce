<script lang="ts">
	/**
	 * @component PublierPage
	 * @domain post
	 * @description Page principale de création de publications (texte simple, carrousel multimédia) ou de stories.
	 *
	 * @responsibilities
	 * - Permettre le basculement rapide entre mode publication classique et mode story éphémère.
	 * - Orchestrer la composition du carrousel avec les sous-composants dédiés.
	 * - Gérer les tags, la visibilité et les packs d'assets joints.
	 * - Soumettre le formulaire multipart vers le serveur et actualiser l'état du flux.
	 */

	import { enhance } from '$app/forms';
	import { onDestroy, untrack } from 'svelte';
	import { page } from '$app/state';
	import type {
		EditorCarouselItem,
		EmojiItem,
		EmojiSet,
		IconSet,
		PostVisibility,
		TrendingTagItem
	} from '$lib/types';
	import { MAX_MEDIA_SIZE_BYTES } from '$lib/constants';
	import { mediaEditor } from '$lib/client/mediaEditorState.svelte';
	import { clearProfileState } from '$lib/client/profileMemory.svelte.js';
	import { clearMainFeedState } from '$lib/client/feedMemory.svelte';
	import { generateId } from '$lib/utils/id';
	import TopNav from '$lib/components/navigation/TopNav.svelte';
	import VisibilitySelect from '$lib/components/post/VisibilitySelect.svelte';
	import MentionSuggestions from '$lib/components/ui/MentionSuggestions.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import AttachedAssetPicker from '$lib/components/post/editor/AttachedAssetPicker.svelte';
	import EmojiButton from '$lib/components/ui/EmojiButton.svelte';
	import RichTextInput from '$lib/components/ui/RichTextInput.svelte';
	import TrendingTagsBar from '$lib/components/post/TrendingTagsBar.svelte';
	import CarouselSlideEditor from '$lib/components/post/editor/CarouselSlideEditor.svelte';
	import CarouselThumbnailsBar from '$lib/components/post/editor/CarouselThumbnailsBar.svelte';
	import StoryCreator from '$lib/components/stories/StoryCreator.svelte';

	interface Props {
		form?: { message?: string };
		data: {
			trendingTags?: TrendingTagItem[];
			initialIconSet?: IconSet | null;
			initialEmojiSet?: EmojiSet | null;
			userOwnedIconSets?: IconSet[];
			userOwnedEmojiSets?: EmojiSet[];
			sessionUser: { username?: string };
		};
	}

	let { form, data }: Props = $props();

	let errorMessage = $state('');
	let loading = $state(false);

	let publishMode = $state<'post' | 'story'>(
		page.url.searchParams.get('type') === 'story' ? 'story' : 'post'
	);

	// Pack d'icônes ou d'emojis joint
	let attachedIconSet = $state<IconSet | null>(untrack(() => data.initialIconSet || null));
	let attachedEmojiSet = $state<EmojiSet | null>(untrack(() => data.initialEmojiSet || null));

	let caption = $state('');
	let visibility = $state<PostVisibility>('public');
	let groupId = $state<string | null>(null);
	let fileInput = $state<HTMLInputElement>();

	let captionRichInputRef = $state<RichTextInput | null>(null);
	let captionMentionRef: MentionSuggestions | undefined = $state();

	function insertCaptionEmoji(emoji: EmojiItem) {
		captionRichInputRef?.insertEmoji(emoji);
	}

	let items = $state<EditorCarouselItem[]>([
		{ id: generateId(), type: 'text', text: '', url: '', file: null, align: 'left' }
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
			items = [{ id: generateId(), type: 'text', text: '', url: '', file: null, align: 'left' }];
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
</script>

<div class="publish-wrapper">
	<TopNav title="Nouveau" />

	<div class="mode-tabs">
		<button
			type="button"
			class="mode-tab"
			class:active={publishMode === 'post'}
			onclick={() => (publishMode = 'post')}
		>
			Post
		</button>
		<button
			type="button"
			class="mode-tab"
			class:active={publishMode === 'story'}
			onclick={() => (publishMode = 'story')}
		>
			Story
		</button>
	</div>

	{#if errorMessage || form?.message}
		<div class="alert-box error">
			{errorMessage || form?.message}
		</div>
	{/if}

	{#if publishMode === 'story'}
		<StoryCreator />
	{:else}
		<form
			method="POST"
			enctype="multipart/form-data"
			use:enhance={({ formData }) => {
				loading = true;
				errorMessage = '';

				let layout = items.map((item) => {
					if (item.type === 'text')
						return {
							type: 'text',
							text: item.text,
							align: item.align || (isSimpleText ? 'left' : 'center')
						};
					return { type: 'media' };
				});

				if (
					items.length === 1 &&
					items[0].type === 'text' &&
					!items[0].text.trim() &&
					(attachedIconSet || attachedEmojiSet)
				) {
					layout = [];
				}

				formData.append('layout', JSON.stringify(layout));
				formData.delete('media');

				items.forEach((item) => {
					if (item.type !== 'text') formData.append('media', item.file as File);
				});

				formData.set('caption', caption);
				formData.set('iconSetId', attachedIconSet?.id || '');
				formData.set('emojiSetId', attachedEmojiSet?.id || '');

				formData.set('visibility', visibility);
				if (visibility === 'group' && groupId) {
					formData.set('groupId', groupId);
				}
				formData.set('tags', JSON.stringify(allActiveTags));

				clearMainFeedState();
				if (data.sessionUser.username) {
					clearProfileState(data.sessionUser.username, 'posts');
				}

				return async ({ update }) => {
					clearMainFeedState();
					if (data.sessionUser.username) {
						clearProfileState(data.sessionUser.username, 'posts');
					}
					await update();
					loading = false;
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

			<div class="settings-section">
				<div class="setting-row">
					<span class="label-title">
						<Icon name="status.visibility" size={16} />
						<span>Visibilité</span>
					</span>
					<VisibilitySelect
						initialVisibility={visibility}
						initialGroupId={groupId}
						onToggle={(newVis, newGroupId) => {
							visibility = newVis;
							groupId = newGroupId || null;
						}}
					/>
				</div>

				<div class="submit-section">
					<button
						type="submit"
						class="btn-publish"
						disabled={loading ||
							(isSimpleText && !items[0].text.trim() && !attachedIconSet && !attachedEmojiSet)}
					>
						{loading ? 'Publication...' : 'Publier'}
					</button>
				</div>
			</div>
		</form>
	{/if}
</div>

<style>
	.publish-wrapper {
		width: 100%;
		background: var(--bg-surface, #ffffff);
		display: flex;
		flex-direction: column;
		flex: 1;
	}

	.mode-tabs {
		display: flex;
		border-bottom: 1px solid var(--border-color, #eaeaea);
		background: var(--bg-surface, #ffffff);
	}
	.mode-tab {
		flex: 1;
		padding: var(--space-3, 12px);
		border: none;
		background: transparent;
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--text-muted, #777);
		cursor: pointer;
		border-bottom: 2px solid transparent;
		transition: all 0.2s ease;
	}
	.mode-tab.active {
		color: var(--primary, #0ea5e9);
		border-bottom-color: var(--primary, #0ea5e9);
	}

	.alert-box {
		margin: var(--space-4, 16px);
		padding: var(--space-3, 12px);
		border-radius: var(--space-2, 8px);
		font-size: 0.95rem;
		font-weight: 500;
		text-align: center;
	}
	.alert-box.error {
		background: #fee2e2;
		color: #dc2626;
		border: 1px solid #fecaca;
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

	.settings-section {
		padding: var(--space-4, 16px);
		border-bottom: 1px solid var(--border-color, #eaeaea);
	}
	.setting-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.label-title {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		font-size: 0.95rem;
		font-weight: 600;
		color: #334155;
		line-height: 1;
	}
	.submit-section {
		padding: var(--space-6, 24px) 0 var(--space-4, 16px) 0;
	}
	.btn-publish {
		width: 100%;
		padding: var(--space-4, 16px);
		background: var(--primary, #0ea5e9);
		color: #fff;
		border: none;
		border-radius: 30px;
		font-weight: bold;
		font-size: 1.1rem;
		cursor: pointer;
	}
	.btn-publish:disabled {
		opacity: 0.5;
	}
</style>
