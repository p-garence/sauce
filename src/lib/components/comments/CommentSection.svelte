<script lang="ts">
	/**
	 * @component CommentSection
	 * @domain comments
	 * @description Section complète des commentaires d'une publication, gérant le chargement trié, la pagination et le formulaire d'envoi.
	 *
	 * @responsibilities
	 * - Charger et paginer les commentaires de la publication selon le tri sélectionné.
	 * - Orchestrer la liste des `CommentItem` et la propagation des mises à jour / suppressions.
	 * - Dégager la saisie vers `CommentComposer`.
	 */

	import { slide } from 'svelte/transition';
	import type { CommentData } from '$lib/types';
	import { COMMENTS_PER_LOAD } from '$lib/constants';
	import CommentItem from '$lib/components/comments/CommentItem.svelte';
	import CommentComposer from '$lib/components/comments/CommentComposer.svelte';

	interface Props {
		/** Identifiant de la publication ciblée */
		postId: string;
		/** État d'ouverture/fermeture de la section de commentaires */
		isOpen?: boolean;
		/** Callback appelé lors de l'ajout réussi d'un commentaire */
		onCommentAdded?: () => void;
		/** Callback appelé lors de la suppression d'un ou plusieurs commentaires */
		onCommentDeleted?: (deletedCount: number) => void;
	}

	let {
		postId,
		isOpen = $bindable(false),
		onCommentAdded,
		onCommentDeleted
	}: Props = $props();

	let commentsList = $state<CommentData[]>([]);
	let isLoading = $state(false);
	let isLoadingMore = $state(false);

	let sortBy = $state<'newest' | 'oldest' | 'top'>('newest');
	let commentPage = $state(1);
	let hasMore = $state(false);
	const LIMIT = COMMENTS_PER_LOAD;

	let replyTo = $state<{ id: string; username: string } | null>(null);
	let composerRef = $state<ReturnType<typeof CommentComposer> | null>(null);

	let previousIsOpen = $state(false);

	$effect(() => {
		if (isOpen === previousIsOpen) return;

		if (isOpen) {
			commentPage = 1;
			loadComments(true);
		} else {
			commentsList = [];
			replyTo = null;
		}
		previousIsOpen = isOpen;
	});

	async function loadComments(reset = false) {
		if (reset) {
			commentPage = 1;
			isLoading = true;
		} else {
			isLoadingMore = true;
		}

		try {
			const res = await fetch(
				`/api/comments?postId=${postId}&sort=${sortBy}&page=${commentPage}&limit=${LIMIT}`
			);
			if (res.ok) {
				const data = await res.json();
				if (reset) {
					commentsList = data;
				} else {
					commentsList = [...commentsList, ...data];
				}
				hasMore = data.length === LIMIT;
			}
		} catch (err) {
			console.error(err);
		} finally {
			isLoading = false;
			isLoadingMore = false;
		}
	}

	function handleCommentSubmitted(addedComment: CommentData) {
		if (addedComment.parentId) {
			const parentIndex = commentsList.findIndex((c) => c.id === addedComment.parentId);
			if (parentIndex !== -1) {
				if (!commentsList[parentIndex].replies) {
					commentsList[parentIndex].replies = [];
				}
				commentsList[parentIndex].replies = [
					...commentsList[parentIndex].replies,
					addedComment
				];
				commentsList[parentIndex].showReplies = true;
				commentsList[parentIndex].repliesCount =
					(commentsList[parentIndex].repliesCount || 0) + 1;
			}
		} else {
			if (sortBy === 'oldest') {
				commentsList = [...commentsList, addedComment];
			} else {
				commentsList = [addedComment, ...commentsList];
			}
		}

		replyTo = null;
		if (onCommentAdded) onCommentAdded();
	}

	function handleReply(rootCommentId: string, username: string, isSubReply = false) {
		composerRef?.setReplyTarget(rootCommentId, username, isSubReply);
	}

	function handleCommentDeleted(
		deletedId: string,
		deletedCount: number,
		parentId?: string | null,
		softDeleted?: boolean
	) {
		if (softDeleted) {
			if (onCommentDeleted) {
				onCommentDeleted(deletedCount);
			}
			return;
		}

		if (parentId) {
			const parentIndex = commentsList.findIndex((c) => c.id === parentId);
			if (parentIndex !== -1 && commentsList[parentIndex].replies) {
				commentsList[parentIndex].replies = commentsList[parentIndex].replies.filter(
					(r) => r.id !== deletedId
				);
				commentsList[parentIndex].repliesCount = Math.max(
					0,
					(commentsList[parentIndex].repliesCount || 1) - 1
				);
				if (
					commentsList[parentIndex].content === '[deleted]' &&
					commentsList[parentIndex].repliesCount === 0
				) {
					commentsList = commentsList.filter((c) => c.id !== parentId);
				}
			}
		} else {
			commentsList = commentsList.filter((c) => c.id !== deletedId);
		}
		if (onCommentDeleted) {
			onCommentDeleted(deletedCount);
		}
	}

	function handleCommentUpdated(updatedComment: CommentData) {
		if (updatedComment.parentId) {
			const parentIndex = commentsList.findIndex((c) => c.id === updatedComment.parentId);
			if (parentIndex !== -1 && commentsList[parentIndex].replies) {
				const replyIndex = commentsList[parentIndex].replies.findIndex(
					(r) => r.id === updatedComment.id
				);
				if (replyIndex !== -1) {
					commentsList[parentIndex].replies[replyIndex] = {
						...commentsList[parentIndex].replies[replyIndex],
						...updatedComment
					};
				}
			}
		} else {
			const index = commentsList.findIndex((c) => c.id === updatedComment.id);
			if (index !== -1) {
				commentsList[index] = {
					...commentsList[index],
					...updatedComment
				};
			}
		}
	}
</script>

{#if isOpen}
	<section class="comment-section" transition:slide={{ duration: 300 }}>
		<div class="comment-filters">
			<span class="filter-label">Trier par :</span>
			<select bind:value={sortBy} onchange={() => loadComments(true)} class="sort-select">
				<option value="newest">Plus récents</option>
				<option value="top">Plus pertinents</option>
				<option value="oldest">Plus anciens</option>
			</select>
		</div>

		<div class="comments-scroll-area">
			{#if isLoading}
				<div class="loading-state">Chargement des commentaires...</div>
			{:else if commentsList.length === 0}
				<div class="empty-comments">Aucun commentaire pour l'instant. Soyez le premier !</div>
			{:else}
				{#each commentsList as comment, i (comment.id)}
					<CommentItem
						bind:comment={commentsList[i]}
						{postId}
						onReply={handleReply}
						onDeleted={handleCommentDeleted}
						onUpdated={handleCommentUpdated}
					/>
				{/each}

				{#if hasMore}
					<button
						type="button"
						class="btn-load-more"
						disabled={isLoadingMore}
						onclick={() => {
							commentPage += 1;
							loadComments(false);
						}}
					>
						{isLoadingMore ? 'Chargement...' : 'Afficher plus de commentaires'}
					</button>
				{/if}
			{/if}
		</div>

		<CommentComposer
			bind:this={composerRef}
			{postId}
			bind:replyTo
			onCommentSubmitted={handleCommentSubmitted}
		/>
	</section>
{/if}

<style>
	.comment-section {
		border-top: 1px solid #eaeaea;
		background: #fdfdfd;
		display: flex;
		flex-direction: column;
	}

	.comments-scroll-area {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.comment-filters {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		padding: 12px 16px 0;
		gap: 8px;
	}

	.filter-label {
		font-size: 0.8rem;
		color: #64748b;
		font-weight: 500;
	}

	.sort-select {
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		padding: 4px 8px;
		font-size: 0.8rem;
		color: #1e293b;
		background: #ffffff;
		outline: none;
		cursor: pointer;
	}

	.sort-select:focus {
		border-color: #0284c7;
	}

	.loading-state,
	.empty-comments {
		text-align: center;
		padding: 24px;
		color: #94a3b8;
		font-size: 0.9rem;
	}

	.btn-load-more {
		background: none;
		border: 1px solid #e2e8f0;
		border-radius: 16px;
		padding: 8px 16px;
		font-size: 0.85rem;
		color: #64748b;
		cursor: pointer;
		margin: 8px auto 0;
		display: block;
		transition: all 0.2s;
	}

	.btn-load-more:hover {
		background: #f8fafc;
		color: #0f172a;
		border-color: #cbd5e1;
	}

	.btn-load-more:disabled {
		opacity: 0.5;
		cursor: wait;
	}
</style>
