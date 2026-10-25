<!--
  @component StoryFooter
  @domain stories
  @description Barre inférieure du lecteur de stories comprenant les réponses DM (avec picker émojis et soumission), le bouton like et lien chat pour les spectateurs, ou les statistiques d'interactions pour l'auteur.
  @responsibilities
    - Afficher le retour d'envoi de réponse DM (succès ou erreur avec lien vers le chat)
    - Proposer la saisie de réponse avec sélecteur d'émojis et touche Entrée
    - Fournir les boutons Like (avec compteur animé) et message direct pour les spectateurs
    - Afficher la pillule de statistiques d'interactions pour l'auteur
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import type { StoryItem, EmojiItem } from '$lib/types';
	import Icon from '$lib/components/ui/Icon.svelte';
	import EmojiButton from '$lib/components/ui/EmojiButton.svelte';

	interface Props {
		currentStory: StoryItem;
		authorUsername?: string | null;
		isAuthor?: boolean;
		replyText?: string;
		isSendingReply?: boolean;
		replyFeedback?: {
			type: 'success' | 'error';
			message: string;
			chatId?: string;
		} | null;
		keyboardOffset?: number;
		onClose: () => void;
		onToggleLike: (e?: MouseEvent | PointerEvent | TouchEvent) => void;
		onSendReply: (e?: Event) => void;
		onEmojiSelect: (emoji: EmojiItem) => void;
		onOpenInteractions?: () => void;
		onInputFocus?: () => void;
		onInputBlur?: () => void;
	}

	let {
		currentStory,
		authorUsername = '',
		isAuthor = false,
		replyText = $bindable(''),
		isSendingReply = false,
		replyFeedback = null,
		keyboardOffset = 0,
		onClose,
		onToggleLike,
		onSendReply,
		onEmojiSelect,
		onOpenInteractions,
		onInputFocus,
		onInputBlur
	}: Props = $props();
</script>

<footer class="story-footer" style={keyboardOffset > 0 ? `bottom: ${keyboardOffset}px;` : ''}>
	{#if replyFeedback}
		<div class="reply-feedback {replyFeedback.type}">
			<span>{replyFeedback.message}</span>
			{#if replyFeedback.chatId}
				<a
					href={resolve(`/chat/${replyFeedback.chatId}`)}
					class="feedback-chat-link"
					onclick={onClose}
				>
					Voir la discussion ↗
				</a>
			{/if}
		</div>
	{/if}

	{#if isAuthor}
		<!-- Stats pour le propriétaire de la story : affichées en bas à droite uniquement si > 0 -->
		{#if currentStory.likesCount > 0}
			<div class="author-stats">
				<button
					type="button"
					class="stat-pill clickable"
					onclick={(e) => {
						e.stopPropagation();
						onOpenInteractions?.();
					}}
					title="Voir qui a aimé votre story"
				>
					<Icon name="action.like" size={16} color="#ef4444" />
					<span>{currentStory.likesCount}</span>
				</button>
			</div>
		{/if}
	{:else}
		<!-- Interactions pour les spectateurs -->
		<div class="viewer-actions">
			<div class="reply-input-box">
				<input
					type="text"
					class="reply-input"
					class:has-send={Boolean(replyText.trim())}
					placeholder="Répondre à @{authorUsername}..."
					bind:value={replyText}
					onfocus={onInputFocus}
					onblur={onInputBlur}
					onkeydown={(e) => {
						e.stopPropagation();
						if (e.key === 'Enter') onSendReply(e);
					}}
					disabled={isSendingReply}
				/>
				<div class="reply-input-actions">
					<EmojiButton
						onSelect={onEmojiSelect}
						variant="compact"
						align="right"
						class="story-emoji-btn"
					/>
					{#if replyText.trim()}
						<button type="button" class="btn-send" onclick={onSendReply} disabled={isSendingReply}>
							Envoyer
						</button>
					{/if}
				</div>
			</div>

			<!-- Bouton Like -->
			<button
				type="button"
				class="btn-like"
				class:liked={currentStory.isLiked}
				onclick={onToggleLike}
				title={currentStory.isLiked ? 'Ne plus aimer' : 'Aimer la story'}
				aria-label="Aimer la story"
			>
				<span class="like-heart">
					<Icon
						name={currentStory.isLiked ? 'action.like' : 'action.like_outline'}
						size={24}
						color={currentStory.isLiked ? '#ef4444' : 'white'}
					/>
				</span>
				{#if currentStory.likesCount > 0}
					<span class="like-count">{currentStory.likesCount}</span>
				{/if}
			</button>

			<!-- Bouton Message direct -->
			{#if authorUsername}
				<a
					href={resolve(`/api/chat/direct/${authorUsername}`)}
					class="btn-message"
					title="Envoyer un message à @{authorUsername}"
					aria-label="Envoyer un message"
					onclick={onClose}
				>
					<Icon name="action.comment" size={22} color="white" />
				</a>
			{/if}
		</div>
	{/if}
</footer>

<style>
	.story-footer {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 30;
		padding: 12px 14px calc(12px + env(safe-area-inset-bottom, 0px));
		background: linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0) 100%);
		display: flex;
		flex-direction: column;
		gap: 8px;
		pointer-events: auto;
		transition: bottom 0.15s ease-out;
	}

	/* Feedback alert */
	.reply-feedback {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 7px 12px;
		border-radius: 8px;
		font-size: 0.84rem;
		animation: feedback-pop 0.2s ease-out;
	}

	.reply-feedback.success {
		background: rgba(16, 185, 129, 0.85);
		color: #fff;
	}

	.reply-feedback.error {
		background: rgba(239, 68, 68, 0.85);
		color: #fff;
	}

	.feedback-chat-link {
		color: #fff;
		font-weight: 700;
		text-decoration: underline;
		margin-left: 8px;
		font-size: 0.82rem;
	}

	/* Stats propriétaire */
	.author-stats {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 12px;
		padding: 4px 0;
		width: 100%;
	}

	.stat-pill {
		background: rgba(255, 255, 255, 0.15);
		backdrop-filter: blur(6px);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: #fff;
		padding: 5px 14px;
		border-radius: 20px;
		font-size: 0.85rem;
		font-weight: 600;
	}

	.stat-pill.clickable {
		background: rgba(0, 0, 0, 0.55);
		border: 1px solid rgba(255, 255, 255, 0.25);
		color: #fff;
		cursor: pointer;
		padding: 6px 14px;
		border-radius: 20px;
		font-size: 0.9rem;
		font-weight: 600;
		transition:
			background 0.2s,
			transform 0.1s;
		backdrop-filter: blur(8px);
	}

	.stat-pill.clickable:hover {
		background: rgba(255, 255, 255, 0.2);
		transform: scale(1.04);
	}

	/* Interactions spectateurs */
	.viewer-actions {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
	}

	.reply-input-box {
		position: relative;
		flex: 1;
		display: flex;
		align-items: center;
	}

	.reply-input {
		width: 100%;
		padding: 9px 40px 9px 14px;
		background: rgba(255, 255, 255, 0.18);
		border: 1px solid rgba(255, 255, 255, 0.3);
		border-radius: 24px;
		color: #fff;
		font-size: 0.88rem;
		outline: none;
		backdrop-filter: blur(8px);
		transition:
			border-color 0.15s,
			background 0.15s,
			padding-right 0.15s;
	}

	.reply-input.has-send {
		padding-right: 110px;
	}

	.reply-input::placeholder {
		color: rgba(255, 255, 255, 0.7);
	}

	.reply-input:focus {
		background: rgba(255, 255, 255, 0.25);
		border-color: rgba(255, 255, 255, 0.6);
	}

	.reply-input-actions {
		position: absolute;
		right: 6px;
		top: 50%;
		transform: translateY(-50%);
		display: flex;
		align-items: center;
		gap: 6px;
		z-index: 2;
	}

	:global(.story-emoji-btn .btn-emoji-trigger),
	:global(.story-emoji-btn .btn-emoji-trigger.compact) {
		width: 28px !important;
		height: 28px !important;
		color: rgba(255, 255, 255, 0.85) !important;
		padding: 0 !important;
		border-radius: 50% !important;
		transition: all 0.15s ease;
	}

	:global(.story-emoji-btn .btn-emoji-trigger:hover),
	:global(.story-emoji-btn .btn-emoji-trigger.compact:hover),
	:global(.story-emoji-btn .btn-emoji-trigger.compact:hover:not(:disabled)) {
		color: #ffffff !important;
		background: rgba(255, 255, 255, 0.25) !important;
		border-radius: 50% !important;
	}

	:global(.story-emoji-btn .btn-emoji-trigger.active),
	:global(.story-emoji-btn .btn-emoji-trigger.compact.active) {
		color: #38bdf8 !important;
		background: rgba(56, 189, 248, 0.25) !important;
		border-radius: 50% !important;
	}

	.btn-send {
		background: #0ea5e9;
		color: #fff;
		border: none;
		padding: 5px 12px;
		border-radius: 20px;
		font-size: 0.8rem;
		font-weight: 700;
		cursor: pointer;
		white-space: nowrap;
		transition:
			background 0.15s,
			opacity 0.15s;
	}

	.btn-send:hover {
		background: #0284c7;
	}

	.btn-send:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-like,
	.btn-message {
		background: rgba(255, 255, 255, 0.18);
		border: 1px solid rgba(255, 255, 255, 0.3);
		color: #fff;
		height: 38px;
		padding: 0 10px;
		min-width: 38px;
		border-radius: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 4px;
		font-size: 1.05rem;
		cursor: pointer;
		backdrop-filter: blur(8px);
		transition:
			background 0.15s,
			transform 0.1s;
		text-decoration: none;
		flex-shrink: 0;
	}

	.btn-like:hover,
	.btn-message:hover {
		background: rgba(255, 255, 255, 0.28);
		transform: scale(1.06);
	}

	.btn-like.liked {
		border-color: rgba(239, 68, 68, 0.5);
	}

	.btn-like.liked .like-heart {
		animation: like-pop 0.25s ease-out;
	}

	.like-count {
		font-size: 0.8rem;
		font-weight: 700;
	}

	@keyframes like-pop {
		0% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.35);
		}
		100% {
			transform: scale(1);
		}
	}

	@keyframes feedback-pop {
		0% {
			opacity: 0;
			transform: translateY(6px);
		}
		100% {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
