<script lang="ts">
	/**
	 * @component ChatRequestRow
	 * @domain chat
	 * @description Ligne représentant une demande de message ou conversation en attente avec boutons de validation.
	 *
	 * @responsibilities
	 * - Afficher l'identité de l'expéditeur de la requête.
	 * - Proposer les actions directes d'acceptation (`?/acceptChat`) et de refus (`?/rejectChat`).
	 */

	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import type { ChatContact } from '$lib/types';
	import Icon from '$lib/components/ui/Icon.svelte';

	interface Props {
		/** Demande de message à afficher */
		contact: ChatContact;
	}

	let { contact }: Props = $props();
</script>

<div class="contact-row pending-row">
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
			<span class="username unread-text">{contact.title}</span>
			<span class="last-message">Souhaite vous envoyer un message</span>
		</div>
	</a>
	{#if contact.status === 'pending'}
		<div class="invitation-actions">
			<form action="?/acceptChat" method="POST" use:enhance>
				<input type="hidden" name="chatId" value={contact.id} />
				<button type="submit" class="btn-accept">Accepter</button>
			</form>
			<form action="?/rejectChat" method="POST" use:enhance>
				<input type="hidden" name="chatId" value={contact.id} />
				<button type="submit" class="btn-reject" aria-label="Refuser">
					<Icon name="action.close" size={14} />
				</button>
			</form>
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

	.pending-row {
		background: #f8fafc;
		border: 1px dashed #cbd5e1;
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

	.username {
		font-weight: 600;
		font-size: 1.1rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		color: #333;
	}

	.unread-text {
		font-weight: 800;
		color: #000;
	}

	.last-message {
		font-size: 0.85rem;
		color: #64748b;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.invitation-actions {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-left: 8px;
	}

	.btn-accept {
		background: #0ea5e9;
		color: white;
		border: none;
		padding: 6px 12px;
		border-radius: 16px;
		font-weight: bold;
		cursor: pointer;
		font-size: 0.8rem;
		transition: background 0.15s;
	}

	.btn-accept:hover {
		background: #0284c7;
	}

	.btn-reject {
		background: #f1f5f9;
		color: #64748b;
		border: none;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		font-weight: bold;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.15s;
	}

	.btn-reject:hover {
		background: #fee2e2;
		color: #dc2626;
	}
</style>
