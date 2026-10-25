<script lang="ts">
	/**
	 * @component CommentReplyItem
	 * @domain comments
	 * @description Adaptateur léger pour afficher une réponse à un commentaire via `CommentBaseItem`.
	 *
	 * @responsibilities
	 * - Configurer `CommentBaseItem` avec le mode réponse (taille adaptée, styles imbriqués).
	 * - Relayer les interactions (réponse, suppression, mise à jour) vers le gestionnaire parent.
	 */

	import type { CommentData } from '$lib/types';
	import CommentBaseItem from '$lib/components/comments/CommentBaseItem.svelte';

	interface Props {
		/** Données de la réponse (bindable) */
		reply: CommentData;
		/** Callback pour répondre à cette réponse */
		onReply: (rootId: string, username: string, isSubReply: boolean) => void;
		/** Callback déclenché lors de la suppression */
		onDeleted: (replyId: string, softDeleted?: boolean) => void;
		/** Callback déclenché lors de la mise à jour */
		onUpdated?: (updatedReply: CommentData) => void;
	}

	let {
		reply = $bindable(),
		onReply,
		onDeleted,
		onUpdated
	}: Props = $props();
</script>

<CommentBaseItem
	bind:comment={reply}
	isReply={true}
	onReply={() => onReply(reply.parentId || reply.id, reply.author?.username || '', true)}
	{onDeleted}
	{onUpdated}
/>
