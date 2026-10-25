<!--
  @component LikesModal
  @domain post
  @description Modale affichant la liste des utilisateurs ayant aimé une publication.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import FollowButton from '$lib/components/profile/FollowButton.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	interface LikerUser {
		id: string;
		username: string | null;
		name: string | null;
		image: string | null;
		isFollowing: boolean;
	}

	let {
		isOpen = false,
		onClose,
		postId = '',
		storyId = '',
		title = 'Mentions J’aime'
	}: {
		isOpen: boolean;
		onClose: () => void;
		postId?: string;
		storyId?: string;
		title?: string;
	} = $props();

	let currentUserId = $derived(page.data.sessionUser?.id || '');
	let users = $state<LikerUser[]>([]);
	let isLoading = $state(false);
	let errorMsg = $state<string | null>(null);

	$effect(() => {
		if (isOpen && (postId || storyId)) {
			loadLikes();
		} else {
			users = [];
			errorMsg = null;
		}
	});

	async function loadLikes() {
		isLoading = true;
		errorMsg = null;

		try {
			const endpoint = postId
				? `/api/posts/${postId}/likes`
				: `/api/stories/${storyId}/interactions`;

			const res = await fetch(endpoint);
			if (!res.ok) throw new Error('Impossible de charger les mentions J’aime');
			const data = await res.json();
			users = data.likes || [];
		} catch (err: unknown) {
			errorMsg = err instanceof Error ? err.message : 'Une erreur est survenue';
		} finally {
			isLoading = false;
		}
	}

	function handleBackdrop(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}
</script>

{#if isOpen}
	<div
		class="modal-backdrop"
		role="dialog"
		aria-modal="true"
		onclick={handleBackdrop}
		onkeydown={(e) => e.key === 'Escape' && onClose()}
		tabindex="-1"
	>
		<div class="modal-card">
			<header class="modal-header">
				<h3>{title}</h3>
				<button type="button" class="close-btn" onclick={onClose} aria-label="Fermer">
					<Icon name="action.close" size={18} />
				</button>
			</header>

			<div class="modal-body">
				{#if isLoading}
					<div class="loading-state">
						<span class="spinner"></span>
						<p>Chargement...</p>
					</div>
				{:else if errorMsg}
					<div class="error-state">
						<p>{errorMsg}</p>
					</div>
				{:else if users.length === 0}
					<div class="empty-state">
						<p>Aucune mention J’aime pour le moment.</p>
					</div>
				{:else}
					<ul class="users-list">
						{#each users as u (u.id)}
							<li class="user-row">
								<a
									href={resolve(`/profil/${u.username || ''}`)}
									class="user-info"
									onclick={onClose}
								>
									{#if u.image}
										<img src={u.image} alt={u.username || ''} class="avatar" />
									{:else}
										<div class="avatar-placeholder">
											{(u.username || '?').charAt(0).toUpperCase()}
										</div>
									{/if}
									<div class="names">
										<strong class="display-name">{u.name || u.username}</strong>
										{#if u.username}
											<span class="username">@{u.username}</span>
										{/if}
									</div>
								</a>

								{#if u.id !== currentUserId}
									<div class="follow-action">
										<FollowButton
											targetId={u.id}
											variant="small"
											initialStatus={u.isFollowing ? 'following' : 'none'}
										/>
									</div>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 16px;
		backdrop-filter: blur(2px);
	}

	.modal-card {
		background: #ffffff;
		border-radius: 16px;
		width: 100%;
		max-width: 440px;
		max-height: 80vh;
		display: flex;
		flex-direction: column;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
		overflow: hidden;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		border-bottom: 1px solid #f1f5f9;
	}

	.modal-header h3 {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 700;
		color: #0f172a;
	}

	.close-btn {
		background: none;
		border: none;
		font-size: 1.1rem;
		cursor: pointer;
		color: #64748b;
		padding: 4px;
		border-radius: 6px;
	}

	.close-btn:hover {
		color: #0f172a;
		background: #f1f5f9;
	}

	.modal-body {
		padding: 8px 0;
		overflow-y: auto;
		flex: 1;
	}

	.loading-state,
	.error-state,
	.empty-state {
		padding: 32px 20px;
		text-align: center;
		color: #64748b;
		font-size: 0.95rem;
	}

	.spinner {
		display: inline-block;
		width: 24px;
		height: 24px;
		border: 3px solid #e2e8f0;
		border-top-color: #0f172a;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
		margin-bottom: 8px;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.users-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.user-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 20px;
		transition: background-color 0.15s;
		gap: 12px;
	}

	.user-row:hover {
		background-color: #f8fafc;
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: 12px;
		text-decoration: none;
		color: inherit;
		min-width: 0;
		flex: 1;
	}

	.avatar,
	.avatar-placeholder {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		flex-shrink: 0;
		object-fit: cover;
	}

	.avatar-placeholder {
		background: #e2e8f0;
		color: #475569;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font-size: 1.1rem;
	}

	.names {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.display-name {
		font-size: 0.95rem;
		color: #0f172a;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.username {
		font-size: 0.85rem;
		color: #64748b;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.follow-action {
		flex-shrink: 0;
	}
</style>
