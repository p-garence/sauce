<!--
  @component LikeButton
  @domain post
  @description Bouton J'aime avec compteur cliquable ouvrant la liste des personnes ayant aimé.
-->
<script lang="ts">
	import { clearProfileState } from '$lib/client/profileMemory.svelte';
	import LikesModal from '$lib/components/post/LikesModal.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { apiToggleLike } from '$lib/client/api';

	let {
		postId,
		initialLiked = false,
		initialCount = 0,
		username = '',
		onLikeChange
	}: {
		postId: string;
		initialLiked?: boolean;
		initialCount?: number;
		username?: string;
		onLikeChange?: (liked: boolean, count: number) => void;
	} = $props();

	// 1. Valeurs du serveur (réactives aux props)
	let serverLiked = $derived(initialLiked);
	let serverCount = $derived(initialCount);

	// 2. Override optimiste local
	let optimisticLiked = $state<boolean | null>(null);
	let optimisticDelta = $state(0);

	// Synchronise si la prop externe change (ex: double-tap)
	$effect(() => {
		void initialLiked;
		void initialCount;
		optimisticLiked = null;
		optimisticDelta = 0;
	});

	// 3. Fusion
	let isLiked = $derived(optimisticLiked !== null ? optimisticLiked : serverLiked);
	let count = $derived(serverCount + optimisticDelta);
	let isLoading = $state(false);
	let showLikesModal = $state(false);

	async function toggleLike(e: MouseEvent) {
		e.stopPropagation(); // Évite de cliquer sur le post si le bouton est dans un lien
		if (isLoading) return;

		isLoading = true;
		const nextLiked = !isLiked;

		// Optimistic UI : On met à jour l'affichage immédiatement
		optimisticLiked = nextLiked;
		optimisticDelta = nextLiked ? (serverLiked ? 0 : 1) : serverLiked ? -1 : 0;
		const nextCount = serverCount + optimisticDelta;
		onLikeChange?.(nextLiked, nextCount);

		try {
			await apiToggleLike(postId, nextLiked ? 'like' : 'unlike');
		} catch (error) {
			console.error('Erreur Like:', error);
			// En cas d'erreur, on annule l'Optimistic UI
			optimisticLiked = null;
			optimisticDelta = 0;
			onLikeChange?.(serverLiked, serverCount);
		} finally {
			isLoading = false;
			clearProfileState(username, 'likes');
		}
	}
</script>

<div class="like-button-group">
	<button
		type="button"
		class="action-btn"
		onclick={toggleLike}
		class:active={isLiked}
		disabled={isLoading}
		aria-label={isLiked ? 'Je n’aime plus' : 'J’aime'}
	>
		<div class="icon-wrapper">
			<span class="icon">
				<Icon
					name={isLiked ? 'action.like' : 'action.like_outline'}
					size={20}
					color={isLiked ? '#ef4444' : 'currentColor'}
				/>
			</span>
		</div>
	</button>

	{#if count > 0}
		<button
			type="button"
			class="count-btn"
			onclick={(e) => {
				e.stopPropagation();
				showLikesModal = true;
			}}
			title="Voir qui a aimé"
		>
			{count}
		</button>
	{:else}
		<span class="count-text">{count}</span>
	{/if}
</div>

<LikesModal isOpen={showLikesModal} onClose={() => (showLikesModal = false)} {postId} />

<style>
	.like-button-group {
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}

	.action-btn {
		background: none;
		border: none;
		padding: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1rem;
		cursor: pointer;
		border-radius: 50%;
		transition: transform 0.15s ease;
		-webkit-tap-highlight-color: transparent;
	}

	.icon-wrapper {
		display: flex;
		align-items: center;
		justify-content: center;
		transition: transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275);
	}

	.action-btn:active .icon-wrapper {
		transform: scale(0.7);
	}

	.count-btn {
		background: none;
		border: none;
		padding: 4px 6px;
		font-size: 0.95rem;
		font-weight: 500;
		color: #64748b;
		cursor: pointer;
		border-radius: 6px;
		transition:
			background-color 0.2s,
			color 0.2s;
	}

	.count-btn:hover {
		background-color: #f1f5f9;
		color: #0f172a;
	}

	.count-text {
		font-size: 0.95rem;
		color: #64748b;
		padding: 4px 6px;
	}

	.action-btn:disabled {
		cursor: default;
	}
</style>
