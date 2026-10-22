<script lang="ts">
	/**
	 * @component PostHeader
	 * @domain Post
	 * @description En-tête d'une publication affichant l'auteur, la date et les boutons d'actions
	 * @responsibilities
	 * - Afficher l'identité de l'auteur (avatar, nom, date avec FormattedDate) ou l'avatar serveur si post système
	 * - Proposer le sélecteur de visibilité pour l'auteur ou le bouton de suivi pour les visiteurs
	 * - Intégrer le menu d'actions contextuel (ActionMenu)
	 */
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import type { PostData, PostVisibility, MenuAction } from '$lib/types';
	import FollowButton from '$lib/components/profile/FollowButton.svelte';
	import ActionMenu from '$lib/components/ui/ActionMenu.svelte';
	import VisibilitySelect from '$lib/components/post/VisibilitySelect.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import FormattedDate from '$lib/components/ui/FormattedDate.svelte';

	interface Props {
		/** Données de la publication */
		post: PostData;
		/** L'utilisateur est-il connecté ? */
		isLoggedIn: boolean;
		/** La publication appartient-elle à l'utilisateur connecté ? */
		isOwnPost: boolean;
		/** S'agit-il d'une publication générée par le serveur ? */
		isSystemPost: boolean;
		/** Liste des actions du menu contextuel */
		postActions: MenuAction[];
		/** Callback lors du changement de visibilité */
		onVisibilityChange?: (newVisibility: PostVisibility, newGroupId: string | null) => void;
	}

	let {
		post,
		isLoggedIn,
		isOwnPost,
		isSystemPost,
		postActions,
		onVisibilityChange
	}: Props = $props();

	function goToProfile(e: MouseEvent) {
		e.preventDefault();
		goto(resolve(`/profil/${post.author.username}`), { state: { showBack: true } });
	}
</script>

<header class="post-header">
	{#if isSystemPost}
		<a
			href={resolve('/profil/serveur')}
			class="author-profile-link"
			onclick={goToProfile}
		>
			<div class="avatar avatar-server">
				<Icon name="status.server" size={18} />
			</div>
			<div class="author-info">
				<strong>Le serveur</strong>
				<FormattedDate date={post.createdAt} class="date" />
			</div>
		</a>
	{:else}
		<a
			href={resolve(`/profil/${post.author.username}`)}
			class="author-profile-link"
			onclick={goToProfile}
		>
			<div class="avatar">
				{#if post.author.avatar}
					<img src={post.author.avatar} alt="Avatar" loading="lazy" decoding="async" />
				{:else}
					<div class="avatar-placeholder">{post.author.username.charAt(0).toUpperCase()}</div>
				{/if}
			</div>
			<div class="author-info">
				<strong>{post.author.name}</strong>
				<FormattedDate date={post.createdAt} class="date" />
			</div>
		</a>
	{/if}

	{#if isLoggedIn}
		<div class="header-actions">
			{#if isSystemPost}
				<FollowButton
					targetId={post.author.id}
					variant="small"
					initialStatus={post.author.isFollowing ? 'following' : 'none'}
				/>
			{:else if isOwnPost}
				<VisibilitySelect
					postId={post.id}
					initialGroupId={post.groupId}
					initialVisibility={post.visibility || 'public'}
					onToggle={(newVis, newGroupId) => {
						onVisibilityChange?.(newVis, newGroupId ?? null);
					}}
				/>
			{:else}
				<FollowButton
					targetId={post.author.id}
					variant="small"
					initialStatus={post.author.isFollowing ? 'following' : 'none'}
				/>
			{/if}
			<ActionMenu actions={postActions} />
		</div>
	{/if}
</header>

<style>
	.post-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 16px 12px;
	}
	.author-profile-link {
		display: flex;
		align-items: center;
		gap: 12px;
		text-decoration: none;
		color: inherit;
	}
	.avatar,
	.avatar-placeholder,
	.avatar-server {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: bold;
		color: #fff;
		background-color: #3b82f6;
		overflow: hidden;
	}
	.avatar-server {
		background-color: #0f172a;
		color: #38bdf8;
		border: 1px solid #1e293b;
	}
	.avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.author-info {
		display: flex;
		flex-direction: column;
	}
	.author-info strong {
		font-size: 0.95rem;
		color: var(--text-main, #000);
	}
	.author-info :global(.date) {
		font-size: 0.8rem;
		color: var(--text-muted, #888);
	}
	.header-actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}
</style>
