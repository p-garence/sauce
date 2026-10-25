<script lang="ts">
	/**
	 * @component ProfileHeader
	 * @domain Profile
	 * @description En-tête complet du profil utilisateur (identité, avatar story, stats et bio)
	 * @responsibilities
	 * - Afficher l'avatar utilisateur avec anneau de story réactif
	 * - Gérer les boutons d'actions (Modifier le profil ou Suivre/Message)
	 * - Afficher les métadonnées (nom, pronoms, âge, bio, liens de contact et date d'inscription)
	 * - Présenter les compteurs d'abonnés, abonnements, relations mutuelles ou invitations en attente
	 */
	import { resolve } from '$app/paths';
	import FollowButton from '$lib/components/profile/FollowButton.svelte';
	import StoryAvatar from '$lib/components/stories/StoryAvatar.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { formatFullDate } from '$lib/dates';
	import type { StoryBundle } from '$lib/types';

	export interface ProfileData {
		id: string;
		username: string | null;
		name: string | null;
		image?: string | null;
		role?: string | null;
		age?: number | string | null;
		genre?: string | null;
		bio?: string | null;
		contactEmail?: string | null;
		site?: string | null;
		createdAt: string | Date;
		profileVisibility?: {
			genre?: boolean;
			age?: boolean;
			bio?: boolean;
		} | null;
	}

	interface Props {
		/** Données du profil consulté */
		profile: ProfileData;
		/** L'utilisateur connecté consulte-t-il son propre profil ? */
		isOwnProfile: boolean;
		/** L'utilisateur connecté suit-il ce profil ? */
		isFollowing: boolean;
		/** Une demande d'abonnement est-elle en attente ? */
		isPending?: boolean;
		/** Statistiques d'abonnements/abonnés */
		stats: {
			following: number;
		};
		/** Nombre d'abonnés calculé avec delta local */
		followersCount: number;
		/** Promesse paresseuse pour le nombre d'abonnés en commun */
		lazyMutuals?: Promise<number>;
		/** Nombre d'invitations / demandes de suivi en attente */
		pendingCount?: number;
		/** Paquet de stories associé à l'utilisateur */
		storyBundle?: StoryBundle | null;
		/** Clic sur l'avatar */
		onAvatarClick?: () => void;
		/** Changement d'état du bouton de suivi */
		onFollowToggle?: (newState: string) => void;
	}

	let {
		profile,
		isOwnProfile,
		isFollowing,
		isPending = false,
		stats,
		followersCount,
		lazyMutuals,
		pendingCount = 0,
		storyBundle = null,
		onAvatarClick,
		onFollowToggle
	}: Props = $props();
</script>

<section class="profile-info-section">
	<div class="profile-top-row">
		<div class="avatar-container">
			{#if profile.username === 'serveur'}
				<div class="avatar-server-large" title="Profil officiel du serveur">
					<Icon name="status.server" size={42} />
				</div>
				<span class="role-badge system">Système</span>
			{:else}
				<StoryAvatar
					image={profile.image}
					username={profile.username || ''}
					size={84}
					borderWidth={3}
					hasStory={Boolean(storyBundle && storyBundle.stories.length > 0)}
					unviewed={Boolean(storyBundle?.hasUnviewed)}
					groupRing={Boolean(storyBundle?.hasGroupStory)}
					groupColor={storyBundle?.primaryGroupColor}
					onclick={storyBundle && storyBundle.stories.length > 0 ? onAvatarClick : null}
					title={storyBundle && storyBundle.stories.length > 0
						? `Voir la story de ${profile.name || profile.username}`
						: `Photo de profil de ${profile.name || profile.username}`}
				/>
				{#if profile.role === 'admin'}
					<span class="role-badge admin">Admin</span>
				{/if}
			{/if}
		</div>

		<div class="profile-actions">
			{#if isOwnProfile}
				<a href={resolve('/modifier_profil')} class="btn-action edit">Modifier</a>
			{:else}
				<div class="action-group">
					<FollowButton
						targetId={profile.id || ''}
						variant="profile"
						initialStatus={isFollowing ? 'following' : isPending ? 'pending' : 'none'}
						onToggle={onFollowToggle}
					/>
					{#if profile.username !== 'serveur'}
						<a href={resolve(`/api/chat/direct/${profile.username}`)} class="btn-action message">
							Message
						</a>
					{/if}
				</div>
			{/if}
		</div>
	</div>

	<div class="profile-identity">
		{#if profile.name}
			<h2 class="display-name">{profile.name}</h2>
			<span class="handle">@{profile.username}</span>
		{:else}
			<h2 class="display-name">{profile.username}</h2>
		{/if}
	</div>

	{#if profile.age || profile.genre}
		<div class="profile-demographics">
			{#if profile.genre}
				<div class="demo-item">
					<span class="demo-label">Pronom(s) :</span>
					<span class="demo-value">
						{profile.genre}
						{#if isOwnProfile && !profile.profileVisibility?.genre}
							<span class="private-icon" data-tooltip="Visible uniquement par vous">
								<Icon name="status.lock" size={14} />
							</span>
						{/if}
					</span>
				</div>
			{:else}
				<div></div>
			{/if}

			{#if profile.age}
				<div class="demo-item right-align">
					<span class="demo-label">Âge :</span>
					<span class="demo-value">
						{profile.age}
						{#if isOwnProfile && !profile.profileVisibility?.age}
							<span class="private-icon" data-tooltip="Visible uniquement par vous">
								<Icon name="status.lock" size={14} />
							</span>
						{/if}
					</span>
				</div>
			{/if}
		</div>
	{/if}

	{#if profile.bio}
		<div class="profile-bio">
			<p>
				{profile.bio}
				{#if isOwnProfile && !profile.profileVisibility?.bio}
					<span class="private-icon" data-tooltip="Visible uniquement par vous">
						<Icon name="status.lock" size={14} />
					</span>
				{/if}
			</p>
		</div>
	{/if}

	<div class="profile-links">
		{#if profile.contactEmail}
			<div class="link-item">
				<span class="icon"><Icon name="action.message" size={16} /></span>
				<a href="mailto:{profile.contactEmail}">{profile.contactEmail}</a>
			</div>
		{/if}
		{#if profile.site}
			<div class="link-item">
				<span class="icon"><Icon name="action.copy_link" size={16} /></span>
				<a href={profile.site} target="_blank" rel="noopener noreferrer external">
					{profile.site.replace(/^https?:\/\//, '')}
				</a>
			</div>
		{/if}
		<div class="link-item text-muted">
			<span>A rejoint le {formatFullDate(profile.createdAt)}</span>
		</div>
	</div>
</section>

<section class="stats-section">
	<a href={resolve(`/profil/${profile.username || ''}/abonnes`)} class="stat-box link">
		<span class="stat-number">{followersCount}</span>
		<span class="stat-label">Abonnés</span>
	</a>

	<a href={resolve(`/profil/${profile.username || ''}/abonnements`)} class="stat-box link">
		<span class="stat-number">{stats.following}</span>
		<span class="stat-label">Abonnements</span>
	</a>

	{#if !isOwnProfile}
		{#if lazyMutuals}
			{#await lazyMutuals}
				<div class="stat-box mutuals">
					<span class="stat-number opacity-50">...</span>
					<span class="stat-label">En commun</span>
				</div>
			{:then mutualsCount}
				{#if mutualsCount > 0}
					<a
						href={resolve(`/profil/${profile.username || ''}/en-commun`)}
						class="stat-box link mutuals"
					>
						<span class="stat-number">{mutualsCount}</span>
						<span class="stat-label">En commun</span>
					</a>
				{/if}
			{/await}
		{/if}
	{:else if pendingCount > 0}
		<a
			href={resolve(`/profil/${profile.username || ''}/invites`)}
			class="stat-box link pending-box"
		>
			<span class="stat-number pending-number">{pendingCount}</span>
			<span class="stat-label pending-label">En attente</span>
		</a>
	{/if}
</section>

<style>
	.profile-info-section {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.profile-top-row {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}
	.avatar-container {
		position: relative;
	}
	.role-badge {
		position: absolute;
		bottom: -6px;
		left: 50%;
		transform: translateX(-50%);
		font-size: 0.65rem;
		font-weight: bold;
		padding: 2px 6px;
		border-radius: 12px;
		color: white;
		border: 2px solid white;
	}
	.role-badge.admin {
		background: #e0245e;
	}
	.role-badge.system {
		background: #0284c7;
	}
	.avatar-server-large {
		width: 84px;
		height: 84px;
		border-radius: 50%;
		background: linear-gradient(135deg, #0284c7, #0369a1);
		color: #ffffff;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 4px 14px rgba(2, 132, 199, 0.25);
		border: 3px solid #ffffff;
	}
	.action-group {
		display: flex;
		flex-direction: column;
		gap: 8px;
		min-width: 140px;
	}
	.profile-actions .btn-action {
		box-sizing: border-box;
		width: 100%;
		text-align: center;
		padding: 10px 16px;
		font-weight: bold;
		font-size: 0.95rem;
		border-radius: 8px;
		cursor: pointer;
		text-decoration: none;
		border: 1px solid var(--border-color, #ccc);
		background: transparent;
		color: var(--text-default, #1a1a1a);
		display: block;
		transition: background 0.2s;
	}
	.profile-actions .btn-action:hover {
		background: var(--bg-default, #f5f5f5);
	}
	.profile-actions .btn-action.edit {
		width: auto;
		display: inline-block;
	}
	.profile-identity {
		display: flex;
		flex-direction: column;
	}
	.display-name {
		margin: 0;
		font-size: 1.4rem;
		font-weight: 800;
		line-height: 1.2;
		color: var(--text-default, #1a1a1a);
	}
	.handle {
		font-size: 0.95rem;
		color: var(--text-muted, #666);
	}
	.profile-demographics {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
	}
	.demo-item {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.95rem;
	}
	.demo-item.right-align {
		justify-content: flex-end;
	}
	.demo-label {
		font-weight: bold;
		color: var(--text-muted, #666);
		font-size: 0.85rem;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
	.demo-value {
		color: var(--text-default, #1a1a1a);
		font-weight: 500;
		display: flex;
		align-items: center;
	}
	.profile-bio {
		background: var(--bg-default, #f9fafb);
		padding: 12px 16px;
		border-radius: 8px;
		border: 1px solid var(--border-color, #eaeaea);
	}
	.profile-bio p {
		margin: 0;
		font-size: 0.95rem;
		line-height: 1.5;
		color: var(--text-default, #1a1a1a);
		word-wrap: break-word;
		white-space: pre-line;
	}
	.profile-links {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.link-item {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.9rem;
	}
	.link-item .icon {
		font-size: 1rem;
		opacity: 0.8;
	}
	.link-item a {
		color: var(--primary, #0ea5e9);
		text-decoration: none;
		font-weight: 500;
	}
	.link-item.text-muted {
		color: var(--text-muted, #666);
	}
	.private-icon {
		display: inline-block;
		margin-left: 6px;
		opacity: 0.6;
		position: relative;
		cursor: default;
	}
	.stats-section {
		display: flex;
		justify-content: center;
		gap: 32px;
		padding: 16px;
		border-top: 1px solid var(--border-color, #eaeaea);
		border-bottom: 1px solid var(--border-color, #eaeaea);
	}
	.stat-box {
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	.stat-box.link {
		text-decoration: none;
		cursor: pointer;
		transition:
			transform 0.1s ease,
			opacity 0.2s;
	}
	.stat-box.link:active {
		transform: scale(0.95);
	}
	.stat-box.link:hover {
		opacity: 0.8;
	}
	.stat-number {
		font-size: 1.2rem;
		font-weight: bold;
		color: var(--text-default, #1a1a1a);
	}
	.stat-label {
		font-size: 0.8rem;
		color: var(--text-muted, #666);
	}
	.stat-box.mutuals .stat-number {
		color: var(--primary, #0ea5e9);
	}
	.pending-box .pending-number {
		color: #ef4444;
	}
	.pending-box .pending-label {
		color: #ef4444;
		font-weight: 600;
	}
	.opacity-50 {
		opacity: 0.5;
	}
</style>
