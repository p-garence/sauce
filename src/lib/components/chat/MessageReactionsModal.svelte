<!--
  @component MessageReactionsModal
  @domain chat
  @description Modale affichant la liste des utilisateurs ayant réagi à un message de chat avec filtres par émoji et action de retrait.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Emoji from '$lib/components/ui/Emoji.svelte';
	import type { EmojiItem, MessageReactionGroup, MessageReactionUser } from '$lib/types';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
		reactions: MessageReactionGroup[];
		currentUserId: string;
		favoriteEmojis?: EmojiItem[];
		onToggleReaction?: (emoji: EmojiItem) => void;
	}

	let {
		isOpen = false,
		onClose,
		reactions = [],
		currentUserId,
		favoriteEmojis = [],
		onToggleReaction
	}: Props = $props();

	let selectedEmojiId = $state<string>('all');

	// Total cumulé de toutes les réactions
	let totalCount = $derived(reactions.reduce((sum, g) => sum + g.count, 0));

	// Liste aplatie de tous les utilisateurs ayant réagi avec l'émoji correspondant
	interface FlatReactionUser extends MessageReactionUser {
		emojiId: string;
		emojiName: string;
		emojiUrl: string;
	}

	let allUsers = $derived.by<FlatReactionUser[]>(() => {
		const list: FlatReactionUser[] = [];
		for (const g of reactions) {
			for (const u of g.users) {
				list.push({
					...u,
					emojiId: g.emojiId,
					emojiName: g.emojiName,
					emojiUrl: g.emojiUrl
				});
			}
		}
		return list;
	});

	let displayedUsers = $derived.by<FlatReactionUser[]>(() => {
		if (selectedEmojiId === 'all') {
			return allUsers;
		}
		const group = reactions.find((g) => g.emojiId === selectedEmojiId);
		if (!group) return [];
		return group.users.map((u) => ({
			...u,
			emojiId: group.emojiId,
			emojiName: group.emojiName,
			emojiUrl: group.emojiUrl
		}));
	});

	function handleBackdrop(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}
</script>

{#if isOpen}
	<div
		class="modal-backdrop"
		role="dialog"
		aria-modal="true"
		onclick={handleBackdrop}
		onkeydown={(e) => e.key === 'Escape' && onClose()}
		tabindex="-1"
	>
		<div class="modal-card">
			<header class="modal-header">
				<div class="header-title-box">
					<h3>Réactions</h3>
					{#if totalCount > 0}
						<span class="total-badge">{totalCount}</span>
					{/if}
				</div>
				<button type="button" class="close-btn" onclick={onClose} aria-label="Fermer">
					<Icon name="action.close" size={18} />
				</button>
			</header>

			{#if reactions.length > 1}
				<div class="tabs-bar">
					<button
						type="button"
						class="tab-btn"
						class:active={selectedEmojiId === 'all'}
						onclick={() => (selectedEmojiId = 'all')}
					>
						Tous <span class="tab-count">{totalCount}</span>
					</button>
					{#each reactions as g (g.emojiId)}
						<button
							type="button"
							class="tab-btn"
							class:active={selectedEmojiId === g.emojiId}
							onclick={() => (selectedEmojiId = g.emojiId)}
						>
							<Emoji src={g.emojiUrl} name={g.emojiName} size={16} class="tab-emoji-img" />
							<span class="tab-count">{g.count}</span>
						</button>
					{/each}
				</div>
			{/if}

			<div class="modal-body">
				{#if displayedUsers.length === 0}
					<div class="empty-state">
						<p>Aucune réaction trouvée.</p>
					</div>
				{:else}
					<ul class="users-list">
						{#each displayedUsers as u (u.id + '_' + u.emojiId)}
							<li class="user-row">
								<a
									href={resolve(`/profil/${u.username || ''}`)}
									class="user-info"
									onclick={onClose}
								>
									{#if u.image}
										<img src={u.image} alt={u.username || ''} class="avatar" />
									{:else}
										<div class="avatar-placeholder">
											{(u.name || u.username || '?').charAt(0).toUpperCase()}
										</div>
									{/if}
									<div class="names">
										<strong class="display-name">{u.name || u.username}</strong>
										{#if u.username}
											<span class="username">@{u.username}</span>
										{/if}
									</div>
								</a>

								<div class="reaction-tag-box">
									<Emoji
										src={u.emojiUrl}
										name={u.emojiName}
										size={24}
										class="user-reaction-emoji"
									/>
									{#if u.id === currentUserId}
										<button
											type="button"
											class="btn-remove-reaction"
											title="Cliquer pour retirer votre réaction"
											onclick={() => {
												onToggleReaction?.({
													id: u.emojiId,
													name: u.emojiName,
													url: u.emojiUrl
												});
											}}
										>
											Retirer
										</button>
									{/if}
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<footer class="modal-footer">
				<div class="quick-react-section">
					<span class="quick-react-label">Réagir :</span>
					{#if favoriteEmojis && favoriteEmojis.length > 0}
						<div class="quick-emojis-row">
							{#each favoriteEmojis as emoji (emoji.id)}
								{@const hasThisReaction = reactions.some(
									(r) => r.emojiId === emoji.id && r.hasReacted
								)}
								<button
									type="button"
									class="quick-emoji-btn"
									class:active={hasThisReaction}
									title={emoji.name}
									onclick={() => onToggleReaction?.(emoji)}
								>
									<Emoji src={emoji.url} name={emoji.name} size={24} class="quick-emoji-img" />
								</button>
							{/each}
						</div>
					{:else}
						<a
							href={resolve('/parametres?tab=emojis')}
							class="settings-emoji-link"
							onclick={onClose}
						>
							Configurer mes favoris
						</a>
					{/if}
				</div>
			</footer>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 16px;
		backdrop-filter: blur(2px);
	}

	.modal-card {
		background: #ffffff;
		border-radius: 16px;
		width: 100%;
		max-width: 420px;
		max-height: 80vh;
		display: flex;
		flex-direction: column;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
		overflow: hidden;
		animation: modalFadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1);
	}

	@keyframes modalFadeIn {
		from {
			opacity: 0;
			transform: scale(0.96) translateY(6px);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 18px;
		border-bottom: 1px solid #f1f5f9;
	}

	.header-title-box {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.header-title-box h3 {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 700;
		color: #0f172a;
	}

	.total-badge {
		font-size: 0.75rem;
		font-weight: 700;
		background: #e2e8f0;
		color: #334155;
		padding: 2px 7px;
		border-radius: 10px;
	}

	.close-btn {
		background: none;
		border: none;
		font-size: 1.1rem;
		cursor: pointer;
		color: #64748b;
		padding: 4px;
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.close-btn:hover {
		color: #0f172a;
		background: #f1f5f9;
	}

	.tabs-bar {
		display: flex;
		gap: 6px;
		padding: 8px 16px;
		border-bottom: 1px solid #f1f5f9;
		overflow-x: auto;
		scrollbar-width: thin;
	}

	.tab-btn {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 20px;
		padding: 4px 10px;
		font-size: 0.8rem;
		font-weight: 600;
		color: #475569;
		cursor: pointer;
		transition: all 0.15s ease;
		white-space: nowrap;
	}

	.tab-btn:hover {
		background: #f1f5f9;
		color: #0f172a;
	}

	.tab-btn.active {
		background: #0ea5e9;
		border-color: #0ea5e9;
		color: #ffffff;
	}

	.tab-count {
		font-size: 0.75rem;
		opacity: 0.85;
	}

	.modal-body {
		padding: 12px 16px;
		overflow-y: auto;
		flex: 1;
		min-height: 140px;
	}

	.empty-state {
		text-align: center;
		padding: 30px 10px;
		color: #64748b;
		font-size: 0.9rem;
	}

	.users-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.user-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 6px 8px;
		border-radius: 10px;
		transition: background 0.15s ease;
	}

	.user-row:hover {
		background: #f8fafc;
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: 10px;
		text-decoration: none;
		color: inherit;
		flex: 1;
		min-width: 0;
	}

	.avatar,
	.avatar-placeholder {
		width: 38px;
		height: 38px;
		border-radius: 50%;
		object-fit: cover;
		flex-shrink: 0;
	}

	.avatar-placeholder {
		background: #e2e8f0;
		color: #64748b;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font-size: 0.95rem;
	}

	.names {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.display-name {
		font-size: 0.88rem;
		color: #0f172a;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.username {
		font-size: 0.78rem;
		color: #64748b;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.reaction-tag-box {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-shrink: 0;
	}

	.btn-remove-reaction {
		background: #fee2e2;
		color: #dc2626;
		border: 1px solid #fecaca;
		border-radius: 12px;
		padding: 2px 8px;
		font-size: 0.72rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-remove-reaction:hover {
		background: #fca5a5;
		color: #991b1b;
	}

	.modal-footer {
		padding: 10px 16px;
		border-top: 1px solid #f1f5f9;
		background: #fafafa;
	}

	.quick-react-section {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.82rem;
	}

	.quick-react-label {
		color: #64748b;
		font-weight: 600;
		flex-shrink: 0;
	}

	.quick-emojis-row {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
	}

	.quick-emoji-btn {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		border: none;
		background: transparent;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.15s ease;
		padding: 0;
	}

	.quick-emoji-btn:hover {
		transform: scale(1.25);
		background: rgba(14, 165, 233, 0.12);
	}

	.quick-emoji-btn.active {
		background: rgba(14, 165, 233, 0.2);
		transform: scale(1.15);
	}

	.settings-emoji-link {
		color: #0ea5e9;
		text-decoration: underline;
		font-weight: 600;
		font-size: 0.82rem;
	}
</style>
