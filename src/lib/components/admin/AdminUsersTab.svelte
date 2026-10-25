<script lang="ts">
	/**
	 * @component AdminUsersTab
	 * @domain Admin / Users
	 * @description Onglet d'administration et de modération des utilisateurs
	 * @responsibilities
	 * - Afficher la liste des utilisateurs enregistrés avec filtrage instantané par pseudo, nom ou email
	 * - Renommer des utilisateurs et modifier leur quota d'espace multimédia (upload)
	 * - Bannir ou réactiver des comptes
	 * - Attribuer des invitations supplémentaires (+5 clés) ou promouvoir en administrateur
	 * - Supprimer définitivement un compte et ses ressources associées
	 */
	import { enhance } from '$app/forms';

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
	}

	let { users = [] }: Props = $props();

	let userSearch = $state('');

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
					<th>Actions</th>
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
							<!-- BANNIR / DÉBANNIR -->
							<form method="POST" action="?/toggleBan" use:enhance>
								<input type="hidden" name="userId" value={u.id} />
								<input type="hidden" name="isBanned" value={u.isBanned.toString()} />
								<button class="btn {u.isBanned ? 'btn-green' : 'btn-orange'}">
									{u.isBanned ? 'Débannir' : 'Bannir'}
								</button>
							</form>

							<!-- +5 CLÉS -->
							<form
								method="POST"
								action="?/addInvites"
								use:enhance
								onsubmit={(e) => {
									if (!confirm(`Augmenter le quota de ${u.username} à ${u.maxInvites + 5} clés ?`))
										e.preventDefault();
								}}
							>
								<input type="hidden" name="userId" value={u.id} />
								<button class="btn btn-purple" title="Ajouter +5 au quota d'invitations">
									+5 Clés ({u.maxInvites})
								</button>
							</form>

							<!-- NOMMER ADMIN -->
							{#if u.role !== 'admin'}
								<form method="POST" action="?/makeAdmin" use:enhance>
									<input type="hidden" name="userId" value={u.id} />
									<button class="btn btn-blue">Nommer Admin</button>
								</form>
							{/if}

							<!-- SUPPRIMER -->
							<form
								method="POST"
								action="?/deleteUser"
								use:enhance
								onsubmit={(e) => {
									if (
										!confirm(
											'Attention, suppression définitive. Tous ses posts et fichiers seront supprimés. Continuer ?'
										)
									)
										e.preventDefault();
								}}
							>
								<input type="hidden" name="userId" value={u.id} />
								<button class="btn btn-red">Supprimer</button>
							</form>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>

<style>
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

	.actions-cell {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
	}

	.btn {
		padding: 6px 10px;
		border: none;
		border-radius: 6px;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		color: white;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		transition: opacity 0.15s ease;
	}

	.btn:hover {
		opacity: 0.9;
	}

	.btn-orange {
		background: #f97316;
	}
	.btn-green {
		background: #16a34a;
	}
	.btn-blue {
		background: #2563eb;
	}
	.btn-red {
		background: #dc2626;
	}
	.btn-purple {
		background: #9333ea;
	}
</style>
