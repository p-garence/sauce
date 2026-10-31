<!--
  @component AdminUsersTab
  @domain Admin / Users
  @description Onglet d'administration et de modération des utilisateurs avec menu contextuel d'actions
  @responsibilities
  - Afficher la liste des utilisateurs enregistrés avec filtrage instantané par pseudo, nom ou email
  - Renommer des utilisateurs et modifier leur quota d'espace multimédia (upload)
  - Proposer un menu d'options contextuel (...) par utilisateur : Mail de reset, Bannir/Débannir, Ajouter des clés, Nommer admin
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';
	import ActionMenu from '$lib/components/ui/ActionMenu.svelte';
	import type { MenuAction } from '$lib/types';

	export interface AdminUserItem {
		id: string;
		username: string | null;
		name: string | null;
		email: string;
		role: string;
		isBanned: boolean;
		storageQuotaBytes?: number | null;
		maxInvites: number;
		inviter?: { username: string | null } | null;
	}

	interface Props {
		/** Liste des utilisateurs retournés par le serveur */
		users: AdminUserItem[];
		/** Identifiant de l'administrateur connecté */
		currentUserId?: string;
	}

	let { users = [], currentUserId = '' }: Props = $props();

	let userSearch = $state('');
	let hiddenActionForm = $state<HTMLFormElement>();
	let targetActionUrl = $state('?/toggleBan');
	let selectedUserId = $state('');
	let feedbackMessage = $state<string | null>(null);
	let feedbackType = $state<'success' | 'error'>('success');

	const filteredUsers = $derived(
		users.filter((u) => {
			const query = userSearch.toLowerCase().trim();
			if (!query) return true;
			return (
				(u.username && u.username.toLowerCase().includes(query)) ||
				(u.name && u.name.toLowerCase().includes(query)) ||
				(u.email && u.email.toLowerCase().includes(query))
			);
		})
	);

	function submitAction(actionName: string, userId: string, confirmMessage?: string) {
		if (confirmMessage && !confirm(confirmMessage)) return;
		selectedUserId = userId;
		targetActionUrl = `?/${actionName}`;
		tick().then(() => {
			hiddenActionForm?.requestSubmit();
		});
	}

	function getUserActions(u: AdminUserItem): MenuAction[] {
		const list: MenuAction[] = [
			{
				label: 'Mail de reset',
				onClick: () => {
					submitAction(
						'sendResetPassword',
						u.id,
						`Envoyer un email de réinitialisation de mot de passe à ${u.username || u.name || 'cet utilisateur'} (${u.email}) ?`
					);
				}
			},
			{
				label: `Ajouter des clés (+5)`,
				onClick: () => {
					submitAction(
						'addInvites',
						u.id,
						`Augmenter le quota de ${u.username || u.name || 'cet utilisateur'} de 5 clés d'invitation ?`
					);
				}
			}
		];

		if (u.role !== 'admin') {
			list.push({
				label: 'Nommer admin',
				onClick: () => {
					submitAction(
						'makeAdmin',
						u.id,
						`Accorder les droits administrateur à ${u.username || u.name || 'cet utilisateur'} ?`
					);
				}
			});
		}

		if (!currentUserId || currentUserId !== u.id) {
			list.push({
				label: u.isBanned ? 'Débannir' : 'Bannir',
				variant: u.isBanned ? 'default' : 'danger',
				dividerBelow: false,
				onClick: () => {
					submitAction(
						'toggleBan',
						u.id,
						u.isBanned
							? `Débannir et réactiver le compte de ${u.username || u.name || 'cet utilisateur'} ?`
							: `Bannir le compte de ${u.username || u.name || 'cet utilisateur'} ? Ses sessions seront immédiatement révoquées.`
					);
				}
			});
		}

		return list;
	}

	function promptRename(
		e: MouseEvent,
		currentUsername: string,
		currentName: string,
		formElement: HTMLFormElement
	) {
		e.preventDefault();
		const newName = prompt(`Entrez le nouveau nom pour ${currentUsername} :`, currentName);
		if (newName) {
			const input = formElement.querySelector('input[name="newName"]') as HTMLInputElement;
			input.value = newName;
			formElement.requestSubmit();
		}
	}

	function promptQuota(
		e: MouseEvent,
		currentUsername: string,
		currentQuotaBytes: number,
		formElement: HTMLFormElement
	) {
		e.preventDefault();
		const currentGB = (currentQuotaBytes / (1024 * 1024 * 1024)).toFixed(1);
		const newQuota = prompt(
			`Nouveau quota d'upload pour @${currentUsername} en Go (ex: 2, 5, 10) :`,
			currentGB
		);
		if (newQuota !== null && newQuota.trim() !== '') {
			const num = parseFloat(newQuota);
			if (!isNaN(num) && num >= 0) {
				const input = formElement.querySelector('input[name="quotaGB"]') as HTMLInputElement;
				input.value = num.toString();
				formElement.requestSubmit();
			} else {
				alert('Veuillez entrer un nombre valide supérieur ou égal à 0.');
			}
		}
	}
</script>

<section class="tab-section">
	<!-- RETOUR VISUEL APRÈS ACTION -->
	{#if feedbackMessage}
		<div class="feedback-banner {feedbackType}">
			<span>{feedbackMessage}</span>
			<button
				type="button"
				class="close-feedback-btn"
				onclick={() => (feedbackMessage = null)}
				aria-label="Fermer le message"
			>
				✕
			</button>
		</div>
	{/if}

	<!-- FORMULAIRE TECHNIQUE POUR LES ACTIONS DU MENU -->
	<form
		bind:this={hiddenActionForm}
		method="POST"
		action={targetActionUrl}
		use:enhance={() => {
			return async ({ result, update }) => {
				if (result.type === 'success') {
					const resData = result.data as { message?: string } | undefined;
					feedbackMessage = resData?.message || 'Action exécutée avec succès.';
					feedbackType = 'success';
				} else if (result.type === 'failure') {
					const resData = result.data as { message?: string } | undefined;
					feedbackMessage = resData?.message || 'Une erreur est survenue lors du traitement.';
					feedbackType = 'error';
				}
				await update();
			};
		}}
		class="hidden-form"
	>
		<input type="hidden" name="userId" value={selectedUserId} />
	</form>

	<div class="section-toolbar">
		<input
			type="search"
			placeholder="Filtrer par pseudo, nom ou email..."
			bind:value={userSearch}
			class="search-input"
		/>
		<span class="results-count">{filteredUsers.length} utilisateur(s)</span>
	</div>

	<div class="table-container">
		<table class="admin-table">
			<thead>
				<tr>
					<th>Utilisateur</th>
					<th>Statut</th>
					<th>Quota Médias</th>
					<th>Parrain</th>
					<th class="actions-header">Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each filteredUsers as u (u.id)}
					<tr class:is-banned={u.isBanned}>
						<td>
							<form method="POST" action="?/updateName" use:enhance class="inline-form">
								<input type="hidden" name="userId" value={u.id} />
								<input type="hidden" name="newName" value="" />
								<button
									type="button"
									class="link-btn"
									onclick={(e) =>
										promptRename(
											e,
											u.username || '',
											u.name || '',
											e.currentTarget.closest('form')!
										)}
									title="Modifier le Nom"
								>
									<strong>{u.username} ({u.name})</strong>
								</button>
							</form>
							<br />
							<span class="sub-text">{u.email}</span>
							{#if u.role === 'admin'}
								<span class="badge badge-admin">Admin</span>
							{/if}
						</td>
						<td>
							{#if u.isBanned}
								<span class="badge badge-banned">Banni</span>
							{:else}
								<span class="badge badge-active">Actif</span>
							{/if}
						</td>
						<td>
							<form method="POST" action="?/updateQuota" use:enhance class="inline-form">
								<input type="hidden" name="userId" value={u.id} />
								<input type="hidden" name="quotaGB" value="" />
								<button
									type="button"
									class="link-btn"
									onclick={(e) =>
										promptQuota(
											e,
											u.username || '',
											u.storageQuotaBytes ?? 2147483648,
											e.currentTarget.closest('form')!
										)}
									title="Modifier le quota d'upload"
								>
									<strong
										>{((u.storageQuotaBytes ?? 2147483648) / (1024 * 1024 * 1024)).toFixed(1)} Go</strong
									>
								</button>
							</form>
						</td>
						<td>
							{#if u.inviter}
								@{u.inviter.username}
							{:else}
								<span class="sub-text italic">Racine (Aucun)</span>
							{/if}
						</td>
						<td class="actions-cell">
							<div class="actions-wrapper">
								<ActionMenu actions={getUserActions(u)} />
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>

<style>
	.hidden-form {
		display: none;
	}

	.feedback-banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 16px;
		border-radius: 8px;
		font-size: 0.9rem;
		margin-bottom: 16px;
	}

	.feedback-banner.success {
		background-color: #ecfdf5;
		color: #065f46;
		border: 1px solid #a7f3d0;
	}

	.feedback-banner.error {
		background-color: #fef2f2;
		color: #991b1b;
		border: 1px solid #fecaca;
	}

	.close-feedback-btn {
		background: none;
		border: none;
		font-size: 1rem;
		line-height: 1;
		cursor: pointer;
		color: inherit;
		opacity: 0.7;
		padding: 4px;
	}

	.close-feedback-btn:hover {
		opacity: 1;
	}

	.section-toolbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 16px;
		gap: 16px;
		flex-wrap: wrap;
	}

	.search-input {
		flex: 1;
		max-width: 400px;
		padding: 8px 14px;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		font-size: 0.9rem;
	}

	.results-count {
		font-size: 0.85rem;
		color: #6b7280;
	}

	.table-container {
		overflow-x: auto;
		min-height: 280px;
		padding-bottom: 60px;
	}

	.admin-table {
		width: 100%;
		border-collapse: collapse;
		text-align: left;
	}

	.admin-table th {
		background: #f8f9fa;
		padding: 12px;
		font-size: 0.85rem;
		color: #4b5563;
		border-bottom: 2px solid #eaeaea;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.admin-table td {
		padding: 14px 12px;
		border-bottom: 1px solid #eaeaea;
		vertical-align: middle;
		font-size: 0.9rem;
	}

	.is-banned td {
		background-color: #fef2f2;
		opacity: 0.85;
	}

	.inline-form {
		display: inline-block;
		margin: 0;
	}

	.link-btn {
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		color: inherit;
		font: inherit;
	}

	.link-btn:hover strong {
		color: #2563eb;
		text-decoration: underline;
	}

	.sub-text {
		font-size: 0.8rem;
		color: #6b7280;
	}

	.italic {
		font-style: italic;
	}

	.badge {
		font-size: 0.72rem;
		padding: 3px 8px;
		border-radius: 12px;
		font-weight: 600;
	}

	.badge-admin {
		background: #dbeafe;
		color: #1e40af;
		margin-left: 6px;
	}

	.badge-active {
		background: #dcfce7;
		color: #166534;
	}

	.badge-banned {
		background: #fee2e2;
		color: #991b1b;
	}

	.actions-header {
		text-align: right;
		width: 60px;
		padding-right: 16px;
	}

	.actions-cell {
		text-align: right;
		width: 60px;
		padding-right: 16px;
	}

	.actions-wrapper {
		display: inline-flex;
		justify-content: flex-end;
		position: relative;
	}
</style>
