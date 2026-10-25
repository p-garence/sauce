<!--
  @component PostActionsBar
  @domain post
  @description Barre d'actions inférieure d'une publication (like, commentaires, partage).
-->
<script lang="ts">
	import LikeButton from '$lib/components/post/LikeButton.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	let {
		postId,
		isLiked,
		likesCount,
		commentsCount,
		authorUsername,
		ontogglecomments,
		onlikechange
	}: {
		postId: string;
		isLiked: boolean;
		likesCount: number;
		commentsCount: number;
		authorUsername: string;
		ontogglecomments: () => void;
		onlikechange?: (liked: boolean, count: number) => void;
	} = $props();
</script>

<footer class="post-actions">
	<LikeButton
		{postId}
		initialLiked={isLiked}
		initialCount={likesCount}
		username={authorUsername}
		onLikeChange={onlikechange}
	/>
	<button
		class="action-btn"
		type="button"
		onclick={ontogglecomments}
		aria-label="Commentaires ({commentsCount})"
	>
		<span class="icon" aria-hidden="true"><Icon name="action.comment" size={20} /></span>
		<span class="count">{commentsCount}</span>
	</button>
</footer>

<style>
	.post-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		padding: 12px 16px;
		gap: 20px;
	}
	.action-btn {
		background: none;
		border: none;
		padding: 6px 8px;
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 1rem;
		color: var(--text-muted, #666);
		cursor: pointer;
		border-radius: 20px;
		transition:
			background-color 0.2s,
			color 0.2s;
	}
	.action-btn:hover {
		background-color: #f1f5f9;
		color: #0f172a;
	}
</style>
