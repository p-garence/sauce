import { browser } from '$app/environment';
import type { ChatMessage, AppNotification, StreamEvent, MessageReactionGroup } from '$lib/types';

class GlobalStreamState {
	// ÉTATS
	unreadChatIds = $state<string[]>([]);
	mutedChatIds = $state<string[]>([]);
	activeChatId = $state<string | null>(null);
	latestMessage = $state<ChatMessage | null>(null);
	deletedMessage = $state<{ messageId: string; chatId: string; message?: ChatMessage } | null>(
		null
	);
	updatedMessage = $state<ChatMessage | null>(null);
	reactionUpdate = $state<{
		chatId: string;
		messageId: string;
		reactions: MessageReactionGroup[];
	} | null>(null);

	notifs = $state<AppNotification[]>([]);
	hasMoreNotifs = $state(false);
	unreadNotifsCount = $state(0);

	currentUserId: string | null = null;
	private eventSource: EventSource | null = null;
	private visibilityHandler: (() => void) | null = null;

	init(userId: string) {
		if (!browser) return;
		this.currentUserId = userId;
		this.syncInitialState();
		this.connectSSE();

		if (!this.visibilityHandler) {
			this.visibilityHandler = () => {
				if (document.visibilityState === 'visible') {
					if (!this.eventSource || this.eventSource.readyState === EventSource.CLOSED) {
						this.connectSSE();
					} else {
						this.syncInitialState();
					}
				}
			};
			document.addEventListener('visibilitychange', this.visibilityHandler);
		}
	}

	/**
	 * Met à jour la pastille rouge sur l'icône de l'app sur l'écran d'accueil (PWA)
	 */
	updateAppBadge() {
		if (!browser || !('setAppBadge' in navigator)) return;
		const total = this.unreadChatIds.length + this.unreadNotifsCount;
		if (total > 0) {
			navigator.setAppBadge(total).catch(() => {});
		} else {
			navigator.clearAppBadge().catch(() => {});
		}
	}

	// Séparé pour plus de clarté
	private async syncInitialState() {
		fetch('/api/chat/unread')
			.then((res) => res.json())
			.then((data) => {
				this.unreadChatIds = data.unreadChatIds || [];
				this.mutedChatIds = data.mutedChatIds || [];
				this.updateAppBadge();
			});

		fetch('/api/notifications')
			.then((res) => res.json())
			.then((data) => {
				this.notifs = data.notifications || [];
				this.hasMoreNotifs = data.hasMore ?? false;
				if (data.unreadCount !== undefined) {
					this.unreadNotifsCount = data.unreadCount;
				}
				this.updateAppBadge();
			});
	}

	private connectSSE() {
		if (this.eventSource) this.eventSource.close();
		this.eventSource = new EventSource('/api/stream');

		this.eventSource.onopen = () => this.syncInitialState();

		this.eventSource.onmessage = (event) => {
			const parsed = JSON.parse(event.data) as StreamEvent;
			switch (parsed.type) {
				case 'message':
					this.latestMessage = parsed.data;
					this.handleNewMessage(parsed.data);
					break;
				case 'message_updated':
					this.updatedMessage = parsed.data;
					break;
				case 'message_deleted':
					this.deletedMessage = parsed.data;
					break;
				case 'message_reaction':
					this.reactionUpdate = parsed.data;
					break;
				case 'chat_seen':
					this.markChatAsRead(parsed.data.chatId);
					break;
				case 'notification':
					this.notifs = [parsed.data, ...this.notifs];
					this.unreadNotifsCount += 1;
					// Si on a été mentionné dans une conversation, on allume le badge même si en sourdine
					if (parsed.data.type === 'mention' && parsed.data.entityId) {
						const chatId = parsed.data.entityId.replace(/^chat_/, '');
						if (!this.unreadChatIds.includes(chatId) && chatId !== this.activeChatId) {
							this.unreadChatIds = [...this.unreadChatIds, chatId];
						}
					}
					this.updateAppBadge();
					break;
				case 'notification_deleted': {
					const notifId = parsed.data.id;
					const found = this.notifs.find((n) => n.id === notifId);
					if (found && !found.isRead) {
						this.unreadNotifsCount = Math.max(0, this.unreadNotifsCount - 1);
					}
					this.notifs = this.notifs.filter((n) => n.id !== notifId);
					this.updateAppBadge();
					break;
				}
			}
		};
	}

	private handleNewMessage(msg: ChatMessage) {
		if (msg.senderId === this.currentUserId || msg.chatId === this.activeChatId) return;
		// Si la discussion est en sourdine, pas de notification en bas (sauf si @mentionné géré via la notif de mention)
		if (this.mutedChatIds.includes(msg.chatId)) return;
		if (!this.unreadChatIds.includes(msg.chatId)) {
			this.unreadChatIds = [...this.unreadChatIds, msg.chatId];
			this.updateAppBadge();
		}
	}

	setChatMuted(chatId: string, isMuted: boolean) {
		if (isMuted) {
			if (!this.mutedChatIds.includes(chatId)) {
				this.mutedChatIds = [...this.mutedChatIds, chatId];
			}
			this.unreadChatIds = this.unreadChatIds.filter((id) => id !== chatId);
		} else {
			this.mutedChatIds = this.mutedChatIds.filter((id) => id !== chatId);
		}
		this.updateAppBadge();
	}

	markChatAsRead(chatId: string) {
		this.unreadChatIds = this.unreadChatIds.filter((id) => id !== chatId);
		this.updateAppBadge();
	}

	// ==========================================
	// MÉTHODES POUR LES NOTIFICATIONS (Encapsulation)
	// ==========================================

	markNotifsAsReadLocally() {
		this.notifs = this.notifs.map((n) => ({ ...n, isRead: true }));
		this.unreadNotifsCount = 0;
		this.updateAppBadge();
	}

	markNotifAsReadById(notifId: string) {
		const found = this.notifs.find((n) => n.id === notifId);
		if (found && !found.isRead) {
			found.isRead = true;
			this.unreadNotifsCount = Math.max(0, this.unreadNotifsCount - 1);
			this.updateAppBadge();
		}
	}

	markNotifsForEntityAsRead(entityId: string) {
		let decreased = 0;
		for (const n of this.notifs) {
			if (n.entityId === entityId && !n.isRead) {
				n.isRead = true;
				decreased++;
			}
		}
		if (decreased > 0) {
			this.unreadNotifsCount = Math.max(0, this.unreadNotifsCount - decreased);
			this.updateAppBadge();
		}
	}

	updateNotifActionState(notifId: string, state: 'accepted' | 'refused') {
		const idx = this.notifs.findIndex((n) => n.id === notifId);
		if (idx !== -1) {
			const updated = [...this.notifs];
			updated[idx].actionState = state;
			this.notifs = updated;
		}
	}

	clearNotifsLocally() {
		this.notifs = [];
		this.unreadNotifsCount = 0;
		this.updateAppBadge();
	}

	async loadMoreNotifs() {
		if (!this.hasMoreNotifs || this.notifs.length === 0) return;

		const oldestDate = this.notifs.reduce((oldest, n) =>
			new Date(n.createdAt) < new Date(oldest.createdAt) ? n : oldest
		).createdAt;

		const res = await fetch(`/api/notifications?cursor=${oldestDate}`);
		if (res.ok) {
			const result = await res.json();
			this.hasMoreNotifs = result.hasMore;

			const existingIds = new Set(this.notifs.map((n) => n.id));
			const newNotifs = result.notifications.filter((n: AppNotification) => !existingIds.has(n.id));

			this.notifs = [...this.notifs, ...newNotifs];
		}
	}

	destroy() {
		if (this.visibilityHandler && browser) {
			document.removeEventListener('visibilitychange', this.visibilityHandler);
			this.visibilityHandler = null;
		}
		if (this.eventSource) {
			this.eventSource.close();
			this.eventSource = null;
		}
		if (browser && 'clearAppBadge' in navigator) {
			navigator.clearAppBadge().catch(() => {});
		}
	}
}

export const globalStream = new GlobalStreamState();
