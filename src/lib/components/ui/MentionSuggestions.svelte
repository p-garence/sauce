<!--
  @component MentionSuggestions
  @domain ui
  @description Menu flottant d'autocomplétion des mentions @utilisateur.
-->
<script lang="ts">
	import { untrack } from 'svelte';

	let {
		value = $bindable(''),
		inputElement,
		chatId,
		onselect,
		placement = 'top'
	}: {
		value: string;
		inputElement?: HTMLElement | HTMLInputElement | HTMLTextAreaElement | null;
		chatId?: string;
		onselect?: (username: string) => void;
		placement?: 'top' | 'bottom';
	} = $props();

	type SuggestionUser = {
		id: string;
		username: string;
		name: string | null;
		image: string | null;
		isChatMember?: boolean;
	};

	let isOpen = $state(false);
	let suggestions = $state<SuggestionUser[]>([]);
	let selectedIndex = $state(0);
	let mentionStartIndex = $state(-1);
	let activeTextNode: Text | null = null;
	let activeNodeCaretOffset = 0;
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	function isStandardInput(el: HTMLElement | null): el is HTMLInputElement | HTMLTextAreaElement {
		return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
	}

	function checkMentionTrigger() {
		if (!inputElement) {
			isOpen = false;
			return;
		}

		if (!isStandardInput(inputElement) && inputElement.isContentEditable) {
			const sel = typeof window !== 'undefined' ? window.getSelection() : null;
			if (!sel || !sel.anchorNode || !inputElement.contains(sel.anchorNode)) {
				isOpen = false;
				return;
			}
			if (sel.anchorNode.nodeType === Node.TEXT_NODE) {
				const textNode = sel.anchorNode as Text;
				const offset = sel.anchorOffset;
				const textBefore = (textNode.textContent || '').slice(0, offset);
				const match = /(?:^|\s)@([a-zA-Z0-9_.]*)$/.exec(textBefore);
				if (match) {
					activeTextNode = textNode;
					activeNodeCaretOffset = offset;
					mentionStartIndex = textBefore.lastIndexOf('@');
					fetchSuggestions(match[1] || '');
					return;
				}
			}
			isOpen = false;
			return;
		}

		const stdInput = inputElement as HTMLInputElement | HTMLTextAreaElement;
		const cursor = stdInput.selectionStart ?? value.length;
		const textBefore = value.slice(0, cursor);

		// Détecte "@" précédé d'un espace ou en tout début de texte
		const match = /(?:^|\s)@([a-zA-Z0-9_.]*)$/.exec(textBefore);

		if (match) {
			const query = match[1] || '';
			// Calcule l'indice exact du symbole '@'
			mentionStartIndex = textBefore.lastIndexOf('@');
			fetchSuggestions(query);
		} else {
			isOpen = false;
		}
	}

	function fetchSuggestions(query: string) {
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(async () => {
			try {
				let url = `/api/mention-suggestions?q=${encodeURIComponent(query)}`;
				if (chatId) url += `&chatId=${encodeURIComponent(chatId)}`;

				const res = await fetch(url);
				if (res.ok) {
					const data = await res.json();
					suggestions = data.users || [];
					selectedIndex = 0;
					isOpen = suggestions.length > 0;
				}
			} catch (err) {
				console.error('Erreur fetch mention suggestions:', err);
				isOpen = false;
			}
		}, 120);
	}

	export function selectUser(username: string) {
		if (!inputElement || mentionStartIndex < 0) return;

		if (!isStandardInput(inputElement) && inputElement.isContentEditable) {
			if (activeTextNode && inputElement.contains(activeTextNode)) {
				const fullText = activeTextNode.textContent || '';
				const beforeMention = fullText.slice(0, mentionStartIndex);
				const afterMention = fullText.slice(activeNodeCaretOffset);
				const insertedText = `@${username} `;
				activeTextNode.textContent = `${beforeMention}${insertedText}${afterMention}`;
				const newCaretPos = beforeMention.length + insertedText.length;

				isOpen = false;
				mentionStartIndex = -1;
				if (onselect) onselect(username);

				inputElement.focus();
				const sel = window.getSelection();
				if (sel) {
					const range = document.createRange();
					range.setStart(activeTextNode, Math.min(newCaretPos, activeTextNode.length));
					range.collapse(true);
					sel.removeAllRanges();
					sel.addRange(range);
				}
				inputElement.dispatchEvent(new Event('input', { bubbles: true }));
			}
			return;
		}

		const stdInput = inputElement as HTMLInputElement | HTMLTextAreaElement;
		const cursor = stdInput.selectionStart ?? value.length;
		const beforeMention = value.slice(0, mentionStartIndex);
		const afterMention = value.slice(cursor);

		const insertedText = `@${username} `;
		const newValue = `${beforeMention}${insertedText}${afterMention}`;
		const newCursorPos = beforeMention.length + insertedText.length;

		value = newValue;
		isOpen = false;
		mentionStartIndex = -1;

		if (onselect) onselect(username);

		// Repositionne le curseur après l'insertion
		setTimeout(() => {
			if (stdInput) {
				stdInput.focus();
				stdInput.setSelectionRange(newCursorPos, newCursorPos);
				stdInput.dispatchEvent(new Event('input', { bubbles: true }));
			}
		}, 0);
	}

	export function handleKeydown(e: KeyboardEvent): boolean {
		if (!isOpen || suggestions.length === 0) return false;

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = (selectedIndex + 1) % suggestions.length;
			return true;
		}

		if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = (selectedIndex - 1 + suggestions.length) % suggestions.length;
			return true;
		}

		if (e.key === 'Enter' || e.key === 'Tab') {
			e.preventDefault();
			if (suggestions[selectedIndex]) {
				selectUser(suggestions[selectedIndex].username);
				return true;
			}
		}

		if (e.key === 'Escape') {
			e.preventDefault();
			isOpen = false;
			return true;
		}

		return false;
	}

	$effect(() => {
		// Réagit aux frappes / changements de valeur
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		value;
		untrack(() => {
			checkMentionTrigger();
		});
	});
</script>

{#if isOpen && suggestions.length > 0}
	<div class="mention-dropdown placement-{placement}" role="listbox">
		{#each suggestions as user, i (user.id)}
			<button
				type="button"
				class="mention-item {i === selectedIndex ? 'active' : ''}"
				role="option"
				aria-selected={i === selectedIndex}
				onmousedown={(e) => {
					// onmousedown évite le blur de l'input avant la sélection
					e.preventDefault();
					selectUser(user.username);
				}}
			>
				{#if user.image}
					<img src={user.image} alt={user.username} class="avatar" />
				{:else}
					<div class="avatar placeholder">
						{(user.name || user.username).charAt(0).toUpperCase()}
					</div>
				{/if}

				<div class="user-info">
					<span class="user-name">
						{user.name || user.username}
						{#if user.isChatMember}
							<span class="chat-badge">Conversation</span>
						{/if}
					</span>
					<span class="user-handle">@{user.username}</span>
				</div>
			</button>
		{/each}
	</div>
{/if}

<style>
	.mention-dropdown {
		position: absolute;
		bottom: calc(100% + 6px);
		left: 0;
		right: 0;
		max-height: 220px;
		overflow-y: auto;
		background: var(--bg-surface, #ffffff);
		border: 1px solid var(--border-color, #e2e8f0);
		border-radius: 12px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
		z-index: 1000;
		display: flex;
		flex-direction: column;
		padding: 4px;
	}

	.mention-dropdown.placement-bottom {
		bottom: auto;
		top: calc(100% + 6px);
	}

	.mention-item {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 10px;
		border: none;
		background: transparent;
		border-radius: 8px;
		cursor: pointer;
		text-align: left;
		width: 100%;
		transition: background 0.15s;
		font-family: inherit;
	}

	.mention-item:hover,
	.mention-item.active {
		background: #f1f5f9;
	}

	.avatar {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		object-fit: cover;
		flex-shrink: 0;
	}

	.avatar.placeholder {
		background: #0ea5e9;
		color: #ffffff;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font-size: 0.85rem;
	}

	.user-info {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.user-name {
		font-size: 0.9rem;
		font-weight: 600;
		color: #0f172a;
		display: flex;
		align-items: center;
		gap: 6px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.chat-badge {
		font-size: 0.65rem;
		font-weight: 700;
		background: #e0f2fe;
		color: #0284c7;
		padding: 1px 6px;
		border-radius: 6px;
	}

	.user-handle {
		font-size: 0.75rem;
		color: #64748b;
	}
</style>
