<!--
  @component RichTextInput
  @domain ui
  @description Champ de saisie riche contenteditable avec rendu en direct des émojis et mentions.
-->
<script lang="ts">
	/* eslint-disable svelte/no-dom-manipulating */
	import { onMount } from 'svelte';
	import { emojiStore } from '$lib/client/emojiStore.svelte';
	import type { EmojiItem } from '$lib/types';

	let {
		value = $bindable(''),
		placeholder = '',
		align = 'left',
		class: customClass = '',
		style: customStyle = '',
		onkeydown = undefined,
		oninput = undefined
	}: {
		value?: string;
		placeholder?: string;
		align?: 'left' | 'center' | 'right';
		class?: string;
		style?: string;
		onkeydown?: (e: KeyboardEvent) => void;
		oninput?: () => void;
	} = $props();

	let editorElement = $state<HTMLDivElement | null>(null);
	let savedRange = $state<Range | null>(null);
	let isInternalUpdate = false;

	function escapeAttr(str: string): string {
		return str
			.replace(/&/g, '&amp;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');
	}

	function textToHtml(raw: string): string {
		if (!raw) return '';
		const escaped = raw
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');

		return escaped
			.replace(/:([a-zA-Z0-9_-]{2,50}):/g, (match, key) => {
				const url = emojiStore.getEmojiUrl(key);
				if (url) {
					const displayName = emojiStore.getEmojiDisplayName(key);
					const safeUrl = escapeAttr(url);
					const safeName = escapeAttr(displayName);
					const safeKey = escapeAttr(key);
					return `<img src="${safeUrl}" alt=":${safeName}:" title=":${safeName}:" data-emoji-id="${safeKey}" class="inline-input-emoji" draggable="false" />`;
				}
				return match;
			})
			.replace(/\n/g, '<br>');
	}

	function serializeNode(node: Node, isRoot = false): string {
		if (node.nodeType === Node.TEXT_NODE) {
			return (node.textContent || '').replace(/\u00A0/g, ' ');
		}
		if (node instanceof HTMLImageElement && node.dataset.emojiId) {
			return `:${node.dataset.emojiId}:`;
		}
		if (node.nodeName === 'BR') {
			return '\n';
		}

		const children = Array.from(node.childNodes);

		// Si un div ou p ne contient qu'un <br> technique d'une ligne vide inséré par le navigateur
		if (!isRoot && children.length === 1 && children[0].nodeName === 'BR') {
			return '';
		}

		// Si l'éditeur racine ne contient rien ou qu'un simple <br> vide
		if (isRoot && (children.length === 0 || (children.length === 1 && children[0].nodeName === 'BR'))) {
			return '';
		}

		let out = '';
		for (let i = 0; i < children.length; i++) {
			const child = children[i];
			if (child.nodeName === 'DIV' || child.nodeName === 'P') {
				const inner = serializeNode(child, false);
				if (out.length > 0) {
					out += '\n' + inner;
				} else {
					out += inner;
				}
			} else {
				out += serializeNode(child, false);
			}
		}
		return out;
	}

	function saveSelection() {
		if (typeof window === 'undefined' || !editorElement) return;
		const sel = window.getSelection();
		if (sel && sel.rangeCount > 0) {
			const r = sel.getRangeAt(0);
			if (editorElement.contains(r.commonAncestorContainer)) {
				savedRange = r.cloneRange();
			}
		}
	}

	function handleInput() {
		if (!editorElement) return;
		isInternalUpdate = true;
		let serialized = serializeNode(editorElement, true).replace(/^\n+/, '');
		if (!editorElement.querySelector('img') && !serialized.replace(/\n/g, '').trim()) {
			serialized = '';
		}
		value = serialized;
		if (!serialized && !editorElement.querySelector('img')) {
			editorElement.innerHTML = '';
		}
		saveSelection();
		oninput?.();
		setTimeout(() => {
			isInternalUpdate = false;
		}, 0);
	}

	function handlePaste(e: ClipboardEvent) {
		e.preventDefault();
		const text = e.clipboardData?.getData('text/plain') || '';
		if (!text) return;
		document.execCommand('insertText', false, text);
		handleInput();
	}

	function handleKeydownInternal(e: KeyboardEvent) {
		if (e.key === 'Backspace' || e.key === 'Delete') {
			const sel = typeof window !== 'undefined' ? window.getSelection() : null;
			if (sel && sel.isCollapsed && sel.rangeCount > 0 && editorElement) {
				const range = sel.getRangeAt(0);
				if (e.key === 'Backspace') {
					let targetEmoji: HTMLImageElement | null = null;
					if (range.startContainer === editorElement) {
						const node = editorElement.childNodes[range.startOffset - 1];
						if (node instanceof HTMLImageElement && node.classList.contains('inline-input-emoji')) {
							targetEmoji = node;
						}
					} else if (range.startContainer.nodeType === Node.TEXT_NODE) {
						const textNode = range.startContainer as Text;
						if (range.startOffset === 0) {
							const prev = textNode.previousSibling;
							if (prev instanceof HTMLImageElement && prev.classList.contains('inline-input-emoji')) {
								targetEmoji = prev;
							}
						} else if (
							range.startOffset === 1 &&
							(textNode.textContent === '\u00A0' || textNode.textContent === ' ')
						) {
							const prev = textNode.previousSibling;
							if (prev instanceof HTMLImageElement && prev.classList.contains('inline-input-emoji')) {
								targetEmoji = prev;
								textNode.remove();
							}
						}
					}
					if (targetEmoji) {
						e.preventDefault();
						targetEmoji.remove();
						handleInput();
						return;
					}
				} else if (e.key === 'Delete') {
					let targetEmoji: HTMLImageElement | null = null;
					if (range.startContainer === editorElement) {
						const node = editorElement.childNodes[range.startOffset];
						if (node instanceof HTMLImageElement && node.classList.contains('inline-input-emoji')) {
							targetEmoji = node;
						}
					} else if (range.startContainer.nodeType === Node.TEXT_NODE) {
						const textNode = range.startContainer as Text;
						if (range.startOffset === (textNode.textContent?.length || 0)) {
							const next = textNode.nextSibling;
							if (next instanceof HTMLImageElement && next.classList.contains('inline-input-emoji')) {
								targetEmoji = next;
							}
						}
					}
					if (targetEmoji) {
						e.preventDefault();
						targetEmoji.remove();
						handleInput();
						return;
					}
				}
			}
		}

		onkeydown?.(e);
	}

	export function insertEmoji(emoji: EmojiItem) {
		if (!editorElement) return;
		editorElement.focus();

		const img = document.createElement('img');
		img.src = emoji.url;
		const emojiKey = emoji.name || emoji.id;
		img.alt = `:${emojiKey}:`;
		img.title = `:${emojiKey}:`;
		img.dataset.emojiId = emojiKey;
		img.className = 'inline-input-emoji';
		img.draggable = false;

		const spaceNode = document.createTextNode('\u00A0');
		const sel = window.getSelection();
		let range: Range;

		if (savedRange && editorElement.contains(savedRange.commonAncestorContainer)) {
			range = savedRange.cloneRange();
		} else if (
			sel &&
			sel.rangeCount > 0 &&
			editorElement.contains(sel.getRangeAt(0).commonAncestorContainer)
		) {
			range = sel.getRangeAt(0);
		} else {
			range = document.createRange();
			range.selectNodeContents(editorElement);
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
		savedRange = newRange.cloneRange();

		handleInput();
	}

	export function getElement(): HTMLDivElement | null {
		return editorElement;
	}

	export function focus() {
		if (!editorElement) return;
		editorElement.focus();
		if (typeof window !== 'undefined') {
			const sel = window.getSelection();
			if (sel) {
				if (sel.rangeCount > 0 && editorElement.contains(sel.getRangeAt(0).commonAncestorContainer)) {
					return;
				}
				const range = document.createRange();
				range.selectNodeContents(editorElement);
				range.collapse(false);
				sel.removeAllRanges();
				sel.addRange(range);
			}
		}
	}

	onMount(() => {
		if (editorElement) {
			editorElement.innerHTML = textToHtml(value);
		}
	});

	$effect(() => {
		if (isInternalUpdate) return;
		// Suivi réactif des émojis résolus pour remplacer les tokens bruts (ex: :photo:) par des images
		void emojiStore.emojiMap;
		if (editorElement) {
			const currentSerialized = serializeNode(editorElement, true);
			const newHtml = textToHtml(value);
			if (currentSerialized !== value || editorElement.innerHTML !== newHtml) {
				editorElement.innerHTML = newHtml;
			}
		}
	});
</script>

<div
	bind:this={editorElement}
	class="rich-text-input {customClass}"
	contenteditable="true"
	role="textbox"
	tabindex="0"
	aria-multiline="true"
	data-placeholder={placeholder}
	style="text-align: {align}; {customStyle}"
	oninput={handleInput}
	onkeyup={saveSelection}
	onmouseup={saveSelection}
	onpaste={handlePaste}
	onkeydown={handleKeydownInternal}
></div>

<style>
	.rich-text-input {
		display: block;
		outline: none;
		word-break: break-word;
		white-space: pre-wrap;
		box-sizing: border-box;
		cursor: text;
		min-height: 1.25em;
		caret-color: var(--caret-color, currentColor);
	}

	.rich-text-input:empty::before {
		content: attr(data-placeholder);
		color: var(--text-muted, #94a3b8);
		pointer-events: none;
		display: block;
	}

	.rich-text-input :global(.inline-input-emoji) {
		width: 1.35em;
		height: 1.35em;
		vertical-align: -0.22em;
		margin: 0 1px;
		display: inline-block;
		user-select: all;
		object-fit: contain;
	}
</style>
