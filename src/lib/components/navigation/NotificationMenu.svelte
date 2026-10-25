<script lang="ts">
	/**
	 * @component NotificationMenu
	 * @domain Navigation
	 * @description Bouton cloche et menu déroulant des notifications en temps réel
	 * @responsibilities
	 * - Afficher le compteur de notifications non lues
	 * - Agréger et trier les notifications par sujet / entité
	 * - Orchestrer l'affichage des éléments via NotificationItem
	 * - Gérer la pagination et le nettoyage global des notifications
	 */
	import { fade, slide } from 'svelte/transition';
	import { page } from '$app/state';
	import { SvelteMap } from 'svelte/reactivity';
	import { globalStream } from '$lib/client/globalStreamState.svelte';
	import type { AppNotification } from '$lib/types';
	import Icon from '$lib/components/ui/Icon.svelte';
	import NotificationItem, {
		type GroupedNotification
	} from '$lib/components/navigation/NotificationItem.svelte';

	let isOpen = $state(false);
	let isLoadingMore = $state(false);

	let settings = $derived(page.data.sessionUser?.notificationSettings || {});
	function isEnabled(type: string) {
		if (settings.all === false) return false;
		if (type === 'system') return true;
		return (settings as Record<string, boolean>)[type] !== false;
	}

	let unreadCount = $derived(globalStream.unreadNotifsCount);
	let showBadge = $derived(unreadCount > 0 && !isOpen);

	// 1. Tri prioritaire (Non-lues actives > Non-lues inactives > Déjà lues)
	let sortedNotifs = $derived(
		[...globalStream.notifs].sort((a, b) => {
			const getGroup = (n: AppNotification) => {
				if (n.isRead) return 3;
				if (isEnabled(n.type)) return 1;
				return 2;
			};
			const groupA = getGroup(a);
			const groupB = getGroup(b);
			if (groupA !== groupB) return groupA - groupB;
			return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
		})
	);

	// 2. Agrégation intelligente par post / story / type
	let groupedNotifs = $derived.by<GroupedNotification[]>(() => {
		const groupsMap = new SvelteMap<string, GroupedNotification>();
		const orderedGroups: GroupedNotification[] = [];

		for (const notif of sortedNotifs) {
			let key = `${notif.type}_${notif.id}`;
			const isStory = notif.content?.includes('story');

			if (notif.type === 'like' && notif.entityId) {
				key = isStory ? `story_like_${notif.entityId}` : `post_like_${notif.entityId}`;
			} else if (notif.type === 'comment' && notif.entityId) {
				key = `post_comment_${notif.entityId}`;
			} else if (notif.type === 'follow' && notif.actionState !== 'pending') {
				key = `follow_accepted`;
			} else if (notif.type === 'mention' && notif.entityId) {
				key = `mention_${notif.entityId}`;
			}

			const existing = groupsMap.get(key);
			if (existing) {
				const isNewActor = notif.actor && !existing.actors.some((a) => a.id === notif.actor?.id);
				if (isNewActor) {
					existing.actors.push(notif.actor!);
					existing.totalCount += 1;
				} else if (notif.type === 'comment') {
					existing.totalCount += 1;
				}
				if (!notif.isRead) {
					existing.isRead = false;
				}
			} else {
				const groupItem: GroupedNotification = {
					id: notif.id,
					groupKey: key,
					type: notif.type,
					isRead: notif.isRead,
					createdAt: notif.createdAt,
					entityId: notif.entityId ?? null,
					actionState: notif.actionState ?? null,
					content: notif.content ?? null,
					actors: notif.actor ? [notif.actor] : [],
					totalCount: 1,
					singleNotif: notif
				};
				groupsMap.set(key, groupItem);
				orderedGroups.push(groupItem);
			}
		}

		return orderedGroups;
	});

	async function toggleMenu() {
		if (!isOpen) {
			isOpen = true;
			if (unreadCount > 0) {
				globalStream.markNotifsAsReadLocally();
				fetch('/api/notifications/read', { method: 'POST' }).catch(console.error);
			}
		} else {
			isOpen = false;
		}
	}

	async function loadMore(e: MouseEvent) {
		e.stopPropagation();
		if (isLoadingMore || !globalStream.hasMoreNotifs) return;

		isLoadingMore = true;
		await globalStream.loadMoreNotifs();
		isLoadingMore = false;
	}

	async function handleRequest(e: MouseEvent, notif: AppNotification, action: 'accept' | 'refuse') {
		e.preventDefault();
		e.stopPropagation();
		if (!notif.actor) return;

		try {
			const res = await fetch('/api/follow/manage', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ followerId: notif.actor.id, action })
			});
			if (res.ok) {
				const state = action === 'accept' ? 'accepted' : 'refused';
				globalStream.updateNotifActionState(notif.id, state);
			}
		} catch (error) {
			console.error('Erreur:', error);
		}
	}

	async function clearNotifications(e: MouseEvent) {
		e.stopPropagation();
		const res = await fetch('/api/notifications/clear', { method: 'POST' });
		if (res.ok) {
			globalStream.clearNotifsLocally();
		}
	}
</script>

<div class="notif-container">
	<button type="button" class="notif-button" aria-label="Notifications" onclick={toggleMenu}>
		<span class="icon"><Icon name="nav.notifications" size={22} /></span>
		{#if showBadge}
			<span class="badge" transition:fade={{ duration: 150 }}>{unreadCount}</span>
		{/if}
	</button>

	{#if isOpen}
		<div class="overlay" onclick={toggleMenu} aria-hidden="true"></div>
		<div class="dropdown" transition:slide={{ duration: 200, axis: 'y' }}>
			<div class="dropdown-header">
				<h3>Notifications</h3>
				{#if groupedNotifs.length > 0}
					<button type="button" class="clear-btn" onclick={clearNotifications}>Nettoyer</button>
				{/if}
			</div>

			<div class="notif-list">
				{#if groupedNotifs.length === 0}
					<div class="empty">Aucune notification pour le moment.</div>
				{/if}

				{#each groupedNotifs as item (item.groupKey)}
					<NotificationItem
						{item}
						onRequest={handleRequest}
						onItemClick={() => {
							isOpen = false;
							globalStream.markNotifsAsReadLocally();
						}}
					/>
				{/each}

				{#if groupedNotifs.length > 0}
					<button
						type="button"
						class="load-more-btn"
						onclick={loadMore}
						disabled={isLoadingMore}
					>
						{isLoadingMore ? 'Chargement...' : 'Charger les notifications précédentes'}
					</button>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.notif-container {
		position: relative;
		display: flex;
		align-items: center;
	}
	.notif-button {
		width: 40px;
		height: 40px;
		background: none;
		border: none;
		cursor: pointer;
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		color: var(--text-default, #1e293b);
		transition:
			background-color 0.2s ease,
			transform 0.1s ease;
	}
	.notif-button:hover {
		background: rgba(0, 0, 0, 0.06);
	}
	.notif-button:active {
		transform: scale(0.95);
	}
	.badge {
		position: absolute;
		top: 3px;
		right: 3px;
		background: #ef4444;
		color: white;
		border-radius: 50px;
		padding: 2px 5px;
		font-size: 0.68rem;
		font-weight: bold;
		line-height: 1;
		border: 2px solid white;
		pointer-events: none;
	}
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 90;
	}
	.dropdown {
		position: absolute;
		right: -10px;
		top: calc(100% + 10px);
		width: 360px;
		max-width: 90vw;
		background: white;
		border: 1px solid #eaeaea;
		border-radius: 12px;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
		z-index: 100;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		max-height: 80vh;
	}
	.dropdown::before {
		content: '';
		position: absolute;
		top: -6px;
		right: 18px;
		width: 12px;
		height: 12px;
		background: white;
		border-top: 1px solid #eaeaea;
		border-left: 1px solid #eaeaea;
		transform: rotate(45deg);
	}
	.dropdown-header {
		padding: 16px;
		border-bottom: 1px solid #eaeaea;
		background: white;
		position: relative;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.dropdown-header h3 {
		margin: 0;
		font-size: 1rem;
	}
	.clear-btn {
		background: none;
		border: none;
		color: #94a3b8;
		font-size: 0.8rem;
		cursor: pointer;
		padding: 4px 8px;
		border-radius: 4px;
		transition: all 0.2s;
	}
	.clear-btn:hover {
		color: #ef4444;
		background: #fee2e2;
	}
	.notif-list {
		overflow-y: auto;
	}
	.empty {
		padding: 32px 16px;
		text-align: center;
		color: #94a3b8;
		font-size: 0.9rem;
	}
	.load-more-btn {
		width: 100%;
		padding: 12px;
		background: #f8fafc;
		border: none;
		border-top: 1px solid #eaeaea;
		color: #64748b;
		font-size: 0.85rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}
	.load-more-btn:hover {
		background: #f1f5f9;
		color: #0f172a;
	}
	.load-more-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
