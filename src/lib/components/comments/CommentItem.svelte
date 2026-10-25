<script lang="ts">
	/**
	 * @component CommentItem
	 * @domain comments
	 * @description Composant de niveau racine pour un commentaire de publication, orchestrant l'affichage de ses réponses enfants.
	 *
	 * @responsibilities
	 * - Utiliser `CommentBaseItem` pour le rendu atomique du commentaire racine.
	 * - Gérer le pliage / dépliage et la pagination asynchrone des réponses enfants.
	 * - Transmettre les actions de réponse, de modification et de suppression.
	 */

	import { slide } from 'svelte/transition';
	import type { CommentData } from '$lib/types';
	import { COMMENTS_PER_LOAD } from '$lib/constants';
	import CommentBaseItem from '$lib/components/comments/CommentBaseItem.svelte';
	import CommentReplyItem from '$lib/components/comments/CommentReplyItem.svelte';

	interface Props {
		/** Données du commentaire racine (bindable) */
		comment: CommentData;
		/** Identifiant du post associé */
		postId: string;
		/** Callback pour répondre à ce commentaire ou une de ses sous-réponses */
		onReply: (id: string, username: string, isSubReply: boolean) => void;
		/** Callback lors de la suppression */
		onDeleted?: (
			commentId: string,
			deletedCount: number,
			parentId?: string | null,
			softDeleted?: boolean
		) => void;
		/** Callback lors d'une mise à jour */
		onUpdated?: (updatedComment: CommentData) => void;
	}

	let {
		comment = $bindable(),
		postId,
		onReply,
		onDeleted,
		onUpdated
	}: Props = $props();

	const LIMIT = COMMENTS_PER_LOAD;

	function handleReplyDeleted(replyId: string, softDeleted?: boolean) {
		if (!comment.replies) return;
		if (softDeleted) {
			const r = comment.replies.find((item) => item.id === replyId);
			if (r) {
				r.content = '[deleted]';
				r.isLiked = false;
				r.likesCount = 0;
				r.author = {
					id: '',
					username: 'supprimé',
					image: null,
					name: '[supprimé]'
				};
			}
			onDeleted?.(replyId, 1, comment.id, true);
			return;
		}
		comment.replies = comment.replies.filter((r) => r.id !== replyId);
		comment.repliesCount = Math.max(0, (comment.repliesCount || 1) - 1);
		onDeleted?.(replyId, 1, comment.id, false);
	}

	function handleReplyUpdated(updatedReply: CommentData) {
		if (!comment.replies) return;
		const index = comment.replies.findIndex((r) => r.id === updatedReply.id);
		if (index !== -1) {
			comment.replies[index] = { ...comment.replies[index], ...updatedReply };
		}
		onUpdated?.(updatedReply);
	}

	async function loadReplies(pageToLoad: number) {
		comment.isLoadingReplies = true;
		try {
			const res = await fetch(
				`/api/comments?postId=${postId}&parentId=${comment.id}&sort=oldest&page=${pageToLoad}&limit=${LIMIT}`
			);
			if (res.ok) {
				const data = await res.json();
				if (pageToLoad === 1) {
					comment.replies = data;
				} else {
					comment.replies = [...(comment.replies || []), ...data];
				}
				comment.repliesPage = pageToLoad;
				comment.hasMoreReplies = data.length === LIMIT;
			}
		} catch (err) {
			console.error(err);
		} finally {
			comment.isLoadingReplies = false;
		}
	}

	async function toggleReplies() {
		comment.showReplies = !comment.showReplies;
		if (comment.showReplies && (!comment.replies || comment.replies.length === 0)) {
			await loadReplies(1);
		}
	}
</script>

<CommentBaseItem
	bind:comment={comment}
	isReply={false}
	onReply={() => onReply(comment.id, comment.author?.username || '', false)}
	onDeleted={(id, softDeleted) => onDeleted?.(id, 1, comment.parentId, softDeleted)}
	{onUpdated}
>
	{#if (comment.repliesCount || 0) > 0}
		<button type="button" class="toggle-replies-btn" onclick={toggleReplies}>
			<span class="arrow">{comment.showReplies ? '▼' : '▶'}</span>
			{comment.showReplies ? 'Masquer les réponses' : `Voir les ${comment.repliesCount} réponses`}
		</button>

		{#if comment.showReplies}
			<div class="replies-list" transition:slide={{ duration: 200 }}>
				{#if comment.replies}
					{#each comment.replies as reply, i (reply.id)}
						<CommentReplyItem
							bind:reply={comment.replies[i]}
							{onReply}
							onDeleted={(replyId, softDeleted) => handleReplyDeleted(replyId, softDeleted)}
							onUpdated={(updatedReply) => handleReplyUpdated(updatedReply)}
						/>
					{/each}
				{/if}

				{#if comment.isLoadingReplies}
					<div class="loading-state-small">Chargement des réponses...</div>
				{/if}

				{#if comment.hasMoreReplies && !comment.isLoadingReplies}
					<button
						type="button"
						class="load-more-replies-btn"
						onclick={() => loadReplies((comment.repliesPage || 1) + 1)}
					>
						Afficher plus de réponses
					</button>
				{/if}
			</div>
		{/if}
	{/if}
</CommentBaseItem>

<style>
	.toggle-replies-btn {
		background: none;
		border: none;
		color: #64748b;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 6px;
		margin-top: 6px;
		padding: 4px 0;
	}

	.toggle-replies-btn:hover {
		color: #0ea5e9;
	}

	.toggle-replies-btn .arrow {
		font-size: 0.65rem;
	}

	.replies-list {
		margin-top: 8px;
		padding-left: 12px;
		border-left: 2px solid #f1f5f9;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.loading-state-small {
		font-size: 0.8rem;
		color: #94a3b8;
		padding-left: 12px;
	}

	.load-more-replies-btn {
		background: none;
		border: none;
		font-size: 0.75rem;
		font-weight: 600;
		color: #64748b;
		cursor: pointer;
		padding: 4px 12px;
		text-align: left;
		transition: color 0.2s;
	}

	.load-more-replies-btn:hover {
		color: #0ea5e9;
	}
</style>
