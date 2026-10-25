<!--
  @component StoryLikesDrawer
  @domain stories
  @description Tiroir modal affichant la liste des utilisateurs ayant aimé la story (accessible par l'auteur).
  @responsibilities
    - Afficher le nombre total de likes et l'état de chargement
    - Lister les profils des utilisateurs (avatar, nom complet, pseudo) avec redirection au clic
    - Gérer la fermeture au clic sur le backdrop ou la croix
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import Icon from '$lib/components/ui/Icon.svelte';

	interface Props {
		isOpen: boolean;
		likesCount: number;
		likes: Array<{
			id: string;
			username: string | null;
			name: string | null;
			image: string | null;
		}> | null;
		isLoading?: boolean;
		onClose: () => void;
	}

	let {
		isOpen = false,
		likesCount = 0,
		likes = null,
		isLoading = false,
		onClose
	}: Props = $props();
</script>

{#if isOpen}
	<div
		class="interactions-drawer-backdrop"
		role="presentation"
		onclick={(e) => {
			if (e.target === e.currentTarget) {
				e.stopPropagation();
				onClose();
			}
		}}
	>
		<div class="interactions-drawer" role="dialog" aria-modal="true" tabindex="-1">
			<header class="drawer-header">
				<h3 class="drawer-title">
					<Icon name="action.like" size={16} color="#ef4444" /> J’aime ({likes?.length ??
						likesCount})
				</h3>
				<button type="button" class="btn-close-drawer" onclick={onClose} aria-label="Fermer">
					<Icon name="action.close" size={18} color="white" />
				</button>
			</header>

			<div class="drawer-body">
				{#if isLoading}
					<div class="drawer-loading">Chargement...</div>
				{:else if !likes || likes.length === 0}
					<div class="drawer-empty">Aucune mention J’aime pour le moment.</div>
				{:else}
					<ul class="drawer-users-list">
						{#each likes as u (u.id)}
							<li class="drawer-user-row">
								<a
									href={resolve(`/profil/${u.username || ''}`)}
									class="drawer-user-info"
									onclick={onClose}
								>
									{#if u.image}
										<img src={u.image} alt={u.username || ''} class="avatar-small" />
									{:else}
										<div class="avatar-small-placeholder">
											{(u.username || '?').charAt(0).toUpperCase()}
										</div>
									{/if}
									<div class="drawer-user-names">
										<strong>{u.name || u.username}</strong>
										<span>@{u.username}</span>
									</div>
								</a>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.interactions-drawer-backdrop {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.65);
		z-index: 50;
		display: flex;
		align-items: flex-end;
		backdrop-filter: blur(4px);
	}

	.interactions-drawer {
		background: #0f172a;
		color: #fff;
		width: 100%;
		max-height: 70%;
		border-radius: 20px 20px 0 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		animation: drawerSlideUp 0.22s ease-out;
		border-top: 1px solid rgba(255, 255, 255, 0.12);
	}

	@keyframes drawerSlideUp {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
		}
	}

	.drawer-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 16px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.drawer-title {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 700;
		color: #fff;
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.btn-close-drawer {
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.7);
		font-size: 1.1rem;
		cursor: pointer;
		padding: 4px;
		border-radius: 6px;
	}

	.drawer-body {
		padding: 8px 16px 20px;
		overflow-y: auto;
		flex: 1;
	}

	.drawer-loading,
	.drawer-empty {
		text-align: center;
		padding: 32px 10px;
		color: rgba(255, 255, 255, 0.6);
		font-size: 0.95rem;
	}

	.drawer-users-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.drawer-user-row {
		padding: 10px 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}

	.drawer-user-info {
		display: flex;
		align-items: center;
		gap: 12px;
		text-decoration: none;
		color: #fff;
	}

	.avatar-small,
	.avatar-small-placeholder {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		flex-shrink: 0;
		object-fit: cover;
	}

	.avatar-small-placeholder {
		background: #3b82f6;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: bold;
		font-size: 0.95rem;
	}

	.drawer-user-names {
		display: flex;
		flex-direction: column;
	}

	.drawer-user-names strong {
		font-size: 0.92rem;
		color: #f8fafc;
	}

	.drawer-user-names span {
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.6);
	}
</style>
