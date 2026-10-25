<script lang="ts">
	/**
	 * @component NotificationItem
	 * @domain Navigation / Notifications
	 * @description Élément individuel ou groupé d'une notification dans le menu déroulant
	 * @responsibilities
	 * - Afficher l'avatar de l'acteur (ou les avatars empilés si agrégation)
	 * - Générer le lien de redirection contextuel (profil, publication, story, chat)
	 * - Formater le message textuel selon le type et le nombre d'acteurs
	 * - Gérer les interactions de demande de suivi (Accepter / Refuser)
	 */
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import type { AppNotification, NotificationActorData } from '$lib/types';
	import Icon from '$lib/components/ui/Icon.svelte';
	import FormattedDate from '$lib/components/ui/FormattedDate.svelte';

	export interface GroupedNotification {
		id: string;
		groupKey: string;
		type: AppNotification['type'];
		isRead: boolean;
		createdAt: string;
		entityId: string | null;
		actionState: string | null;
		content: string | null;
		actors: NotificationActorData[];
		totalCount: number;
		singleNotif: AppNotification;
	}

	interface Props {
		/** Notification groupée à afficher */
		item: GroupedNotification;
		/** Callback lors du clic sur Accepter ou Refuser une demande de suivi */
		onRequest?: (e: MouseEvent, notif: AppNotification, action: 'accept' | 'refuse') => void;
		/** Callback lors du clic sur la notification */
		onItemClick?: () => void;
	}

	let { item, onRequest, onItemClick }: Props = $props();

	function getNotifLink(notifItem: GroupedNotification): string {
		if (notifItem.type === 'follow' && notifItem.actionState === 'pending') {
			const sessionUsername = page.data.sessionUser?.username || '';
			return resolve(`/profil/${sessionUsername}/invites`);
		}
		if (notifItem.content?.includes('story') && notifItem.entityId) {
			return resolve(`/story/${notifItem.entityId}`);
		}
		if ((notifItem.type === 'like' || notifItem.type === 'comment') && notifItem.entityId) {
			return resolve(`/post/${notifItem.entityId}`);
		}
		if (notifItem.type === 'system' && notifItem.entityId) {
			return resolve(`/post/${notifItem.entityId}`);
		}
		if (notifItem.type === 'mention' && notifItem.entityId) {
			if (notifItem.entityId.startsWith('chat_') || notifItem.content?.includes('message')) {
				return resolve(`/chat/${notifItem.entityId.replace(/^chat_/, '')}`);
			}
			return resolve(`/post/${notifItem.entityId}`);
		}
		if (notifItem.actors[0]?.username) return resolve(`/profil/${notifItem.actors[0].username}`);
		return resolve('/');
	}

	function getMessage(notifItem: GroupedNotification): string {
		const isStory = notifItem.content?.includes('story');
		const names = notifItem.actors.map((a) => a.name || a.username || "Quelqu'un");
		const firstName =
			names[0] || notifItem.singleNotif.actor?.name || notifItem.singleNotif.actor?.username || "Quelqu'un";

		switch (notifItem.type) {
			case 'like': {
				const target = isStory ? 'votre story' : 'votre publication';
				const count = notifItem.actors.length;
				if (count <= 1) {
					return `${firstName} a aimé ${target}.`;
				}
				if (count === 2) {
					const secondName = names[1] || 'une autre personne';
					return `${firstName} et ${secondName} ont aimé ${target}.`;
				}
				const othersCount = count - 1;
				return `${firstName} et ${othersCount} autres personnes ont aimé ${target}.`;
			}

			case 'comment': {
				const uniqueCommentersCount = notifItem.actors.length;
				if (uniqueCommentersCount <= 1) {
					if (notifItem.totalCount <= 1) {
						return `${firstName} a commenté : "${notifItem.content || ''}"`;
					}
					return `${firstName} a laissé plusieurs commentaires sur votre publication.`;
				}
				if (uniqueCommentersCount === 2) {
					const secondName = names[1] || 'une autre personne';
					return `${firstName} et ${secondName} ont commenté votre publication.`;
				}
				const othersCount = uniqueCommentersCount - 1;
				return `${firstName} et ${othersCount} autres personnes ont commenté votre publication.`;
			}

			case 'follow': {
				if (notifItem.actionState === 'pending') {
					return notifItem.content
						? `${firstName} ${notifItem.content}`
						: `${firstName} a demandé à vous suivre.`;
				}
				const count = notifItem.actors.length;
				if (count <= 1) {
					return notifItem.content
						? `${firstName} ${notifItem.content}`
						: `${firstName} a commencé à vous suivre.`;
				}
				if (count === 2) {
					const secondName = names[1] || 'une autre personne';
					return `${firstName} et ${secondName} ont commencé à vous suivre.`;
				}
				const othersCount = count - 1;
				return `${firstName} et ${othersCount} autres personnes ont commencé à vous suivre.`;
			}

			case 'mention': {
				if (notifItem.totalCount === 1) {
					return `${firstName} vous a mentionné dans ${notifItem.content || 'une publication'}.`;
				}
				return `${firstName} et d’autres personnes vous ont mentionné.`;
			}

			case 'system':
				return notifItem.content || 'Notification système.';

			default:
				return 'Nouvelle notification.';
		}
	}
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -->
<a
	href={getNotifLink(item)}
	class="notif-item {!item.isRead ? 'unread' : ''}"
	onclick={() => onItemClick?.()}
>
	<!-- Avatars simples ou empilés si plusieurs acteurs -->
	<div class="avatar-container" class:avatar-stacked={item.actors.length > 1}>
		{#if item.type === 'system'}
			<div class="avatar avatar-server">
				<Icon name="status.server" size={18} />
			</div>
		{:else if item.actors.length > 1}
			{#if item.actors[0]?.image}
				<img src={item.actors[0].image} alt="" class="avatar avatar-front" />
			{:else}
				<div class="avatar-placeholder avatar-front">
					{(item.actors[0]?.username || '?').charAt(0).toUpperCase()}
				</div>
			{/if}
			{#if item.actors[1]?.image}
				<img src={item.actors[1].image} alt="" class="avatar avatar-back" />
			{:else}
				<div class="avatar-placeholder avatar-back">
					{(item.actors[1]?.username || '?').charAt(0).toUpperCase()}
				</div>
			{/if}
		{:else}
			{#if item.actors[0]?.image}
				<img src={item.actors[0].image} alt="" class="avatar" />
			{:else}
				<div class="avatar-placeholder">
					{(item.actors[0]?.username || '?').charAt(0).toUpperCase()}
				</div>
			{/if}
		{/if}

		<!-- Petite pastille du type d'action -->
		<span class="type-icon-badge">
			{#if item.type === 'like'}
				<Icon name="action.like" size={12} color="#ef4444" />
			{:else if item.type === 'comment'}
				<Icon name="action.comment" size={12} />
			{:else if item.type === 'follow'}
				<Icon name="status.users" size={12} />
			{:else if item.type === 'mention'}
				<Icon name="action.comment" size={12} />
			{:else if item.type === 'system'}
				<Icon name="status.server" size={12} />
			{:else}
				<Icon name="nav.notifications" size={12} />
			{/if}
		</span>
	</div>

	<div class="notif-content">
		<p>{getMessage(item)}</p>

		{#if item.type === 'follow' && item.actionState === 'pending'}
			<div class="notif-actions">
				<button
					type="button"
					class="btn-accept"
					onclick={(e) => onRequest?.(e, item.singleNotif, 'accept')}
				>
					Accepter
				</button>
				<button
					type="button"
					class="btn-refuse"
					onclick={(e) => onRequest?.(e, item.singleNotif, 'refuse')}
				>
					Refuser
				</button>
			</div>
		{:else if item.actionState === 'accepted'}
			<span class="status-feedback accepted">Demande acceptée</span>
		{:else if item.actionState === 'refused'}
			<span class="status-feedback refused">Demande refusée</span>
		{/if}

		<FormattedDate date={item.createdAt} class="time" />
	</div>
</a>
<!-- eslint-enable svelte/no-navigation-without-resolve -->

<style>
	.notif-item {
		display: flex;
		gap: 12px;
		padding: 14px 16px;
		border-bottom: 1px solid #f9f9f9;
		text-decoration: none;
		color: inherit;
		transition: background 0.2s;
		position: relative;
	}
	.notif-item:hover {
		background: #f8fafc;
	}
	.notif-item.unread {
		background: #f0f9ff;
	}
	.notif-item.unread::before {
		content: '';
		width: 8px;
		height: 8px;
		background: #0ea5e9;
		border-radius: 50%;
		position: absolute;
		left: 6px;
		top: 20px;
	}

	/* Avatar container & stacking */
	.avatar-container {
		position: relative;
		width: 44px;
		height: 44px;
		flex-shrink: 0;
		margin-left: 6px;
	}

	.avatar,
	.avatar-placeholder {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		object-fit: cover;
	}

	.avatar-placeholder {
		background: #e2e8f0;
		color: #475569;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font-size: 1rem;
	}

	.avatar-server {
		background: #0f172a;
		color: #38bdf8;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.avatar-stacked .avatar-front {
		position: absolute;
		bottom: 0;
		left: 0;
		width: 30px;
		height: 30px;
		border-radius: 50%;
		border: 2px solid #fff;
		z-index: 2;
	}

	.avatar-stacked .avatar-back {
		position: absolute;
		top: 0;
		right: 0;
		width: 26px;
		height: 26px;
		border-radius: 50%;
		border: 2px solid #fff;
		opacity: 0.85;
		z-index: 1;
	}

	.type-icon-badge {
		position: absolute;
		bottom: -2px;
		right: -2px;
		font-size: 0.72rem;
		background: #fff;
		border-radius: 50%;
		width: 18px;
		height: 18px;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
		z-index: 3;
	}

	.notif-content {
		flex: 1;
		font-size: 0.9rem;
		line-height: 1.4;
		min-width: 0;
	}
	.notif-content p {
		margin: 0;
		color: #334155;
		word-break: break-word;
	}
	.notif-content :global(.time) {
		display: block;
		font-size: 0.75rem;
		color: #94a3b8;
		margin-top: 4px;
	}

	.notif-actions {
		display: flex;
		gap: 8px;
		margin-top: 8px;
	}
	.notif-actions button {
		padding: 6px 12px;
		border-radius: 6px;
		font-size: 0.8rem;
		font-weight: bold;
		cursor: pointer;
		border: none;
	}
	.btn-accept {
		background: #0ea5e9;
		color: white;
	}
	.btn-accept:hover {
		background: #0284c7;
	}
	.btn-refuse {
		background: #f1f5f9;
		color: #475569;
		border: 1px solid #cbd5e1 !important;
	}
	.btn-refuse:hover {
		background: #e2e8f0;
	}

	.status-feedback {
		font-size: 0.8rem;
		font-weight: bold;
		margin-top: 4px;
		display: inline-block;
	}
	.status-feedback.accepted {
		color: #10b981;
	}
	.status-feedback.refused {
		color: #ef4444;
	}
</style>
