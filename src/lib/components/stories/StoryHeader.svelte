<!--
  @component StoryHeader
  @domain stories
  @description En-tête du lecteur de story affichant les métadonnées de l'auteur (avatar, nom, badge groupe, date) et les contrôles (téléchargement, édition, suppression, follow, fermeture).
  @responsibilities
    - Afficher les infos de l'auteur et la date de publication
    - Afficher le badge de groupe avec couleur et icône si applicable
    - Fournir les actions de gestion pour l'auteur (téléchargement, paramètres, suppression)
    - Fournir le bouton de suivi (FollowButton) pour les tiers et le bouton de fermeture
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import type { StoryBundle, StoryItem, IconId } from '$lib/types';
	import Icon from '$lib/components/ui/Icon.svelte';
	import FollowButton from '$lib/components/profile/FollowButton.svelte';
	import FormattedDate from '$lib/components/ui/FormattedDate.svelte';

	interface Props {
		author: StoryBundle['author'];
		currentStory: StoryItem;
		isAuthor: boolean;
		isDownloading?: boolean;
		onClose: () => void;
		onDownload?: (e?: MouseEvent) => void;
		onOpenSettings?: () => void;
		onDelete?: () => void;
	}

	let {
		author,
		currentStory,
		isAuthor = false,
		isDownloading = false,
		onClose,
		onDownload,
		onOpenSettings,
		onDelete
	}: Props = $props();
</script>

<header class="story-header">
	<a
		href={resolve(`/profil/${author.username || ''}`)}
		class="author-info"
		onclick={(e) => {
			e.stopPropagation();
			onClose();
		}}
	>
		<div
			class="author-avatar"
			style={currentStory.groupColor ? `border-color: ${currentStory.groupColor};` : ''}
		>
			{#if author.image}
				<img src={author.image} alt="Avatar" />
			{:else}
				<div class="avatar-placeholder">
					{author.username?.charAt(0).toUpperCase() || '?'}
				</div>
			{/if}
		</div>

		<div class="author-meta">
			<div class="name-row">
				<span class="username">@{author.username}</span>
				<span class="dot">•</span>
				<FormattedDate date={currentStory.createdAt} class="time" compact />
			</div>

			{#if currentStory.groupName}
				<span class="group-badge" style="background: {currentStory.groupColor || '#10b981'};">
					{#if currentStory.groupIcon && currentStory.groupIcon !== 'star'}
						<Icon name={currentStory.groupIcon as IconId} size={12} color="white" />
					{/if}
					<span>{currentStory.groupName}</span>
				</span>
			{/if}
		</div>
	</a>

	<div class="header-actions">
		{#if isAuthor}
			<button
				type="button"
				class="btn-icon"
				title="Télécharger la story"
				disabled={isDownloading}
				onclick={onDownload}
			>
				<Icon name="action.download" size={18} color="white" />
			</button>

			<button
				type="button"
				class="btn-icon"
				title="Modifier la visibilité et l'archivage"
				onclick={(e) => {
					e.stopPropagation();
					onOpenSettings?.();
				}}
			>
				<Icon name="action.edit" size={18} color="white" />
			</button>

			<button type="button" class="btn-icon" title="Supprimer la story" onclick={onDelete}>
				<Icon name="action.delete" size={18} color="white" />
			</button>
		{:else if author.id}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="story-follow-wrapper" onclick={(e) => e.stopPropagation()}>
				<FollowButton targetId={author.id} variant="small" />
			</div>
		{/if}

		<button type="button" class="btn-close" aria-label="Fermer" onclick={onClose}>
			<Icon name="action.close" size={20} color="white" />
		</button>
	</div>
</header>

<style>
	.story-header {
		position: absolute;
		top: 22px;
		left: 12px;
		right: 12px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		z-index: 30;
		color: #fff;
		text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7);
	}

	.author-info {
		display: flex;
		align-items: center;
		gap: 10px;
		text-decoration: none;
		color: inherit;
		cursor: pointer;
		transition: opacity 0.15s ease;
	}

	.author-info:hover {
		opacity: 0.85;
	}

	.author-avatar {
		width: 38px;
		height: 38px;
		border-radius: 50%;
		overflow: hidden;
		border: 2px solid #fff;
		flex-shrink: 0;
		background: #222;
	}

	.author-avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.avatar-placeholder {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: bold;
		background: #3b82f6;
		color: #fff;
	}

	.author-meta {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.name-row {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.username {
		font-weight: 600;
		font-size: 0.95rem;
	}

	.dot {
		opacity: 0.7;
		font-size: 0.75rem;
	}

	.name-row :global(.time) {
		opacity: 0.8;
		font-size: 0.82rem;
	}

	.group-badge {
		font-size: 0.72rem;
		font-weight: 600;
		color: #fff;
		padding: 2px 7px;
		border-radius: 10px;
		display: inline-flex;
		align-items: center;
		gap: 4px;
		width: fit-content;
		text-shadow: none;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.story-follow-wrapper {
		display: inline-flex;
		align-items: center;
	}
	:global(.story-follow-wrapper .btn-follow-small) {
		color: #ffffff !important;
		background: rgba(0, 0, 0, 0.4) !important;
		backdrop-filter: blur(4px);
		padding: 6px 12px !important;
		border-radius: 20px !important;
	}
	:global(.story-follow-wrapper .btn-follow-small:hover) {
		background: rgba(0, 0, 0, 0.6) !important;
	}
	:global(.story-follow-wrapper .btn-small-trigger) {
		color: #ffffff !important;
		background: rgba(0, 0, 0, 0.4) !important;
		backdrop-filter: blur(4px);
		padding: 6px 8px !important;
		border-radius: 20px !important;
	}
	:global(.story-follow-wrapper .btn-small-trigger:hover) {
		background: rgba(0, 0, 0, 0.6) !important;
	}

	.btn-icon,
	.btn-close {
		background: rgba(0, 0, 0, 0.4);
		border: none;
		color: #fff;
		width: 34px;
		height: 34px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.1rem;
		cursor: pointer;
		backdrop-filter: blur(4px);
		transition: background 0.15s;
	}

	.btn-icon:hover,
	.btn-close:hover {
		background: rgba(0, 0, 0, 0.7);
	}
</style>
