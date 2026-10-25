<script lang="ts">
	/**
	 * @component ChatGroupMembersList
	 * @domain chat
	 * @description Liste des membres d'un groupe avec recherche d'utilisateurs, attribution des droits administrateur et exclusion.
	 *
	 * @responsibilities
	 * - Afficher la liste des participants avec leurs rôles et avatars.
	 * - Proposer l'ajout de nouveaux membres via `UserSearch` avec option administrateur.
	 * - Permettre la promotion d'un membre en administrateur (`?/toggleAdmin`).
	 * - Permettre l'exclusion d'un participant (`?/removeMember`).
	 */

	import { enhance } from '$app/forms';
	import Icon from '$lib/components/ui/Icon.svelte';
	import UserSearch from '$lib/components/profile/UserSearch.svelte';
	import type { UserSearchResult } from '$lib/types';

	interface Participant {
		userId: string;
		isAdmin: boolean;
		user?: {
			username: string | null;
			name: string | null;
			image: string | null;
		} | null;
	}

	interface Props {
		/** Identifiant du chat de groupe */
		chatId: string;
		/** Liste des participants */
		participants: Participant[];
		/** L'utilisateur courant est-il administrateur */
		isAdmin?: boolean;
		/** Identifiant de l'utilisateur connecté */
		currentUserId: string;
	}

	let {
		chatId,
		participants,
		isAdmin = false,
		currentUserId
	}: Props = $props();

	let errorMessage = $state('');

	let selectedUserToAdd = $state<UserSearchResult | null>(null);
	let inviteAsAdmin = $state(false);
	let addUserForm = $state<HTMLFormElement | null>(null);

	let existingMemberIds = $derived(participants.map((p) => p.userId));

	function handleUserSelect(user: UserSearchResult) {
		selectedUserToAdd = user;
		setTimeout(() => addUserForm?.requestSubmit(), 50);
	}
</script>

<section class="participants-section">
	<h3>Membres ({participants.length})</h3>

	{#if isAdmin}
		<div class="add-member-box">
			<h4>Ajouter un membre</h4>
			<label class="checkbox-label small-checkbox">
				<input type="checkbox" bind:checked={inviteAsAdmin} />
				L'ajouter en tant qu'administrateur
			</label>
			<UserSearch
				id={`add_group_${chatId}`}
				onSelect={handleUserSelect}
				excludeUserIds={existingMemberIds}
			/>

			<form
				bind:this={addUserForm}
				method="POST"
				action="?/addMember"
				use:enhance={() => {
					errorMessage = '';
					return async ({ result, update }) => {
						if (result.type === 'failure' || (result.type === 'success' && result.data?.error)) {
							errorMessage = (result.data?.error as string) || "Erreur lors de l'ajout";
						}
						await update();
					};
				}}
			>
				<input type="hidden" name="username" value={selectedUserToAdd?.username || ''} />
				<input type="hidden" name="makeAdmin" value={inviteAsAdmin ? 'true' : 'false'} />
			</form>

			{#if errorMessage}
				<div class="error-msg" style="margin-top: 8px;">{errorMessage}</div>
			{/if}
		</div>
	{/if}

	<div class="members-list">
		{#each participants as p (p.userId)}
			<div class="member-item">
				<div class="member-info">
					{#if p.user?.image}
						<img src={p.user.image} alt={p.user.username} class="avatar-small" />
					{:else}
						<div class="avatar-small-placeholder">
							{(p.user?.username || '?').charAt(0).toUpperCase()}
						</div>
					{/if}
					<div class="member-text">
						<span class="username">{p.user?.name || p.user?.username}</span>
						{#if p.isAdmin}
							<span class="badge admin">Admin</span>
						{/if}
					</div>
				</div>

				{#if isAdmin && p.userId !== currentUserId}
					<div class="member-actions">
						{#if !p.isAdmin}
							<form method="POST" action="?/toggleAdmin" use:enhance>
								<input type="hidden" name="userId" value={p.userId} />
								<input type="hidden" name="action" value="promote" />
								<button
									type="submit"
									class="btn-text"
									onclick={(e) => {
										if (!confirm('Voulez-vous vraiment nommer ce membre administrateur ?'))
											e.preventDefault();
									}}
								>
									Nommer Admin
								</button>
							</form>
						{/if}

						<form method="POST" action="?/removeMember" use:enhance>
							<input type="hidden" name="userId" value={p.userId} />
							<button
								type="submit"
								class="btn-remove"
								aria-label="Exclure"
								onclick={(e) => {
									if (!confirm('Voulez-vous exclure ce membre ?')) e.preventDefault();
								}}
							>
								<Icon name="action.close" size={14} />
							</button>
						</form>
					</div>
				{/if}
			</div>
		{/each}
	</div>
</section>

<style>
	.participants-section {
		width: 100%;
		box-sizing: border-box;
	}

	.participants-section h3 {
		margin-top: 0;
		font-size: 1.2rem;
		margin-bottom: 16px;
		border-bottom: 1px solid #eaeaea;
		padding-bottom: 8px;
	}

	.add-member-box {
		background: #f0f9ff;
		padding: 16px;
		border-radius: 12px;
		margin-bottom: 16px;
		border: 1px dashed #7dd3fc;
	}

	.add-member-box h4 {
		margin: 0 0 12px 0;
		font-size: 0.95rem;
		color: #0369a1;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 8px;
		font-weight: 500;
		cursor: pointer;
	}

	.small-checkbox {
		font-size: 0.85rem;
		margin-bottom: 12px;
	}

	.small-checkbox input[type='checkbox'] {
		width: 18px;
		height: 18px;
		margin: 0;
		cursor: pointer;
	}

	.members-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.member-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px;
		background: #fafafa;
		border-radius: 12px;
	}

	.member-info {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.avatar-small,
	.avatar-small-placeholder {
		width: 40px;
		height: 40px;
		border-radius: 50%;
	}

	.avatar-small {
		object-fit: cover;
	}

	.avatar-small-placeholder {
		background: #e2e8f0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: bold;
		color: #64748b;
	}

	.member-text {
		display: flex;
		flex-direction: column;
	}

	.username {
		font-weight: 600;
		font-size: 1rem;
		color: #1e293b;
	}

	.badge.admin {
		font-size: 0.7rem;
		background: #e0245e;
		color: white;
		padding: 2px 6px;
		border-radius: 12px;
		width: fit-content;
		font-weight: bold;
		margin-top: 4px;
	}

	.member-actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.btn-text {
		background: none;
		border: 1px solid #cbd5e1;
		color: #475569;
		padding: 4px 8px;
		border-radius: 6px;
		font-size: 0.75rem;
		font-weight: bold;
		cursor: pointer;
		transition: background 0.2s;
	}

	.btn-text:hover {
		background: #f1f5f9;
	}

	.btn-remove {
		background: #fee2e2;
		color: #ef4444;
		border: none;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		font-weight: bold;
		cursor: pointer;
		transition: background 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.btn-remove:hover {
		background: #fca5a5;
		color: white;
	}

	.error-msg {
		color: #ef4444;
		font-size: 0.9rem;
		font-weight: 600;
		text-align: center;
	}
</style>
