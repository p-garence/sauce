<script lang="ts">
	/**
	 * @component StoryCreator
	 * @domain stories
	 * @description Interface complète de création et publication d'une story (photo, vidéo, caméra en direct, durée et visibilité).
	 *
	 * @responsibilities
	 * - Capturer ou sélectionner un média (image/vidéo) via galerie ou caméra en direct.
	 * - Ouvrir l'éditeur de médias pour recadrer et retoucher avant publication.
	 * - Configurer la légende, la visibilité, la durée d'expiration et la sauvegarde automatique dans les archives.
	 * - Envoyer les données vers l'API `/api/stories`.
	 */

	import { onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { MAX_MEDIA_SIZE_BYTES } from '$lib/constants';
	import { mediaEditor } from '$lib/client/mediaEditorState.svelte';
	import { clearMainFeedState } from '$lib/client/feedMemory.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import EmojiButton from '$lib/components/ui/EmojiButton.svelte';
	import RichTextInput from '$lib/components/ui/RichTextInput.svelte';
	import VisibilitySelect from '$lib/components/post/VisibilitySelect.svelte';
	import type { EmojiItem, PostVisibility } from '$lib/types';

	interface Props {
		/** Callback appelé après la publication réussie de la story */
		onPublished?: () => void;
	}

	let { onPublished }: Props = $props();

	let storyMedia = $state<{ file: File; url: string; type: 'image' | 'video' } | null>(null);
	let storyCaption = $state('');
	let storyVisibility = $state<PostVisibility>('public');
	let storyGroupId = $state<string | null>(null);
	let storyDuration = $state<'24h' | '48h' | 'custom' | 'never'>('24h');
	let storyCustomHours = $state(72);
	let storyAutoArchive = $state(true);

	let storyFileInput = $state<HTMLInputElement>();
	let storyCameraInput = $state<HTMLInputElement>();
	let storyCaptionRichInputRef = $state<RichTextInput | null>(null);

	let loading = $state(false);
	let errorMessage = $state('');

	onDestroy(() => {
		if (storyMedia?.url && storyMedia.url.startsWith('blob:')) {
			try {
				URL.revokeObjectURL(storyMedia.url);
			} catch {
				/* ignore */
			}
		}
	});

	function insertStoryCaptionEmoji(emoji: EmojiItem) {
		storyCaptionRichInputRef?.insertEmoji(emoji);
	}

	function handleStoryFileSelect(e: Event) {
		const target = e.target as HTMLInputElement;
		errorMessage = '';

		if (target.files && target.files.length > 0) {
			const file = target.files[0];
			if (file.size > MAX_MEDIA_SIZE_BYTES) {
				errorMessage = `Le fichier "${file.name}" est trop lourd.`;
				target.value = '';
				return;
			}

			mediaEditor.open([file], '4:5', onStoryEditorSave);
			target.value = '';
		}
	}

	function onStoryEditorSave(croppedFile: File) {
		if (storyMedia?.url) URL.revokeObjectURL(storyMedia.url);
		storyMedia = {
			file: croppedFile,
			url: URL.createObjectURL(croppedFile),
			type: croppedFile.type.startsWith('video') ? 'video' : 'image'
		};
	}

	async function submitStory() {
		if (!storyMedia) return;
		loading = true;
		errorMessage = '';

		try {
			const formData = new FormData();
			formData.append('file', storyMedia.file);
			formData.append('caption', storyCaption);
			formData.append('visibility', storyVisibility);
			if (storyVisibility === 'group' && storyGroupId) {
				formData.append('groupId', storyGroupId);
			}
			formData.append('duration', storyDuration);
			if (storyDuration === 'custom') {
				formData.append('customHours', String(storyCustomHours));
			}
			formData.append('isArchived', storyAutoArchive ? 'true' : 'false');

			const res = await fetch('/api/stories', {
				method: 'POST',
				body: formData
			});

			const result = await res.json();
			if (res.ok && result.success) {
				clearMainFeedState();
				if (onPublished) {
					onPublished();
				} else {
					goto(resolve('/flux'));
				}
			} else {
				errorMessage = result.message || 'Erreur lors de la publication de la story';
			}
		} catch (err) {
			console.error(err);
			errorMessage = 'Erreur réseau lors de la publication';
		} finally {
			loading = false;
		}
	}
</script>

<div class="story-creator">
	{#if errorMessage}
		<div class="alert-box error">
			{errorMessage}
		</div>
	{/if}

	<div class="story-preview-container">
		{#if storyMedia}
			<div class="media-slide">
				{#if storyMedia.type === 'video'}
					<video src={storyMedia.url} controls autoplay muted loop playsinline></video>
				{:else}
					<img src={storyMedia.url} alt="Aperçu Story" />
				{/if}
			</div>

			<div class="story-overlay-actions">
				<button
					type="button"
					class="btn-pill"
					onclick={() => {
						if (storyMedia) mediaEditor.open([storyMedia.file], '4:5', onStoryEditorSave);
					}}
				>
					<Icon name="action.edit" size={14} /> Modifier
				</button>
				<button
					type="button"
					class="btn-pill danger"
					onclick={() => {
						if (storyMedia?.url) URL.revokeObjectURL(storyMedia.url);
						storyMedia = null;
					}}
				>
					<Icon name="action.close" size={14} /> Retirer
				</button>
			</div>
		{:else}
			<div class="story-placeholder">
				<div class="story-choice-grid">
					<button
						type="button"
						class="story-choice-btn camera"
						onclick={() => storyCameraInput?.click()}
					>
						<span class="choice-icon"><Icon name="media.camera" size={32} /></span>
						<span class="choice-title">Prendre une photo ou vidéo</span>
						<span class="choice-desc">Ouvrir la caméra en direct</span>
					</button>

					<button
						type="button"
						class="story-choice-btn files"
						onclick={() => storyFileInput?.click()}
					>
						<span class="choice-icon"><Icon name="media.image" size={32} /></span>
						<span class="choice-title">Choisir dans la galerie</span>
						<span class="choice-desc">Parcourir vos fichiers</span>
					</button>
				</div>
			</div>
		{/if}
	</div>

	<!-- Input Caméra directe -->
	<input
		type="file"
		accept="image/*,video/*"
		capture="environment"
		bind:this={storyCameraInput}
		onchange={handleStoryFileSelect}
		hidden
	/>

	<!-- Input Fichiers / Galerie classique -->
	<input
		type="file"
		accept="image/jpeg, image/png, image/webp, video/mp4, video/quicktime"
		bind:this={storyFileInput}
		onchange={handleStoryFileSelect}
		hidden
	/>

	{#if storyMedia}
		<!-- Légende optionnelle -->
		<div class="caption-section">
			<RichTextInput
				bind:this={storyCaptionRichInputRef}
				bind:value={storyCaption}
				placeholder="Ajouter une légende (optionnelle)..."
				class="caption-rich-input"
			/>
			<div class="caption-toolbar">
				<EmojiButton onSelect={insertStoryCaptionEmoji} variant="inline" align="left" />
			</div>
		</div>

		<!-- Paramètres de la story -->
		<div class="settings-section">
			<div class="setting-row">
				<span class="label-title">
					<Icon name="status.visibility" size={16} />
					<span>Visibilité</span>
				</span>
				<VisibilitySelect
					initialVisibility={storyVisibility}
					initialGroupId={storyGroupId}
					onToggle={(newVis, newGroupId) => {
						storyVisibility = newVis;
						storyGroupId = newGroupId || null;
					}}
				/>
			</div>

			<div class="setting-row duration-row">
				<span class="label-title">
					<Icon name="status.time" size={16} />
					<span>Durée</span>
				</span>
				<div class="duration-selector">
					<button
						type="button"
						class="btn-duration"
						class:active={storyDuration === '24h'}
						onclick={() => (storyDuration = '24h')}
					>
						24h
					</button>
					<button
						type="button"
						class="btn-duration"
						class:active={storyDuration === '48h'}
						onclick={() => (storyDuration = '48h')}
					>
						48h
					</button>
					<button
						type="button"
						class="btn-duration"
						class:active={storyDuration === 'custom'}
						onclick={() => (storyDuration = 'custom')}
					>
						Autre
					</button>
					<button
						type="button"
						class="btn-duration"
						class:active={storyDuration === 'never'}
						onclick={() => (storyDuration = 'never')}
					>
						Permanente
					</button>
				</div>
			</div>

			{#if storyDuration === 'custom'}
				<div class="custom-hours-box">
					<label for="story_custom_hours_input">Durée en heures :</label>
					<input
						id="story_custom_hours_input"
						type="number"
						min="1"
						max="8760"
						bind:value={storyCustomHours}
						class="custom-hours-input"
					/>
					<span class="custom-hours-hint">
						({Math.max(1, Math.round(storyCustomHours / 24))} jour{Math.round(
							storyCustomHours / 24
						) > 1
							? 's'
							: ''})
					</span>
				</div>
			{/if}

			{#if storyDuration !== 'never'}
				<div class="setting-row archive-row">
					<label class="archive-checkbox-label">
						<input type="checkbox" bind:checked={storyAutoArchive} />
						<div class="archive-text">
							<span class="label-title">Conserver l'archive</span>
							<span class="archive-desc">
								La story n'est pas supprimée définitivement après expiration
							</span>
						</div>
					</label>
				</div>
			{/if}

			<div class="submit-section">
				<button type="button" class="btn-publish" disabled={loading} onclick={submitStory}>
					{loading ? 'Publication...' : 'Publier'}
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.story-creator {
		display: flex;
		flex-direction: column;
		width: 100%;
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

	.story-preview-container {
		width: 100%;
		aspect-ratio: 4 / 5;
		background: #000;
		position: relative;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	@media (min-width: 600px) {
		.story-preview-container {
			max-height: 65vh;
			max-width: calc(65vh * 4 / 5);
			margin-inline: auto;
		}
	}

	.media-slide {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}

	.media-slide img,
	.media-slide video {
		width: 100%;
		height: 100%;
		object-fit: contain;
		display: block;
	}

	.story-overlay-actions {
		position: absolute;
		top: 12px;
		right: 12px;
		display: flex;
		gap: 8px;
		z-index: 10;
	}

	.btn-pill {
		padding: 6px 12px;
		border-radius: 20px;
		background: rgba(0, 0, 0, 0.6);
		color: #fff;
		border: 1px solid rgba(255, 255, 255, 0.2);
		font-size: 0.85rem;
		cursor: pointer;
		backdrop-filter: blur(4px);
		transition: background 0.15s;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		line-height: 1;
	}

	.btn-pill:hover {
		background: rgba(0, 0, 0, 0.85);
	}

	.btn-pill.danger {
		background: rgba(220, 38, 38, 0.7);
	}

	.btn-pill.danger:hover {
		background: rgba(220, 38, 38, 0.9);
	}

	.story-placeholder {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--space-6, 24px);
		width: 100%;
		height: 100%;
		box-sizing: border-box;
	}

	.story-choice-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 16px;
		width: 100%;
		max-width: 320px;
	}

	.story-choice-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 24px 16px;
		background: rgba(255, 255, 255, 0.08);
		border: 1px dashed rgba(255, 255, 255, 0.3);
		border-radius: 16px;
		color: #ffffff;
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: center;
	}

	.story-choice-btn:hover {
		background: rgba(255, 255, 255, 0.16);
		border-color: rgba(255, 255, 255, 0.6);
		transform: translateY(-2px);
	}

	.story-choice-btn .choice-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.12);
		margin-bottom: 4px;
	}

	.story-choice-btn .choice-title {
		font-weight: 600;
		font-size: 0.95rem;
	}

	.story-choice-btn .choice-desc {
		font-size: 0.8rem;
		color: #94a3b8;
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

	.duration-row {
		margin-top: 14px;
	}

	.duration-selector {
		display: inline-flex;
		background: var(--bg-default, #f1f5f9);
		padding: 4px;
		border-radius: 20px;
		gap: 2px;
	}

	.btn-duration {
		padding: 4px 12px;
		background: transparent;
		border: none;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--text-muted, #64748b);
		border-radius: 16px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-duration:hover {
		color: var(--text-default, #0f172a);
	}

	.btn-duration.active {
		background: var(--bg-surface, #ffffff);
		color: var(--primary, #0ea5e9);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.custom-hours-box {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 10px;
		padding: 8px 12px;
		background: var(--bg-default, #f8fafc);
		border-radius: 8px;
		font-size: 0.9rem;
	}

	.custom-hours-input {
		width: 70px;
		padding: 4px 8px;
		border: 1px solid var(--border-color, #cbd5e1);
		border-radius: 6px;
		font-size: 0.9rem;
		text-align: center;
	}

	.custom-hours-hint {
		color: var(--text-muted, #64748b);
		font-size: 0.85rem;
	}

	.archive-row {
		margin-top: 14px;
		background: var(--bg-default, #f8fafc);
		padding: 10px 14px;
		border-radius: 8px;
		border: 1px solid var(--border-color, #e2e8f0);
	}

	.archive-checkbox-label {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		cursor: pointer;
		user-select: none;
	}

	.archive-checkbox-label input[type='checkbox'] {
		margin-top: 3px;
		cursor: pointer;
		width: 16px;
		height: 16px;
		accent-color: var(--primary, #0ea5e9);
	}

	.archive-text {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.archive-desc {
		font-size: 0.8rem;
		color: var(--text-muted, #64748b);
		line-height: 1.35;
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
