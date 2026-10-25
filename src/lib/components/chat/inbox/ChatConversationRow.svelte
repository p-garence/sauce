<script lang="ts">
	/**
	 * @component ChatConversationRow
	 * @domain chat
	 * @description Ligne de conversation active dans la boîte de réception (avatar, interlocuteur, aperçu du dernier message, statut non-lu et menu contextuel).
	 *
	 * @responsibilities
	 * - Afficher les informations résumées du fil de discussion.
	 * - Indiquer visuellement les messages non-lus et la mise en sourdine.
	 * - Donner accès rapide aux actions de conversation (sourdine, suppression).
	 */

	import { resolve } from '$app/paths';
	import type { ChatContact, MenuAction } from '$lib/types';
	import Icon from '$lib/components/ui/Icon.svelte';
	import ActionMenu from '$lib/components/ui/ActionMenu.svelte';
	import RichContent from '$lib/components/ui/RichContent.svelte';
	import FormattedDate from '$lib/components/ui/FormattedDate.svelte';

	interface Props {
		/** Contact / conversation à afficher */
		contact: ChatContact;
		/** Actions contextuelles de la discussion */
		actions?: MenuAction[];
	}

	let { contact, actions = [] }: Props = $props();
</script>

<div class="contact-row">
	<a href={resolve(`/chat/${contact.id}`)} class="contact-link">
		<div class="avatar-container">
			{#if contact.image}
				<img src={contact.image} alt={contact.title} class="avatar" />
			{:else}
				<div class="avatar-placeholder">
					{(contact.title || '?').charAt(0).toUpperCase()}
				</div>
			{/if}
		</div>
		<div class="contact-info">
			<div class="contact-title-row">
				<span class="username {contact.isUnread ? 'unread-text' : ''}">{contact.title}</span>
				{#if contact.isMuted}
					<span class="mute-badge" title="En sourdine">
						<Icon name="status.mute" size={14} />
					</span>
				{/if}
			</div>
			<span class="last-message {contact.isUnread ? 'unread-text' : ''}">
				{#if contact.isLastMessageFromMe}
					<span style="font-weight: 500; opacity: 0.7;">Vous : </span>
				{:else if contact.type === 'group' && contact.lastMessageSenderName}
					<span style="font-weight: 500; opacity: 0.7;">
						{contact.lastMessageSenderName} :
					</span>
				{/if}
				<RichContent content={contact.lastMessageContent} />
			</span>
		</div>
		{#if contact.isUnread}
			<span class="unread-dot"></span>
		{/if}
		{#if contact.lastMessageTime}
			<FormattedDate date={contact.lastMessageTime} class="contact-time" compact />
		{/if}
	</a>
	{#if actions.length > 0}
		<div class="contact-actions">
			<ActionMenu {actions} />
		</div>
	{/if}
</div>

<style>
	.contact-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 12px;
		border-radius: 12px;
		transition: background 0.2s;
	}

	.contact-row:hover {
		background: #f8fafc;
	}

	.contact-link {
		display: flex;
		align-items: center;
		gap: 16px;
		text-decoration: none;
		color: inherit;
		flex: 1;
		min-width: 0;
	}

	.contact-actions {
		display: flex;
		align-items: center;
		margin-left: 6px;
		flex-shrink: 0;
	}

	.avatar-container {
		position: relative;
		flex-shrink: 0;
	}

	.avatar,
	.avatar-placeholder {
		width: 50px;
		height: 50px;
		border-radius: 50%;
	}

	.avatar {
		object-fit: cover;
	}

	.avatar-placeholder {
		background: #f0f0f0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.2rem;
		font-weight: bold;
		color: #666;
	}

	.contact-info {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		flex: 1;
	}

	.contact-title-row {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.username {
		font-weight: 600;
		font-size: 1.1rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		color: #333;
	}

	.mute-badge {
		font-size: 0.85rem;
		opacity: 0.65;
		line-height: 1;
		flex-shrink: 0;
		display: flex;
		align-items: center;
	}

	:global(.contact-time) {
		margin-left: auto;
		font-size: 0.78rem;
		color: var(--text-muted, #888);
		white-space: nowrap;
		flex-shrink: 0;
		line-height: 1;
	}

	.last-message {
		font-size: 0.85rem;
		color: #64748b;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.unread-text {
		font-weight: 800;
		color: #000;
	}

	.unread-dot {
		width: 10px;
		height: 10px;
		background: #0ea5e9;
		border-radius: 50%;
		margin-left: 8px;
		flex-shrink: 0;
	}
</style>
