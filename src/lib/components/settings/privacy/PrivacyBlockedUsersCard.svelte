<!--
  @component PrivacyBlockedUsersCard
  @domain settings/privacy
  @description Carte de gestion des utilisateurs bloqués avec liste, avatars et déblocage direct.
  @responsibilities
    - Afficher la liste des personnes actuellement bloquées par l'utilisateur
    - Déclencher le déblocage via le formulaire sécurisé SvelteKit
-->
<script lang="ts">
	import SettingsCard from '$lib/components/settings/ui/SettingsCard.svelte';
	import { enhance } from '$app/forms';

	type BlockedUserItem = {
		id: string;
		username: string | null;
		name: string | null;
		image: string | null;
		blockedAt: Date;
	};

	/**
	 * Propriétés du composant PrivacyBlockedUsersCard
	 */
	interface Props {
		/** Liste des utilisateurs bloqués */
		blockedUsers?: BlockedUserItem[];
	}

	let { blockedUsers = [] }: Props = $props();

	let unblockingId = $state<string | null>(null);
</script>

<div class="blocked-section-wrapper">
	<SettingsCard
		title="Utilisateurs bloqués"
		description="Les personnes bloquées ne peuvent plus voir votre profil, vos publications, vos stories, ni interagir ou discuter avec vous."
	>
		{#if blockedUsers.length === 0}
			<p class="empty-blocked-text">Vous n'avez bloqué aucun utilisateur.</p>
		{:else}
			<div class="blocked-users-list">
				{#each blockedUsers as blocked (blocked.id)}
					<div class="blocked-user-row">
						<div class="blocked-user-info">
							<div class="blocked-avatar">
								{#if blocked.image}
									<img src={blocked.image} alt={blocked.username || 'Avatar'} />
								{:else}
									<span>{(blocked.username || blocked.name || '?').charAt(0).toUpperCase()}</span>
								{/if}
							</div>
							<div class="blocked-user-names">
								<strong class="blocked-name">{blocked.name || blocked.username}</strong>
								{#if blocked.username}
									<span class="blocked-handle">@{blocked.username}</span>
								{/if}
							</div>
						</div>
						<form
							method="POST"
							action="?/unblockUser"
							use:enhance={() => {
								unblockingId = blocked.id;
								return async ({ update }) => {
									unblockingId = null;
									await update();
								};
							}}
						>
							<input type="hidden" name="targetUserId" value={blocked.id} />
							<button type="submit" class="btn-unblock" disabled={unblockingId === blocked.id}>
								{unblockingId === blocked.id ? 'Déblocage...' : 'Débloquer'}
							</button>
						</form>
					</div>
				{/each}
			</div>
		{/if}
	</SettingsCard>
</div>

<style>
	.empty-blocked-text {
		color: #64748b;
		font-size: 0.9rem;
		margin: 8px 0;
	}
	.blocked-users-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin-top: 8px;
	}
	.blocked-user-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 14px;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		gap: 12px;
	}
	.blocked-user-info {
		display: flex;
		align-items: center;
		gap: 12px;
		min-width: 0;
	}
	.blocked-avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: #e2e8f0;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		flex-shrink: 0;
		font-weight: 700;
		color: #475569;
	}
	.blocked-avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.blocked-user-names {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.blocked-name {
		font-size: 0.95rem;
		color: #1e293b;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.blocked-handle {
		font-size: 0.8rem;
		color: #64748b;
	}
	.btn-unblock {
		padding: 6px 14px;
		border-radius: 6px;
		border: 1px solid #cbd5e1;
		background: #ffffff;
		color: #0f172a;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s ease;
		white-space: nowrap;
	}
	.btn-unblock:hover:not(:disabled) {
		background: #f1f5f9;
		border-color: #94a3b8;
	}
	.btn-unblock:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
