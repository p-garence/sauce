<!--
  @component RichContent
  @domain ui
  @description Afficheur de texte enrichi (mentions, hashtags cliquables, liens et émojis personnalisés).
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { mentionPermissions } from '$lib/client/mentionPermissions.svelte';
	import { emojiStore } from '$lib/client/emojiStore.svelte';

	let {
		content = '',
		currentUsername = '',
		clickable = true
	}: {
		content: string;
		currentUsername?: string | null;
		clickable?: boolean;
	} = $props();

	type Token =
		| { type: 'text'; value: string }
		| { type: 'mention'; username: string; isMe?: boolean }
		| { type: 'tag'; tag: string }
		| { type: 'url'; url: string }
		| { type: 'emoji'; name: string; url: string };

	const tokens = $derived.by<Token[]>(() => {
		if (!content) return [];

		// Découpe le texte en isolant les mentions (@pseudo), les tags (#mot), les URLs et les emojis (:prefix_emoji:)
		const regex =
			/((?:^|\s)@[a-zA-Z0-9_.]{3,30}|(?:^|\s)#[a-zA-Z0-9_\p{L}]+|https?:\/\/[^\s]+|:[a-zA-Z0-9_-]{2,50}:)/gu;
		const parts = content.split(regex);
		const result: Token[] = [];

		for (const part of parts) {
			if (!part) continue;

			const trimmed = part.trim();
			if (trimmed.startsWith('@') && trimmed.length > 1) {
				const leadingSpace = part.startsWith(' ') ? ' ' : '';
				if (leadingSpace) result.push({ type: 'text', value: leadingSpace });

				const username = trimmed.slice(1);
				const isMe =
					Boolean(currentUsername && username.toLowerCase() === currentUsername.toLowerCase());
				result.push({ type: 'mention', username, isMe });
			} else if (trimmed.startsWith('#') && trimmed.length > 1) {
				const leadingSpace = part.startsWith(' ') ? ' ' : '';
				if (leadingSpace) result.push({ type: 'text', value: leadingSpace });

				const tag = trimmed.slice(1);
				result.push({ type: 'tag', tag });
			} else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
				result.push({ type: 'url', url: trimmed });
			} else if (/^:[a-zA-Z0-9_-]{2,50}:$/.test(trimmed)) {
				const key = trimmed.slice(1, -1);
				const clean = key.toLowerCase();
				const emojiUrl = emojiStore.getEmojiUrl(key);
				if (emojiUrl) {
					const displayName = emojiStore.getEmojiDisplayName(key);
					result.push({ type: 'emoji', name: displayName, url: emojiUrl });
				} else if (emojiStore.missingKeys[clean]) {
					// Si c'est un emoji supprimé, on ne l'affiche plus
				} else if (/^em_[a-zA-Z0-9_-]+$/i.test(clean)) {
					// Token d'emoji en cours de résolution asynchrone : on évite le flash de texte brut
				} else {
					// Texte normal entre deux-points (:mot:)
					result.push({ type: 'text', value: part });
				}
			} else {
				result.push({ type: 'text', value: part });
			}
		}

		return result;
	});
</script>

<span class="rich-content">
	{#each tokens as token, i (i)}
		{#if token.type === 'mention'}
			{#if clickable && mentionPermissions.isClickable(token.username)}
				<a
					href={resolve(`/profil/${encodeURIComponent(token.username)}`)}
					class="mention-link {token.isMe ? 'is-me' : ''}"
					onclick={(e) => e.stopPropagation()}
				>
					@{token.username}
				</a>
			{:else}
				<span class="mention-text-disabled {token.isMe ? 'is-me' : ''}">
					@{token.username}
				</span>
			{/if}
		{:else if token.type === 'tag'}
			{#if clickable}
				<a
					href={resolve(`/tag/${encodeURIComponent(token.tag)}`)}
					class="tag-link"
					onclick={(e) => e.stopPropagation()}
				>
					#{token.tag}
				</a>
			{:else}
				<span class="tag-link" style="text-decoration:none; cursor:default;">
					#{token.tag}
				</span>
			{/if}
		{:else if token.type === 'url'}
			{#if clickable}
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a
					href={token.url}
					target="_blank"
					rel="external noopener noreferrer"
					class="external-link"
					onclick={(e) => e.stopPropagation()}
				>
					{token.url}
				</a>
			{:else}
				<span class="external-link" style="text-decoration:none; cursor:default;">
					{token.url}
				</span>
			{/if}
		{:else if token.type === 'emoji'}
			<img
				src={token.url}
				alt=":{token.name}:"
				title=":{token.name}:"
				class="inline-chat-emoji"
				loading="lazy"
			/>
		{:else}
			{token.value}
		{/if}
	{/each}
</span>

<style>
	.rich-content {
		display: inline;
		word-break: break-word;
		white-space: pre-wrap;
	}
	.inline-chat-emoji {
		display: inline-block;
		width: 1.35em;
		height: 1.35em;
		vertical-align: -0.25em;
		object-fit: contain;
		margin: 0 0.1em;
		border-radius: 2px;
	}
	.mention-link {
		color: var(--primary, #0ea5e9);
		font-weight: 600;
		text-decoration: none;
		border-radius: 4px;
		padding: 1px 3px;
		transition: background 0.15s;
	}
	.mention-link:hover {
		background: rgba(14, 165, 233, 0.12);
		text-decoration: underline;
	}
	.mention-link.is-me {
		background: rgba(14, 165, 233, 0.15);
		color: #0284c7;
		font-weight: 700;
	}
	.tag-link {
		color: var(--primary, #0ea5e9);
		font-weight: 600;
		text-decoration: none;
	}
	.tag-link:hover {
		text-decoration: underline;
	}
	.external-link {
		color: var(--primary, #0ea5e9);
		text-decoration: underline;
		word-break: break-all;
	}
	.mention-text-disabled {
		color: inherit;
		font-weight: 500;
	}
	.mention-text-disabled.is-me {
		background: rgba(14, 165, 233, 0.12);
		color: #0284c7;
		padding: 1px 4px;
		border-radius: 4px;
	}
</style>
