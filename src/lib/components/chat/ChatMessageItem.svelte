<script lang="ts">
	/**
	 * @component ChatMessageItem
	 * @domain chat
	 * @description Rendu complet d'une bulle de message dans la conversation (texte riche, vignette story, médias image/vidéo/audio/fichier, édition inline et menu contextuel).
	 *
	 * @responsibilities
	 * - Afficher le contenu selon l'expéditeur (envoyé / reçu, groupe ou direct, mentions en surbrillance).
	 * - Prendre en charge les réponses aux stories avec prévisualisation cliquable.
	 * - Supporter la lecture de fichiers audio via `VoiceMessagePlayer` et les fichiers téléchargeables.
	 * - Fournir l'édition inline de texte riche avec `RichTextInput` et `EmojiButton`.
	 * - Proposer le menu d'actions (modification et suppression).
	 */

	import { formatBytes } from '$lib/utils/format';
	import { formatFullDate, formatDateISO } from '$lib/dates';
	import { parseStoryReply, type StoryReplyData } from '$lib/stories';
	import type { EmojiItem, MenuAction, Message } from '$lib/types';
	import RichContent from '$lib/components/ui/RichContent.svelte';
	import RichTextInput from '$lib/components/ui/RichTextInput.svelte';
	import EmojiButton from '$lib/components/ui/EmojiButton.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import ActionMenu from '$lib/components/ui/ActionMenu.svelte';
	import VoiceMessagePlayer from '$lib/components/chat/VoiceMessagePlayer.svelte';

	export type ChatMessage = Message & {
		sender?: { name: string | null; username: string | null; image: string | null } | null;
	};

	interface Props {
		/** Message affiché */
		message: ChatMessage;
		/** Identifiant de l'utilisateur connecté */
		currentUserId: string;
		/** Nom d'utilisateur de l'utilisateur connecté (pour détecter les mentions) */
		currentUsername?: string;
		/** Type de chat : direct ou groupe */
		chatType: 'direct' | 'group';
		/** Vrai si ce message est actuellement en mode édition */
		isEditing?: boolean;
		/** Vrai si l'enregistrement de l'édition est en cours */
		isSavingEdit?: boolean;
		/** Direction d'ouverture du menu déroulant */
		menuDirection?: 'up' | 'auto';
		/** Callback déclenché pour entrer en mode édition */
		onStartEdit: (msg: ChatMessage) => void;
		/** Callback pour annuler l'édition */
		onCancelEdit: () => void;
		/** Callback pour enregistrer la modification */
		onSaveEdit: (msg: ChatMessage, content: string) => void;
		/** Callback pour supprimer le message */
		onDelete: (msg: ChatMessage) => void;
		/** Callback pour ouvrir la modale de visualisation de story */
		onOpenStoryModal?: (story: StoryReplyData) => void;
	}

	let {
		message,
		currentUserId,
		currentUsername = '',
		chatType,
		isEditing = false,
		isSavingEdit = false,
		menuDirection = 'auto',
		onStartEdit,
		onCancelEdit,
		onSaveEdit,
		onDelete,
		onOpenStoryModal
	}: Props = $props();

	let editContent = $state('');
	let editRichInputRef = $state<RichTextInput | null>(null);

	$effect(() => {
		if (isEditing) {
			editContent = message.content;
			setTimeout(() => {
				editRichInputRef?.focus();
			}, 30);
		}
	});

	let isMe = $derived(message.senderId === currentUserId);
	let isDeleted = $derived(message.content === '[deleted]');

	let isEdited = $derived.by(() => {
		if (isDeleted) return false;
		if (!message.updatedAt || !message.createdAt) return false;
		return new Date(message.updatedAt).getTime() - new Date(message.createdAt).getTime() > 1000;
	});

	let isMentioned = $derived(
		Boolean(
			!isDeleted &&
				currentUsername &&
				message.content &&
				message.content.toLowerCase().includes('@' + currentUsername.toLowerCase())
		)
	);

	let replyData = $derived(parseStoryReply(message.content));

	let actions = $derived.by<MenuAction[]>(() => {
		const list: MenuAction[] = [];
		if (isMe && !isDeleted) {
			list.push({
				label: 'Modifier',
				onClick: () => onStartEdit(message)
			});
			list.push({
				label: 'Supprimer',
				variant: 'danger',
				onClick: () => onDelete(message)
			});
		}
		return list;
	});

	function insertEmojiInEdit(emoji: EmojiItem) {
		editRichInputRef?.insertEmoji(emoji);
	}
</script>

<div
	class="message {isMe ? 'sent' : 'received'} {isMentioned ? 'mentioned' : ''} {isDeleted
		? 'deleted'
		: ''} {isEditing ? 'editing' : ''}"
>
	{#if !isMe && chatType === 'group'}
		<span class="group-sender">{message.sender?.name || message.sender?.username}</span>
	{/if}

	{#if isDeleted}
		<p class="message-deleted-text"><em>Message supprimé</em></p>
	{:else if isEditing}
		{#if message.mediaUrl}
			<div class="message-media-container">
				{#if message.mediaType === 'image'}
					<img
						src={message.mediaUrl}
						alt={message.mediaName || 'Photo'}
						class="message-media-img"
					/>
				{:else if message.mediaType === 'video'}
					<video src={message.mediaUrl} controls playsinline class="message-media-video">
						<track kind="captions" />
					</video>
				{/if}
			</div>
		{/if}

		<div class="inline-edit-box">
			<RichTextInput
				bind:this={editRichInputRef}
				bind:value={editContent}
				class="edit-textarea"
				placeholder="Modifier votre message..."
				onkeydown={(e) => {
					if (e.key === 'Enter' && !e.shiftKey) {
						e.preventDefault();
						onSaveEdit(message, editContent);
					} else if (e.key === 'Escape') {
						e.preventDefault();
						onCancelEdit();
					}
				}}
			/>

			<div class="edit-toolbar">
				<div class="edit-toolbar-left">
					<EmojiButton onSelect={insertEmojiInEdit} variant="compact" align="left" />
				</div>

				<div class="edit-toolbar-right">
					<button
						type="button"
						class="btn-cancel-edit"
						onclick={onCancelEdit}
						disabled={isSavingEdit}
					>
						Annuler
					</button>
					<button
						type="button"
						class="btn-save-edit"
						onclick={() => onSaveEdit(message, editContent)}
						disabled={isSavingEdit || (!message.mediaUrl && !editContent.trim())}
					>
						{isSavingEdit ? 'Enregistrement...' : 'Enregistrer'}
					</button>
				</div>
			</div>
		</div>
	{:else}
		{#if replyData.story && onOpenStoryModal}
			<button
				type="button"
				class="story-reply-preview"
				onclick={() => onOpenStoryModal(replyData.story!)}
				title="Cliquer pour voir la story"
			>
				<div class="story-preview-media">
					{#if replyData.story.mediaType === 'video'}
						<video src={replyData.story.mediaUrl} muted preload="metadata"></video>
						<span class="play-badge">▶</span>
					{:else}
						<img src={replyData.story.mediaUrl} alt="Story" />
					{/if}
				</div>
				<div class="story-preview-details">
					<span class="story-preview-title">
						📷 Story {replyData.story.authorUsername ? `@${replyData.story.authorUsername}` : ''}
					</span>
					{#if replyData.story.caption}
						<span class="story-preview-caption">{replyData.story.caption}</span>
					{:else}
						<span class="story-preview-action">Cliquer pour voir la story ↗</span>
					{/if}
				</div>
			</button>
		{/if}

		{#if message.mediaUrl}
			{#if message.mediaType === 'image'}
				<div class="message-media-container">
					<a
						href={message.mediaUrl}
						target="_blank"
						rel="noopener noreferrer external"
						class="message-media-link"
					>
						<img
							src={message.mediaUrl}
							alt={message.mediaName || 'Photo'}
							loading="lazy"
							class="message-media-img"
						/>
					</a>
				</div>
			{:else if message.mediaType === 'video'}
				<div class="message-media-container">
					<video
						src={message.mediaUrl}
						controls
						playsinline
						preload="metadata"
						class="message-media-video"
					>
						<track kind="captions" />
					</video>
				</div>
			{:else if message.mediaType === 'audio'}
				<div class="message-media-container message-voice-container">
					<VoiceMessagePlayer
						src={message.mediaUrl}
						isSent={isMe}
						name={message.mediaName || 'Message vocal'}
					/>
				</div>
			{:else}
				<a
					href={message.mediaUrl}
					download={message.mediaName || 'fichier'}
					class="message-file-card"
					target="_blank"
					rel="noopener noreferrer external"
				>
					<div class="file-card-icon">
						<Icon name="action.attachment" size={20} />
					</div>
					<div class="file-card-info">
						<span class="file-name">{message.mediaName || 'Fichier'}</span>
						{#if message.mediaSize}
							<span class="file-size">{formatBytes(message.mediaSize)}</span>
						{/if}
					</div>
					<span class="file-download-badge">Télécharger</span>
				</a>
			{/if}
		{/if}

		{#if replyData.text}
			<p><RichContent content={replyData.text} {currentUsername} /></p>
		{/if}
	{/if}

	<div class="message-footer">
		{#if isEdited}
			<span class="edited-badge" title={formatFullDate(message.updatedAt, { withTime: true })}>
				(modifié)
			</span>
		{/if}
		<time
			class="time"
			datetime={formatDateISO(message.createdAt)}
			title={formatFullDate(message.createdAt, { withTime: true, withWeekday: true })}
		>
			{new Date(message.createdAt).toLocaleTimeString('fr-FR', {
				hour: '2-digit',
				minute: '2-digit'
			})}
		</time>
		{#if actions.length > 0 && !isEditing}
			<div class="message-action-menu">
				<ActionMenu {actions} direction={menuDirection} />
			</div>
		{/if}
	</div>
</div>

<style>
	.message {
		max-width: 75%;
		padding: 10px 14px;
		border-radius: 18px;
		word-wrap: break-word;
	}

	.message p {
		margin: 0;
		font-size: 0.95rem;
		line-height: 1.4;
	}

	.message .time {
		font-size: 0.7rem;
		opacity: 0.7;
		display: block;
		text-align: right;
		margin-top: 4px;
	}

	.message.sent {
		align-self: flex-end;
		background: #0ea5e9;
		color: #fff;
		border-bottom-right-radius: 4px;
	}

	.message.received {
		align-self: flex-start;
		background: #e2e8f0;
		color: #1e293b;
		border-bottom-left-radius: 4px;
	}

	.message.mentioned {
		box-shadow:
			0 0 0 2px #38bdf8,
			0 4px 12px rgba(14, 165, 233, 0.3);
	}

	.group-sender {
		font-size: 0.7rem;
		font-weight: bold;
		color: #0ea5e9;
		display: block;
		margin-bottom: 2px;
	}

	.story-reply-preview {
		display: flex;
		align-items: center;
		gap: 10px;
		background: rgba(0, 0, 0, 0.12);
		border: 1px solid rgba(255, 255, 255, 0.25);
		border-radius: 12px;
		padding: 6px 10px;
		margin-bottom: 8px;
		cursor: pointer;
		text-align: left;
		color: inherit;
		transition:
			background 0.15s,
			transform 0.1s;
		width: 100%;
		max-width: 280px;
	}

	.message.sent .story-reply-preview {
		background: rgba(255, 255, 255, 0.2);
		border-color: rgba(255, 255, 255, 0.35);
		color: #fff;
	}

	.message.received .story-reply-preview {
		background: rgba(0, 0, 0, 0.06);
		border-color: rgba(0, 0, 0, 0.12);
		color: #1e293b;
	}

	.story-reply-preview:hover {
		transform: scale(1.02);
		filter: brightness(1.05);
	}

	.story-preview-media {
		position: relative;
		width: 44px;
		height: 60px;
		border-radius: 8px;
		overflow: hidden;
		flex-shrink: 0;
		background: #000;
	}

	.story-preview-media img,
	.story-preview-media video {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.play-badge {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		color: #fff;
		background: rgba(0, 0, 0, 0.35);
	}

	.story-preview-details {
		display: flex;
		flex-direction: column;
		gap: 3px;
		min-width: 0;
	}

	.story-preview-title {
		font-size: 0.78rem;
		font-weight: 700;
		opacity: 0.95;
	}

	.story-preview-caption {
		font-size: 0.78rem;
		opacity: 0.85;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.story-preview-action {
		font-size: 0.74rem;
		opacity: 0.75;
		font-style: italic;
	}

	.message-media-container {
		margin-bottom: 6px;
		border-radius: 12px;
		overflow: hidden;
		max-width: 100%;
	}

	.message-media-link {
		display: block;
		cursor: pointer;
	}

	.message-media-img {
		max-width: 100%;
		max-height: 280px;
		border-radius: 12px;
		object-fit: cover;
		display: block;
		transition: opacity 0.15s;
	}

	.message-media-img:hover {
		opacity: 0.95;
	}

	.message-media-video {
		max-width: 100%;
		max-height: 280px;
		border-radius: 12px;
		display: block;
		background: #000;
	}

	.message-file-card {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 12px;
		border-radius: 12px;
		text-decoration: none;
		margin-bottom: 6px;
		transition: background-color 0.15s;
		max-width: 280px;
	}

	.message.sent .message-file-card {
		background: rgba(255, 255, 255, 0.2);
		color: #fff;
		border: 1px solid rgba(255, 255, 255, 0.3);
	}

	.message.sent .message-file-card:hover {
		background: rgba(255, 255, 255, 0.3);
	}

	.message.received .message-file-card {
		background: rgba(0, 0, 0, 0.05);
		color: #1e293b;
		border: 1px solid rgba(0, 0, 0, 0.1);
	}

	.message.received .message-file-card:hover {
		background: rgba(0, 0, 0, 0.08);
	}

	.file-card-icon {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.file-card-info {
		display: flex;
		flex-direction: column;
		min-width: 0;
		flex: 1;
	}

	.file-card-info .file-name {
		font-size: 0.85rem;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.file-card-info .file-size {
		font-size: 0.72rem;
		opacity: 0.8;
	}

	.file-download-badge {
		font-size: 0.7rem;
		font-weight: 600;
		padding: 3px 8px;
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.25);
		flex-shrink: 0;
	}

	.message.received .file-download-badge {
		background: rgba(0, 0, 0, 0.08);
	}

	.message-footer {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 6px;
		margin-top: 4px;
	}

	.message.deleted {
		background: #f1f5f9;
		color: #94a3b8;
		border: 1px dashed #cbd5e1;
	}

	.message.sent.deleted {
		border-bottom-right-radius: 4px;
	}

	.message.received.deleted {
		border-bottom-left-radius: 4px;
	}

	.message-deleted-text {
		margin: 0;
		font-style: italic;
		font-size: 0.9rem;
		color: #94a3b8;
	}

	.message.deleted .time {
		color: #94a3b8;
		opacity: 0.8;
	}

	.message.editing {
		min-width: 260px;
		max-width: 85%;
	}

	.message.sent.editing {
		background: #0284c7;
	}

	.inline-edit-box {
		margin-top: 6px;
		display: flex;
		flex-direction: column;
		gap: 6px;
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		padding: 8px;
		color: #1e293b;
	}

	:global(.edit-textarea) {
		width: 100%;
		border: 1px solid #cbd5e1;
		border-radius: 6px;
		padding: 6px 10px;
		font-size: 0.9rem;
		line-height: 1.4;
		outline: none;
		background: #ffffff;
		color: #1e293b;
		box-sizing: border-box;
		min-height: 44px;
		max-height: 180px;
		overflow-y: auto;
		cursor: text;
	}

	:global(.edit-textarea:focus) {
		border-color: #0ea5e9;
		box-shadow: 0 0 0 1px #0ea5e9;
	}

	.edit-toolbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.edit-toolbar-left {
		position: relative;
	}

	.edit-toolbar-right {
		display: flex;
		gap: 6px;
	}

	.btn-cancel-edit {
		background: none;
		border: 1px solid #cbd5e1;
		border-radius: 6px;
		padding: 4px 10px;
		font-size: 0.78rem;
		font-weight: 600;
		color: #64748b;
		cursor: pointer;
		transition: all 0.15s;
	}

	.btn-cancel-edit:hover:not(:disabled) {
		background: #f1f5f9;
		color: #1e293b;
	}

	.btn-save-edit {
		background: #0ea5e9;
		border: none;
		border-radius: 6px;
		padding: 4px 10px;
		font-size: 0.78rem;
		font-weight: 600;
		color: #ffffff;
		cursor: pointer;
		transition: background 0.15s;
	}

	.btn-save-edit:hover:not(:disabled) {
		background: #0284c7;
	}

	.btn-save-edit:disabled {
		background: #cbd5e1;
		cursor: not-allowed;
	}

	.edited-badge {
		font-size: 0.68rem;
		font-style: italic;
		opacity: 0.8;
		user-select: none;
	}

	.message.sent .edited-badge {
		color: rgba(255, 255, 255, 0.9);
	}

	.message.received .edited-badge {
		color: #64748b;
	}

	.message-action-menu {
		display: inline-flex;
		align-items: center;
		margin-left: 2px;
	}

	.message-action-menu :global(.btn-more) {
		width: 20px;
		height: 20px;
		font-size: 0.85rem;
		opacity: 0.7;
		color: inherit;
		border-radius: 50%;
		transition: opacity 0.15s, background 0.15s;
	}

	.message-action-menu :global(.btn-more:hover) {
		opacity: 1;
		background: rgba(255, 255, 255, 0.25);
	}

	.message.received .message-action-menu :global(.btn-more:hover) {
		background: rgba(0, 0, 0, 0.08);
	}
</style>
