<script lang="ts">
	/* eslint-disable svelte/no-dom-manipulating */
	/**
	 * @component CommentComposer
	 * @domain comments
	 * @description Zone de saisie riche pour rédiger et publier un commentaire ou une réponse (mentions, émojis et soumission asynchrone).
	 *
	 * @responsibilities
	 * - Proposer un champ éditable riche avec support des mentions (`@utilisateur`) et insertion d'émojis custom.
	 * - Afficher l'indicateur de réponse ciblée (`replyTo`) avec bouton d'annulation.
	 * - Sérialiser le texte riche et soumettre le commentaire via `apiPostComment`.
	 * - Inviter à la connexion si l'utilisateur est anonyme.
	 */

	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import type { CommentData, EmojiItem } from '$lib/types';
	import { apiPostComment } from '$lib/client/api';
	import EmojiButton from '$lib/components/ui/EmojiButton.svelte';
	import MentionSuggestions from '$lib/components/ui/MentionSuggestions.svelte';

	interface Props {
		/** Identifiant de la publication ciblée */
		postId: string;
		/** Cible éventuelle de réponse (bindable) */
		replyTo?: { id: string; username: string } | null;
		/** Callback déclenché lors de la création réussie d'un commentaire */
		onCommentSubmitted?: (addedComment: CommentData) => void;
		/** Callback d'annulation de la réponse */
		onCancelReply?: () => void;
	}

	let {
		postId,
		replyTo = $bindable(null),
		onCommentSubmitted,
		onCancelReply
	}: Props = $props();

	let commentInputElement = $state<HTMLElement | null>(null);
	let mentionSuggestionsRef: MentionSuggestions | undefined = $state();
	let savedSelectionRange = $state<Range | null>(null);

	let newComment = $state('');
	let isSubmitting = $state(false);

	/**
	 * Méthode publique pour initialiser une réponse depuis un sous-commentaire
	 */
	export function setReplyTarget(targetId: string, username: string, isSubReply = false) {
		replyTo = { id: targetId, username };
		newComment = isSubReply ? `@${username} ` : '';
		if (commentInputElement) {
			commentInputElement.textContent = newComment;
			commentInputElement.focus();
			const range = document.createRange();
			range.selectNodeContents(commentInputElement);
			range.collapse(false);
			const sel = window.getSelection();
			sel?.removeAllRanges();
			sel?.addRange(range);
			savedSelectionRange = range.cloneRange();
		}
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
		if (typeof window === 'undefined' || !commentInputElement) return;
		const sel = window.getSelection();
		if (sel && sel.rangeCount > 0) {
			const r = sel.getRangeAt(0);
			if (commentInputElement.contains(r.commonAncestorContainer)) {
				savedSelectionRange = r.cloneRange();
			}
		}
	}

	function handleRichEditorInput() {
		if (!commentInputElement) return;
		const serialized = serializeEditorNode(commentInputElement);
		newComment = serialized;
		if (!serialized.trim() && !commentInputElement.querySelector('img')) {
			commentInputElement.innerHTML = '';
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
		if (!commentInputElement) return;
		commentInputElement.focus();

		const img = document.createElement('img');
		img.src = emoji.url;
		img.alt = `:${emoji.name}:`;
		img.title = `:${emoji.name}:`;
		img.dataset.emojiId = emoji.id;
		img.className = 'inline-input-emoji';
		img.draggable = false;

		const spaceNode = document.createTextNode('\u00A0');
		const sel = window.getSelection();
		let range: Range;

		if (
			savedSelectionRange &&
			commentInputElement.contains(savedSelectionRange.commonAncestorContainer)
		) {
			range = savedSelectionRange.cloneRange();
		} else {
			range = document.createRange();
			range.selectNodeContents(commentInputElement);
			range.collapse(false);
		}

		range.deleteContents();
		range.insertNode(spaceNode);
		range.insertNode(img);

		const newRange = document.createRange();
		newRange.setStartAfter(spaceNode);
		newRange.collapse(true);
		sel?.removeAllRanges();
		sel?.addRange(newRange);
		savedSelectionRange = newRange.cloneRange();

		handleRichEditorInput();
	}

	function cancelReply() {
		replyTo = null;
		onCancelReply?.();
	}

	async function submitComment() {
		if (!newComment.trim() || isSubmitting) return;

		isSubmitting = true;
		try {
			const addedComment = (await apiPostComment(
				postId,
				newComment,
				replyTo?.id || null
			)) as CommentData;

			if (addedComment) {
				newComment = '';
				if (commentInputElement) {
					commentInputElement.innerHTML = '';
				}
				savedSelectionRange = null;
				replyTo = null;
				onCommentSubmitted?.(addedComment);
			}
		} catch (err) {
			console.error(err);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="comment-footer">
	{#if replyTo}
		<div class="reply-indicator">
			<span>En réponse à <strong>@{replyTo.username}</strong></span>
			<button type="button" class="cancel-reply" onclick={cancelReply} aria-label="Annuler la réponse">
				✕
			</button>
		</div>
	{/if}

	{#if page.data.sessionUser}
		<form
			class="comment-form"
			onsubmit={(e) => {
				e.preventDefault();
				submitComment();
			}}
		>
			<div class="input-wrapper">
				<MentionSuggestions
					bind:this={mentionSuggestionsRef}
					bind:value={newComment}
					inputElement={commentInputElement}
				/>
				<div
					bind:this={commentInputElement}
					id="comment-input-{postId}"
					class="rich-comment-input"
					contenteditable={isSubmitting ? 'false' : 'true'}
					role="textbox"
					tabindex="0"
					aria-multiline="true"
					data-placeholder="Ajouter un commentaire..."
					oninput={handleRichEditorInput}
					onkeyup={saveEditorSelection}
					onmouseup={saveEditorSelection}
					onpaste={handleRichEditorPaste}
					onkeydown={(e) => {
						if (mentionSuggestionsRef?.handleKeydown(e)) return;
						if (e.key === 'Enter' && !e.shiftKey) {
							e.preventDefault();
							submitComment();
						}
					}}
				></div>
			</div>

			<EmojiButton
				onSelect={insertEmoji}
				disabled={isSubmitting}
				variant="inline"
				align="right"
			/>

			<button
				type="submit"
				class="btn-submit"
				disabled={isSubmitting || newComment.trim() === ''}
			>
				Publier
			</button>
		</form>
	{:else}
		<div class="login-to-comment">
			<a href={resolve('/login')} class="login-comment-link">Connectez-vous</a> pour laisser un commentaire.
		</div>
	{/if}
</div>

<style>
	.comment-footer {
		padding: 12px 16px;
		border-top: 1px solid #f0f0f0;
		background: #ffffff;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.reply-indicator {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 0.8rem;
		color: #64748b;
		background: #f1f5f9;
		padding: 4px 8px;
		border-radius: 4px;
	}

	.cancel-reply {
		background: none;
		border: none;
		cursor: pointer;
		font-size: 0.8rem;
		color: #94a3b8;
		padding: 0 4px;
	}

	.cancel-reply:hover {
		color: #0f172a;
	}

	.comment-form {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
	}

	.input-wrapper {
		position: relative;
		flex: 1;
		min-width: 0;
	}

	.rich-comment-input {
		width: 100%;
		min-height: 38px;
		max-height: 120px;
		overflow-y: auto;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 20px;
		padding: 8px 16px;
		font-size: 0.9rem;
		font-family: inherit;
		color: #0f172a;
		outline: none;
		box-sizing: border-box;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.rich-comment-input:focus {
		border-color: #0284c7;
		background: #ffffff;
	}

	.rich-comment-input:empty::before {
		content: attr(data-placeholder);
		color: #94a3b8;
		pointer-events: none;
	}

	:global(.inline-input-emoji) {
		width: 1.25em;
		height: 1.25em;
		vertical-align: -0.2em;
		display: inline-block;
	}

	.btn-submit {
		background: none;
		border: none;
		color: #0284c7;
		font-weight: 700;
		font-size: 0.9rem;
		cursor: pointer;
		padding: 6px 12px;
		border-radius: 16px;
		transition: background 0.15s ease;
	}

	.btn-submit:hover:not(:disabled) {
		background: #f0f9ff;
	}

	.btn-submit:disabled {
		color: #cbd5e1;
		cursor: not-allowed;
	}

	.login-to-comment {
		text-align: center;
		font-size: 0.85rem;
		color: #64748b;
		padding: 6px 0;
	}

	.login-comment-link {
		color: #0284c7;
		font-weight: 600;
		text-decoration: underline;
	}
</style>
