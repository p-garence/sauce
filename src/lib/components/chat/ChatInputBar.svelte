<script lang="ts">
	/* eslint-disable svelte/no-dom-manipulating */
	/**
	 * @component ChatInputBar
	 * @domain chat
	 * @description Zone de saisie principale du chat (champ riche, mentions, émojis, pièces jointes et déclencheur vocal).
	 *
	 * @responsibilities
	 * - Afficher le bandeau d'aperçu de la pièce jointe ou du vocal prêt à l'envoi.
	 * - Proposer le champ texte riche avec auto-complétion des mentions et émojis.
	 * - Gérer l'envoi multipart (`?/sendMessage`) et réinitialiser l'état local.
	 */

	import { enhance } from '$app/forms';
	import { formatBytes } from '$lib/utils/format';
	import type { EmojiItem, Message } from '$lib/types';
	import Icon from '$lib/components/ui/Icon.svelte';
	import EmojiButton from '$lib/components/ui/EmojiButton.svelte';
	import MentionSuggestions from '$lib/components/ui/MentionSuggestions.svelte';
	import VoiceMessagePlayer from '$lib/components/chat/VoiceMessagePlayer.svelte';

	type ChatMessage = Message & {
		sender?: { name: string | null; username: string | null; image: string | null } | null;
	};

	interface Props {
		/** Identifiant du chat actif */
		chatId: string;
		/** Fichier actuellement sélectionné pour l'envoi (bindable) */
		selectedFile?: File | null;
		/** URL de données base64 pour la prévisualisation de l'image (bindable) */
		selectedFilePreview?: string | null;
		/** URL blob locale de l'enregistrement vocal (bindable) */
		recordedAudioUrl?: string | null;
		/** Vrai si l'enregistrement vocal est actuellement actif */
		isRecording?: boolean;
		/** Callback pour basculer l'état d'enregistrement vocal */
		onToggleVoiceRecording: () => void;
		/** Callback déclenché après l'envoi réussi d'un nouveau message */
		onMessageSent?: (newMessage: ChatMessage) => void;
	}

	let {
		chatId,
		selectedFile = $bindable(null),
		selectedFilePreview = $bindable(null),
		recordedAudioUrl = $bindable(null),
		isRecording = false,
		onToggleVoiceRecording,
		onMessageSent
	}: Props = $props();

	let messageContent = $state('');
	let messageInputElement = $state<HTMLDivElement | null>(null);
	let messageFormRef = $state<HTMLFormElement | null>(null);
	let fileInputRef = $state<HTMLInputElement | null>(null);
	let mentionSuggestionsRef: MentionSuggestions | undefined = $state();
	let isSubmitting = $state(false);
	let savedSelectionRange: Range | null = null;

	let isVoiceSelected = $derived(
		Boolean(
			selectedFile &&
				(selectedFile.type.startsWith('audio') ||
					/\.(webm|ogg|wav|mp3|m4a|aac)$/i.test(selectedFile.name))
		)
	);

	export function submitForm() {
		messageFormRef?.requestSubmit();
	}

	function serializeEditorNode(node: Node): string {
		if (node.nodeType === Node.TEXT_NODE) {
			return (node.textContent || '').replace(/\u00A0/g, ' ');
		}
		if (node instanceof HTMLImageElement && node.dataset.emojiId) {
			return `:${node.dataset.emojiId}:`;
		}
		if (node.nodeName === 'BR') {
			return '';
		}
		let out = '';
		for (const child of Array.from(node.childNodes)) {
			out += serializeEditorNode(child);
		}
		return out;
	}

	function saveEditorSelection() {
		if (typeof window === 'undefined' || !messageInputElement) return;
		const sel = window.getSelection();
		if (sel && sel.rangeCount > 0) {
			const r = sel.getRangeAt(0);
			if (messageInputElement.contains(r.commonAncestorContainer)) {
				savedSelectionRange = r.cloneRange();
			}
		}
	}

	function handleRichEditorInput() {
		if (!messageInputElement) return;
		const serialized = serializeEditorNode(messageInputElement);
		messageContent = serialized;
		if (!serialized.trim() && !messageInputElement.querySelector('img')) {
			messageInputElement.innerHTML = '';
		}
		saveEditorSelection();
	}

	function handleRichEditorPaste(e: ClipboardEvent) {
		e.preventDefault();
		const text = e.clipboardData?.getData('text/plain') || '';
		if (!text) return;
		document.execCommand('insertText', false, text);
		handleRichEditorInput();
	}

	function insertEmoji(emoji: EmojiItem) {
		if (!messageInputElement) return;
		messageInputElement.focus();

		const img = document.createElement('img');
		img.src = emoji.url;
		img.alt = `:${emoji.name}:`;
		img.title = `:${emoji.name}:`;
		img.dataset.emojiId = emoji.id;
		img.className = 'inline-input-emoji';
		img.draggable = false;

		const spaceNode = document.createTextNode('\u00A0');
		const sel = window.getSelection();
		let range: Range | null = null;

		if (
			savedSelectionRange &&
			messageInputElement.contains(savedSelectionRange.commonAncestorContainer)
		) {
			range = savedSelectionRange.cloneRange();
		} else if (
			sel &&
			sel.rangeCount > 0 &&
			messageInputElement.contains(sel.getRangeAt(0).commonAncestorContainer)
		) {
			range = sel.getRangeAt(0);
		}

		if (range) {
			range.deleteContents();
			range.insertNode(spaceNode);
			range.insertNode(img);
			range.setStartAfter(spaceNode);
			range.collapse(true);
			if (sel) {
				sel.removeAllRanges();
				sel.addRange(range);
			}
			savedSelectionRange = range.cloneRange();
		} else {
			messageInputElement.appendChild(img);
			messageInputElement.appendChild(spaceNode);
			const newRange = document.createRange();
			newRange.setStartAfter(spaceNode);
			newRange.collapse(true);
			if (sel) {
				sel.removeAllRanges();
				sel.addRange(newRange);
			}
			savedSelectionRange = newRange.cloneRange();
		}

		handleRichEditorInput();
	}

	function handleFileSelect(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		selectedFile = file;
		if (file.type.startsWith('image/')) {
			const reader = new FileReader();
			reader.onload = (ev) => {
				selectedFilePreview = ev.target?.result as string;
			};
			reader.readAsDataURL(file);
		} else {
			selectedFilePreview = null;
		}
	}

	function clearSelectedFile() {
		selectedFile = null;
		selectedFilePreview = null;
		if (recordedAudioUrl) {
			URL.revokeObjectURL(recordedAudioUrl);
			recordedAudioUrl = null;
		}
		if (fileInputRef) {
			fileInputRef.value = '';
		}
	}
</script>

<div class="chat-input-area">
	<!-- Bandeau d'aperçu du fichier ou vocal prêt à l'envoi -->
	{#if selectedFile && !isRecording}
		<div class="file-preview-strip" class:is-voice={isVoiceSelected}>
			{#if isVoiceSelected && recordedAudioUrl}
				<VoiceMessagePlayer src={recordedAudioUrl} isSent={false} name="Aperçu vocal" />
			{:else if selectedFilePreview}
				<img src={selectedFilePreview} alt="Aperçu" class="strip-thumb" />
			{:else}
				<div class="strip-icon">
					<Icon name={isVoiceSelected ? 'action.mic' : 'action.attachment'} size={18} />
				</div>
			{/if}
			{#if !isVoiceSelected}
				<div class="strip-details">
					<span class="strip-filename">{selectedFile.name}</span>
					<span class="strip-filesize">{formatBytes(selectedFile.size)}</span>
				</div>
			{/if}
			<button
				type="button"
				class="strip-remove-btn"
				onclick={clearSelectedFile}
				title="Annuler la pièce jointe"
				disabled={isSubmitting}
				aria-label="Supprimer la pièce jointe"
			>
				✕
			</button>
		</div>
	{/if}

	<div class="chat-toolbar">
		<button
			type="button"
			class="toolbar-tool-btn"
			title="Joindre un fichier ou une photo"
			onclick={() => fileInputRef?.click()}
			disabled={isSubmitting || isRecording}
			aria-label="Joindre un fichier"
		>
			<Icon name="action.attachment" size={18} />
		</button>
		<EmojiButton
			onSelect={insertEmoji}
			disabled={isSubmitting || isRecording}
			variant="toolbar"
			align="left"
		/>
		<button
			type="button"
			class="toolbar-tool-btn mic-btn"
			class:recording-active={isRecording}
			title={isRecording ? "Arrêter l'enregistrement" : "Enregistrer un message vocal"}
			onclick={onToggleVoiceRecording}
			disabled={isSubmitting}
			aria-label="Enregistrer un message vocal"
		>
			<Icon name="action.mic" size={18} />
		</button>
	</div>

	<form
		bind:this={messageFormRef}
		method="POST"
		action="?/sendMessage"
		class="message-form"
		enctype="multipart/form-data"
		use:enhance={({ formData }) => {
			isSubmitting = true;
			formData.set('content', messageContent);
			if (selectedFile) {
				formData.set('file', selectedFile);
			}
			return async ({ result, update }) => {
				if (result.type === 'success' && result.data?.newMessage && onMessageSent) {
					onMessageSent(result.data.newMessage as ChatMessage);
					clearSelectedFile();
				} else if (result.type === 'success' && result.data?.error) {
					alert(result.data.error);
				} else if (result.type === 'failure' && result.data?.error) {
					alert(result.data.error);
				}
				await update({ reset: true });
				messageContent = '';
				if (messageInputElement) {
					messageInputElement.innerHTML = '';
				}
				savedSelectionRange = null;
				isSubmitting = false;
			};
		}}
	>
		<input
			type="file"
			bind:this={fileInputRef}
			onchange={handleFileSelect}
			class="sr-only"
			tabindex="-1"
		/>
		<input type="hidden" name="content" value={messageContent} />
		<div class="input-wrapper">
			<MentionSuggestions
				bind:this={mentionSuggestionsRef}
				bind:value={messageContent}
				inputElement={messageInputElement}
				{chatId}
			/>
			<div
				bind:this={messageInputElement}
				class="rich-chat-input"
				contenteditable={isSubmitting ? 'false' : 'true'}
				role="textbox"
				tabindex="0"
				aria-multiline="false"
				data-placeholder={selectedFile
					? 'Ajouter un message (optionnel)...'
					: 'Écrire un message...'}
				oninput={handleRichEditorInput}
				onkeyup={saveEditorSelection}
				onmouseup={saveEditorSelection}
				onpaste={handleRichEditorPaste}
				onkeydown={(e) => {
					if (mentionSuggestionsRef?.handleKeydown(e)) return;
					if (e.key === 'Enter' && !e.shiftKey) {
						e.preventDefault();
						if (!isSubmitting && (messageContent.trim() || selectedFile)) {
							messageFormRef?.requestSubmit();
						}
					}
				}}
			></div>
		</div>
		<button type="submit" disabled={isSubmitting || (!messageContent.trim() && !selectedFile)}>
			Envoyer
		</button>
	</form>
</div>

<style>
	.chat-input-area {
		display: flex;
		flex-direction: column;
		background: #ffffff;
		border-top: 1px solid #f0f0f0;
		flex-shrink: 0;
	}

	.chat-toolbar {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 16px 0 16px;
	}

	.toolbar-tool-btn {
		width: 34px;
		height: 34px;
		border-radius: 50%;
		border: none;
		background: transparent;
		color: #64748b;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.15s ease;
		padding: 0;
	}

	.toolbar-tool-btn:hover:not(:disabled) {
		background: #f1f5f9;
		color: #0f172a;
	}

	.toolbar-tool-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.mic-btn.recording-active {
		background: #fee2e2;
		color: #ef4444;
		animation: pulse-mic 1.2s infinite ease-in-out;
	}

	@keyframes pulse-mic {
		0%,
		100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.1);
		}
	}

	.file-preview-strip {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 16px;
		background: #f8fafc;
		border-bottom: 1px solid #f1f5f9;
	}

	.file-preview-strip.is-voice {
		background: #f0fdf4;
		border-bottom-color: #dcfce7;
	}

	.strip-thumb {
		width: 36px;
		height: 36px;
		border-radius: 6px;
		object-fit: cover;
		flex-shrink: 0;
		border: 1px solid #e2e8f0;
	}

	.strip-icon {
		width: 36px;
		height: 36px;
		border-radius: 6px;
		background: #e2e8f0;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #475569;
		flex-shrink: 0;
	}

	.strip-details {
		display: flex;
		flex-direction: column;
		min-width: 0;
		flex: 1;
	}

	.strip-filename {
		font-size: 0.85rem;
		font-weight: 600;
		color: #1e293b;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.strip-filesize {
		font-size: 0.75rem;
		color: #64748b;
	}

	.strip-remove-btn {
		background: none;
		border: none;
		color: #94a3b8;
		font-size: 1rem;
		cursor: pointer;
		padding: 4px 8px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.strip-remove-btn:hover {
		color: #ef4444;
	}

	.message-form {
		display: flex;
		align-items: flex-end;
		gap: 8px;
		padding: 8px 16px 12px 16px;
	}

	.input-wrapper {
		flex: 1;
		position: relative;
		display: flex;
		min-width: 0;
	}

	.rich-chat-input {
		width: 100%;
		min-height: 44px;
		max-height: 110px;
		overflow-y: auto;
		padding: 10px 16px;
		border: 1px solid #e2e8f0;
		border-radius: 24px;
		outline: none;
		font-size: 0.95rem;
		line-height: 1.4;
		background: #fff;
		color: #1e293b;
		box-sizing: border-box;
		word-break: break-word;
		white-space: pre-wrap;
	}

	.rich-chat-input:focus {
		border-color: #0ea5e9;
	}

	.rich-chat-input:empty::before {
		content: attr(data-placeholder);
		color: #94a3b8;
		pointer-events: none;
	}

	:global(.inline-input-emoji) {
		width: 1.4em;
		height: 1.4em;
		vertical-align: -0.3em;
		object-fit: contain;
		display: inline-block;
		margin: 0 2px;
		user-select: all;
	}

	.message-form button {
		background: #0ea5e9;
		color: white;
		border: none;
		padding: 0 20px;
		border-radius: 24px;
		font-weight: bold;
		cursor: pointer;
		height: 44px;
		transition: background 0.15s ease;
	}

	.message-form button:hover:not(:disabled) {
		background: #0284c7;
	}

	.message-form button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>
