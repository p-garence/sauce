<script lang="ts">
	/**
	 * @component ChatInboxPage
	 * @domain chat
	 * @description Boîte de réception des messages privés et groupes (flux en direct SSE, onglet messages, invitations et demandes bloquées).
	 *
	 * @responsibilities
	 * - Synchroniser la liste des conversations et leur dernier message avec le flux SSE global.
	 * - Proposer la navigation par onglets entre discussions actives et demandes en attente.
	 * - Gérer les actions de sourdine et de suppression de conversations.
	 */

	import { untrack } from 'svelte';
	import { resolve } from '$app/paths';
	import { invalidateAll } from '$app/navigation';
	import { globalStream } from '$lib/client/globalStreamState.svelte';
	import type { PageData } from './$types';
	import type { ChatContact, ChatMessage, MenuAction } from '$lib/types';
	import TopNav from '$lib/components/navigation/TopNav.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import ChatConversationRow from '$lib/components/chat/inbox/ChatConversationRow.svelte';
	import ChatRequestRow from '$lib/components/chat/inbox/ChatRequestRow.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let liveUpdates = $state<ChatMessage[]>([]);
	let lastProcessedMsgId = '';
	let currentTab = $state<'active' | 'pending'>('active');
	let showRefused = $state(false);

	let displayContacts = $derived.by((): ChatContact[] => {
		let list = [...data.contacts] as ChatContact[];

		for (const msg of liveUpdates) {
			const contactIndex = list.findIndex((c) => c.id === msg.chatId);
			if (contactIndex !== -1) {
				const updatedContact = { ...list[contactIndex] };
				updatedContact.lastMessageTime = new Date(msg.createdAt).getTime();
				let contentText = msg.content;
				if (msg.mediaUrl && !contentText) {
					if (msg.mediaType === 'audio') contentText = '🎤 Message vocal';
					else if (msg.mediaType === 'image') contentText = '📷 Photo';
					else if (msg.mediaType === 'video') contentText = '🎥 Vidéo';
					else contentText = '📎 Fichier';
				}
				updatedContact.lastMessageContent = contentText;
				updatedContact.isLastMessageFromMe = msg.senderId === data.currentUserId;
				list.splice(contactIndex, 1);
				list.unshift(updatedContact);
			}
		}

		return list.map((contact) => ({
			...contact,
			isUnread: globalStream.unreadChatIds.includes(contact.id)
		}));
	});

	let refusedContacts = $derived(
		displayContacts.filter((c) => c.status === 'refused' || c.status === 'blocked')
	);
	let activeContacts = $derived(displayContacts.filter((c) => c.status === 'accepted'));
	let pendingContacts = $derived(displayContacts.filter((c) => c.status === 'pending'));

	$effect(() => {
		const msg = globalStream.latestMessage;
		if (msg && msg.id !== lastProcessedMsgId) {
			lastProcessedMsgId = msg.id;
			untrack(() => {
				const exists = data.contacts.some((c) => c.id === msg.chatId);
				if (!exists) {
					invalidateAll();
				} else {
					liveUpdates.push(msg);
				}
			});
		}
	});

	$effect(() => {
		if (data.contacts) {
			untrack(() => {
				liveUpdates = [];
			});
		}
	});

	$effect(() => {
		const del = globalStream.deletedMessage;
		if (del) {
			untrack(() => {
				invalidateAll();
			});
		}
	});

	$effect(() => {
		const updated = globalStream.updatedMessage;
		if (updated) {
			untrack(() => {
				invalidateAll();
			});
		}
	});

	function getChatActions(contact: ChatContact): MenuAction[] {
		const isMuted = contact.isMuted ?? false;
		return [
			{
				label: isMuted ? 'Rétablir le son' : 'Mettre en sourdine',
				onClick: async () => {
					globalStream.setChatMuted(contact.id, !isMuted);
					const formData = new FormData();
					formData.set('chatId', contact.id);
					formData.set('mute', isMuted ? 'false' : 'true');
					await fetch(resolve('/chat?/toggleMuteChat'), {
						method: 'POST',
						body: formData
					});
					await invalidateAll();
				}
			},
			{
				label: 'Supprimer',
				variant: 'danger',
				onClick: async () => {
					if (!confirm('Voulez-vous vraiment effacer cette conversation ?')) return;
					const formData = new FormData();
					await fetch(resolve(`/chat?/clearChat&chatId=${contact.id}`), {
						method: 'POST',
						body: formData
					});
					invalidateAll();
				}
			}
		];
	}
</script>

<div class="chat-index-page">
	<TopNav title="Discussions">
		{#snippet rightAction()}
			<a
				href={resolve('/creer_discussion')}
				class="new-chat-btn-header"
				aria-label="Nouveau message"
			>
				<span class="icon"><Icon name="action.add" size={16} /></span>
				<span class="btn-text">Nouveau</span>
			</a>
		{/snippet}
	</TopNav>

	<div class="tabs">
		<button
			type="button"
			class="tab"
			class:active={currentTab === 'active'}
			onclick={() => (currentTab = 'active')}
		>
			Messages
		</button>
		<button
			type="button"
			class="tab"
			class:active={currentTab === 'pending'}
			onclick={() => (currentTab = 'pending')}
		>
			Invitations
			{#if pendingContacts.length > 0}
				<span class="pending-badge">{pendingContacts.length}</span>
			{/if}
		</button>
	</div>

	<div class="contacts-list">
		{#if currentTab === 'active'}
			{#if activeContacts.length === 0}
				<div class="empty-state"><p>Aucune discussion pour l'instant.</p></div>
			{/if}
			{#each activeContacts as contact (contact.id)}
				<ChatConversationRow {contact} actions={getChatActions(contact)} />
			{/each}
		{:else}
			<div class="pending-header">
				<a href={resolve('/parametres?tab=privacy')} class="blocked-settings-link">
					<Icon name="status.lock" size={14} />
					<span>Gérer les comptes bloqués</span>
				</a>
				<button
					type="button"
					class="toggle-refused-btn"
					onclick={() => (showRefused = !showRefused)}
				>
					{showRefused
						? '← Voir les demandes en attente'
						: `Voir les demandes refusées et chats bloqués (${refusedContacts.length})`}
				</button>
			</div>

			{@const displayedList = showRefused ? refusedContacts : pendingContacts}

			{#if displayedList.length === 0}
				<div class="empty-state">
					<p>
						{showRefused ? 'Aucune demande refusée.' : "Vous n'avez aucune demande de message."}
					</p>
				</div>
			{/if}
			{#each displayedList as contact (contact.id)}
				<ChatRequestRow {contact} />
			{/each}
		{/if}
	</div>
</div>

<style>
	.chat-index-page {
		width: 100%;
		background: var(--bg-surface, #ffffff);
		flex: 1;
	}

	.tabs {
		display: flex;
		border-bottom: 1px solid #eaeaea;
		margin-bottom: 16px;
	}

	.tab {
		flex: 1;
		padding: 12px;
		border: none;
		background: none;
		font-weight: bold;
		font-size: 0.95rem;
		color: #94a3b8;
		cursor: pointer;
		border-bottom: 2px solid transparent;
		transition: all 0.2s;
		position: relative;
	}

	.tab.active {
		color: #0ea5e9;
		border-bottom-color: #0ea5e9;
	}

	.pending-badge {
		background: #ef4444;
		color: white;
		font-size: 0.7rem;
		padding: 2px 6px;
		border-radius: 12px;
		margin-left: 6px;
	}

	.contacts-list {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.empty-state {
		text-align: center;
		padding: 40px 16px;
		color: #64748b;
	}

	.pending-header {
		padding: 12px 16px;
		border-bottom: 1px solid #eaeaea;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.blocked-settings-link {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		color: #64748b;
		text-decoration: none;
		font-size: 0.85rem;
		font-weight: 500;
		transition: color 0.15s;
	}

	.blocked-settings-link:hover {
		color: #0ea5e9;
	}

	.toggle-refused-btn {
		background: none;
		border: none;
		color: #64748b;
		font-weight: bold;
		cursor: pointer;
		font-size: 0.85rem;
	}

	.toggle-refused-btn:hover {
		color: #1e293b;
		text-decoration: underline;
	}

	.new-chat-btn-header {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		background: var(--primary, #0ea5e9);
		color: white;
		padding: 6px 14px;
		border-radius: 20px;
		text-decoration: none;
		font-weight: 600;
		font-size: 0.9rem;
		transition: opacity 0.2s;
	}

	.new-chat-btn-header:hover {
		opacity: 0.9;
	}

	@media (max-width: 380px) {
		.new-chat-btn-header {
			padding: 0;
			width: 36px;
			height: 36px;
			border-radius: 50%;
		}

		.new-chat-btn-header .btn-text {
			display: none;
		}

		.new-chat-btn-header .icon {
			font-size: 1.1rem;
		}
	}
</style>
