<script lang="ts">
	/**
	 * @component CommentBaseItem
	 * @domain comments
	 * @description Composant atomique unifié représentant un commentaire ou une réponse (avatar, métadonnées, contenu riche, édition inline, like, menu d'actions).
	 *
	 * @responsibilities
	 * - Afficher l'auteur, l'avatar et l'horodatage relatif/absolu.
	 * - Permettre l'édition en ligne du texte avec `RichTextInput` et `EmojiButton`.
	 * - Gérer l'état de suppression (soft-delete ou suppression définitive) et le menu d'actions.
	 * - Fournir l'interaction de like et le déclenchement de réponse.
	 */

	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';
	import type { CommentData, MenuAction, EmojiItem } from '$lib/types';
	import RichContent from '$lib/components/ui/RichContent.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import ActionMenu from '$lib/components/ui/ActionMenu.svelte';
	import EmojiButton from '$lib/components/ui/EmojiButton.svelte';
	import FormattedDate from '$lib/components/ui/FormattedDate.svelte';
	import RichTextInput from '$lib/components/ui/RichTextInput.svelte';
	import { formatFullDate } from '$lib/dates';
	import { apiToggleCommentLike, apiDeleteComment, apiUpdateComment } from '$lib/client/api';

	interface Props {
		/** Données du commentaire (bindable) */
		comment: CommentData;
		/** Vrai si le commentaire est une réponse de second niveau */
		isReply?: boolean;
		/** Callback déclenché pour répondre à ce commentaire */
		onReply?: () => void;
		/** Callback déclenché après suppression */
		onDeleted?: (id: string, softDeleted?: boolean) => void;
		/** Callback déclenché après mise à jour */
		onUpdated?: (updatedComment: CommentData) => void;
		/** Slot d'enfants pour insérer la liste des sous-réponses */
		children?: Snippet;
	}

	let {
		comment = $bindable(),
		isReply = false,
		onReply,
		onDeleted,
		onUpdated,
		children
	}: Props = $props();

	let isEditing = $state(false);
	let editContent = $state('');
	let editRichInputRef = $state<RichTextInput | null>(null);
	let isSaving = $state(false);
	let isDeleting = $state(false);

	let currentUserId = $derived(page.data.sessionUser?.id);
	let isAdmin = $derived(page.data.sessionUser?.role === 'admin');

	let isDeleted = $derived(comment.content === '[deleted]');

	let isOwnComment = $derived(
		Boolean(!isDeleted && currentUserId && comment.author?.id === currentUserId)
	);
	let canEdit = $derived(!isDeleted && isOwnComment);
	let canDelete = $derived(!isDeleted && (isOwnComment || isAdmin));

	let isEdited = $derived.by(() => {
		if (isDeleted) return false;
		if (!comment.updatedAt || !comment.createdAt) return false;
		return new Date(comment.updatedAt).getTime() - new Date(comment.createdAt).getTime() > 1000;
	});

	let commentActions = $derived.by<MenuAction[]>(() => {
		const actions: MenuAction[] = [];
		if (canEdit) {
			actions.push({
				label: 'Modifier',
				onClick: () => startEdit()
			});
		}
		if (canDelete) {
			actions.push({
				label: 'Supprimer',
				variant: 'danger',
				onClick: () => handleDelete()
			});
		}
		return actions;
	});

	function startEdit() {
		editContent = comment.content;
		isEditing = true;
		setTimeout(() => {
			editRichInputRef?.focus();
		}, 40);
	}

	function cancelEdit() {
		isEditing = false;
		editContent = '';
	}

	async function saveEdit() {
		if (!editContent.trim() || isSaving) return;
		isSaving = true;
		try {
			const res = await apiUpdateComment(comment.id, editContent);
			if (res.success && res.comment) {
				comment.content = res.comment.content;
				comment.updatedAt = res.comment.updatedAt;
				isEditing = false;
				onUpdated?.(res.comment);
			}
		} catch (e) {
			console.error('Erreur mise à jour commentaire:', e);
		} finally {
			isSaving = false;
		}
	}

	async function handleDelete() {
		if (
			!confirm(
				isReply
					? 'Voulez-vous vraiment supprimer cette réponse ?'
					: 'Voulez-vous vraiment supprimer ce commentaire ?'
			)
		) {
			return;
		}
		isDeleting = true;
		try {
			const res = await apiDeleteComment(comment.id);
			if (res.success) {
				if (res.softDeleted) {
					comment.content = '[deleted]';
					comment.isLiked = false;
					comment.likesCount = 0;
					comment.author = {
						id: '',
						username: 'supprimé',
						image: null,
						name: '[supprimé]'
					};
				}
				onDeleted?.(comment.id, res.softDeleted);
			}
		} catch (e) {
			console.error('Erreur suppression commentaire:', e);
		} finally {
			isDeleting = false;
		}
	}

	async function toggleLike() {
		const prevLiked = comment.isLiked;
		const prevCount = comment.likesCount;

		comment.isLiked = !comment.isLiked;
		comment.likesCount += comment.isLiked ? 1 : -1;

		try {
			await apiToggleCommentLike(comment.id, comment.isLiked ? 'like' : 'unlike');
		} catch (e) {
			console.error(e);
			comment.isLiked = prevLiked;
			comment.likesCount = prevCount;
		}
	}

	function insertEmojiInEdit(emoji: EmojiItem) {
		editRichInputRef?.insertEmoji(emoji);
	}
</script>

<div class="comment-row" class:reply={isReply} class:deleting={isDeleting}>
	{#if isDeleted}
		<div class="avatar disabled" class:small={isReply} aria-hidden="true">
			<div class="avatar-placeholder deleted">?</div>
		</div>
	{:else}
		<a
			href={resolve(`/profil/${comment.author?.username || ''}`)}
			class="avatar"
			class:small={isReply}
		>
			{#if comment.author?.image}
				<img src={comment.author.image} alt={comment.author.username} />
			{:else}
				<div class="avatar-placeholder">
					{(comment.author?.username || '?').charAt(0).toUpperCase()}
				</div>
			{/if}
		</a>
	{/if}

	<div class="comment-body">
		<div class="comment-author">
			{#if isDeleted}
				<span class="author-deleted"><em>[supprimé]</em></span>
			{:else}
				<a href={resolve(`/profil/${comment.author?.username || ''}`)} class="author-link">
					<strong>{comment.author?.name || comment.author?.username}</strong>
				</a>
			{/if}
			<div class="author-meta">
				<FormattedDate date={comment.createdAt} class="time" />
				{#if isEdited}
					<span class="edited-badge" title={formatFullDate(comment.updatedAt, { withTime: true })}
						>(modifié)</span
					>
				{/if}
				{#if commentActions.length > 0 && !isEditing}
					<div class="action-menu-container">
						<ActionMenu actions={commentActions} />
					</div>
				{/if}
			</div>
		</div>

		{#if isEditing}
			<div class="inline-edit-box">
				<RichTextInput
					bind:this={editRichInputRef}
					bind:value={editContent}
					class="edit-rich-input"
					placeholder="Modifier votre commentaire..."
					onkeydown={(e) => {
						if (e.key === 'Enter' && !e.shiftKey) {
							e.preventDefault();
							saveEdit();
						}
					}}
				/>

				<div class="edit-toolbar">
					<div class="edit-toolbar-left">
						<EmojiButton onSelect={insertEmojiInEdit} variant="compact" align="left" />
					</div>

					<div class="edit-toolbar-right">
						<button type="button" class="btn-cancel-edit" onclick={cancelEdit} disabled={isSaving}>
							Annuler
						</button>
						<button
							type="button"
							class="btn-save-edit"
							onclick={saveEdit}
							disabled={isSaving || !editContent.trim()}
						>
							{isSaving ? 'Enregistrement...' : 'Enregistrer'}
						</button>
					</div>
				</div>
			</div>
		{:else if isDeleted}
			<p class="comment-text comment-deleted"><em>Commentaire supprimé</em></p>

			{#if onReply}
				<div class="comment-actions">
					<button class="action-text-btn" onclick={onReply}> Répondre </button>
				</div>
			{/if}
		{:else}
			<p class="comment-text"><RichContent content={comment.content} /></p>

			<div class="comment-actions">
				{#if onReply}
					<button class="action-text-btn" onclick={onReply}> Répondre </button>
				{/if}

				<button
					class="like-btn {comment.isLiked ? 'liked' : ''}"
					onclick={toggleLike}
					aria-label={comment.isLiked ? 'Je n’aime plus ce commentaire' : 'J’aime ce commentaire'}
				>
					<span class="icon">
						<Icon
							name={comment.isLiked ? 'action.like' : 'action.like_outline'}
							size={isReply ? 14 : 16}
							color={comment.isLiked ? '#ef4444' : 'currentColor'}
						/>
					</span>
					{#if comment.likesCount > 0}
						<span class="count">{comment.likesCount}</span>
					{/if}
				</button>
			</div>
		{/if}

		{#if children}
			{@render children()}
		{/if}
	</div>
</div>

<style>
	.comment-row {
		display: flex;
		gap: 12px;
		font-size: 0.95rem;
		transition: opacity 0.2s ease;
	}

	.comment-row.deleting {
		opacity: 0.5;
		pointer-events: none;
	}

	.comment-row.reply {
		gap: 10px;
		font-size: 0.9rem;
	}

	.avatar {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		overflow: hidden;
		flex-shrink: 0;
		text-decoration: none;
		display: block;
	}

	.avatar.small {
		width: 28px;
		height: 28px;
	}

	.avatar.disabled {
		pointer-events: none;
	}

	.avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.avatar-placeholder {
		width: 100%;
		height: 100%;
		background: #e2e8f0;
		color: #475569;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: bold;
		font-size: 0.9rem;
	}

	.avatar-placeholder.deleted {
		background: #f1f5f9;
		color: #94a3b8;
	}

	.comment-body {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}

	.comment-author {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		font-size: 0.85rem;
	}

	.author-link {
		color: #1e293b;
		text-decoration: none;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.author-link:hover {
		text-decoration: underline;
	}

	.author-deleted {
		color: #94a3b8;
		font-size: 0.85rem;
	}

	.author-meta {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	:global(.time) {
		color: #94a3b8;
		font-size: 0.75rem;
	}

	.edited-badge {
		font-size: 0.75rem;
		color: #94a3b8;
		cursor: help;
	}

	.action-menu-container {
		display: flex;
		align-items: center;
	}

	.comment-text {
		margin: 0;
		line-height: 1.4;
		word-break: break-word;
		color: #334155;
	}

	.comment-deleted {
		color: #94a3b8;
	}

	.comment-actions {
		display: flex;
		align-items: center;
		gap: 16px;
		margin-top: 4px;
	}

	.action-text-btn {
		background: none;
		border: none;
		padding: 0;
		color: #64748b;
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
	}

	.action-text-btn:hover {
		color: #0f172a;
	}

	.like-btn {
		background: none;
		border: none;
		padding: 0;
		display: flex;
		align-items: center;
		gap: 4px;
		color: #94a3b8;
		font-size: 0.75rem;
		cursor: pointer;
	}

	.like-btn:hover {
		color: #64748b;
	}

	.like-btn.liked {
		color: #ef4444;
	}

	.like-btn .icon {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* Édition inline */
	.inline-edit-box {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-top: 4px;
		background: #f8fafc;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		padding: 8px;
	}

	:global(.edit-rich-input) {
		width: 100%;
		min-height: 40px;
		font-size: 0.9rem;
		font-family: inherit;
		border: none;
		outline: none;
		background: transparent;
		box-sizing: border-box;
	}

	.edit-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: 4px;
		border-top: 1px solid #e2e8f0;
	}

	.edit-toolbar-left {
		display: flex;
		align-items: center;
	}

	.edit-toolbar-right {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.btn-cancel-edit {
		background: none;
		border: none;
		font-size: 0.8rem;
		font-weight: 600;
		color: #64748b;
		cursor: pointer;
		padding: 4px 8px;
		border-radius: 4px;
	}

	.btn-cancel-edit:hover {
		background: #e2e8f0;
		color: #0f172a;
	}

	.btn-save-edit {
		background: #0ea5e9;
		color: #ffffff;
		border: none;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		padding: 4px 10px;
		border-radius: 6px;
		transition: background 0.15s;
	}

	.btn-save-edit:hover {
		background: #0284c7;
	}

	.btn-save-edit:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
