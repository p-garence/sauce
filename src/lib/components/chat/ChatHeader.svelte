<script lang="ts">
	/**
	 * @component ChatHeader
	 * @domain chat
	 * @description Barre d'en-tête de conversation directe ou de groupe (avatar, titre, sourdine, suivi utilisateur et menu d'actions).
	 *
	 * @responsibilities
	 * - Afficher l'identité de l'interlocuteur (ou du groupe) avec redirection vers le profil / infos.
	 * - Proposer le bouton de retour avec navigation intelligente.
	 * - Permettre le suivi direct de l'interlocuteur via `FollowButton`.
	 * - Exposer le menu déroulant des actions de chat (sourdine, suppression, blocage).
	 */

	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import Icon from '$lib/components/ui/Icon.svelte';
	import ActionMenu from '$lib/components/ui/ActionMenu.svelte';
	import FollowButton from '$lib/components/profile/FollowButton.svelte';
	import type { MenuAction } from '$lib/types';

	interface Props {
		/** Identifiant de la conversation */
		chatId: string;
		/** Type de chat : direct entre deux membres ou groupe */
		type: 'direct' | 'group';
		/** Titre de la conversation (nom de l'utilisateur ou du groupe) */
		title: string;
		/** Image ou avatar associé */
		image?: string | null;
		/** Description optionnelle (pour un groupe) */
		description?: string | null;
		/** Indique si les notifications sont en sourdine */
		isMuted?: boolean;
		/** Identifiant de l'interlocuteur direct */
		otherUserId?: string | null;
		/** Nom d'utilisateur de l'interlocuteur direct */
		otherUserUsername?: string | null;
		/** Indique si un retour dans l'historique de navigation est possible */
		canGoBack?: boolean;
		/** Actions du menu de conversation */
		chatActions?: MenuAction[];
		/** Callback pour le bouton retour */
		onBack?: (e: MouseEvent) => void;
	}

	let {
		chatId,
		type,
		title,
		image = null,
		description = null,
		isMuted = false,
		otherUserId = null,
		otherUserUsername = null,
		canGoBack = false,
		chatActions = [],
		onBack
	}: Props = $props();

	function handleBackClick(e: MouseEvent) {
		if (onBack) {
			onBack(e);
		} else {
			e.preventDefault();
			if (canGoBack) window.history.back();
			else goto(resolve('/chat'));
		}
	}

	function handleProfileClick(e: MouseEvent) {
		if (type === 'group') return;
		e.preventDefault();
		if (otherUserUsername) {
			goto(resolve(`/profil/${otherUserUsername}`), { state: { showBack: true } });
		}
	}
</script>

<header class="chat-header">
	<a href={resolve('/chat')} class="back-btn" aria-label="Retour" onclick={handleBackClick}>
		<span class="icon"><Icon name="action.back" size={20} /></span>
	</a>

	<a
		href={type === 'direct'
			? resolve(`/profil/${otherUserUsername || ''}`)
			: resolve(`/chat/${chatId}/infos`)}
		class="chat-user-info"
		onclick={type === 'direct' ? handleProfileClick : undefined}
	>
		{#if image}
			<img src={image} alt={title} class="avatar-small" />
		{:else}
			<div class="avatar-placeholder">
				{(title || '?').charAt(0).toUpperCase()}
			</div>
		{/if}
		<div class="header-text-container">
			<div class="header-title-row">
				<h1 class="header-username">{title}</h1>
				{#if isMuted}
					<span class="mute-header-badge" title="En sourdine">
						<Icon name="status.mute" size={14} />
					</span>
				{/if}
			</div>
			{#if type === 'group' && description}
				<span class="header-description">{description}</span>
			{/if}
		</div>
	</a>

	<div class="header-right">
		{#if type === 'direct' && otherUserId}
			<FollowButton targetId={otherUserId} variant="profile" />
		{/if}
		{#if chatActions.length > 0}
			<ActionMenu actions={chatActions} />
		{/if}
	</div>
</header>

<style>
	.chat-header {
		display: flex;
		align-items: center;
		padding: 12px 16px;
		background: #ffffff;
		border-bottom: 1px solid #f0f0f0;
		flex-shrink: 0;
		gap: 12px;
		z-index: 10;
	}

	.back-btn {
		background: none;
		border: none;
		cursor: pointer;
		color: #0f172a;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 6px;
		border-radius: 50%;
		text-decoration: none;
	}

	.back-btn:hover {
		background: #f1f5f9;
	}

	.chat-user-info {
		display: flex;
		align-items: center;
		gap: 12px;
		flex: 1;
		min-width: 0;
		text-decoration: none;
		color: inherit;
	}

	.avatar-small {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		object-fit: cover;
		flex-shrink: 0;
	}

	.avatar-placeholder {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: #e2e8f0;
		color: #475569;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font-size: 1.1rem;
		flex-shrink: 0;
	}

	.header-text-container {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.header-title-row {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.header-username {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 700;
		color: #0f172a;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.mute-header-badge {
		color: #94a3b8;
		display: flex;
		align-items: center;
	}

	.header-description {
		font-size: 0.8rem;
		color: #64748b;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 8px;
	}
</style>
