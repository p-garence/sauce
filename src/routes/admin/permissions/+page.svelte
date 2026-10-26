<!--
  @component AdminPermissionsPage
  @domain admin/permissions
  @description Page de gestion des permissions, rôles et privilèges d'accès de l'instance.
-->
<script lang="ts">
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const permissionsMatrix = [
		{
			category: 'Modération & Contenu',
			permissions: [
				{ name: "Supprimer les publications d'autrui", admin: true, moderator: true, user: false },
				{ name: "Supprimer les stories d'autrui", admin: true, moderator: true, user: false },
				{ name: 'Supprimer les commentaires signalés', admin: true, moderator: true, user: false },
				{
					name: 'Bannir ou suspendre temporairement un compte',
					admin: true,
					moderator: true,
					user: false
				}
			]
		},
		{
			category: 'Gestion des Membres & Comptes',
			permissions: [
				{ name: "Modifier le rôle d'un utilisateur", admin: true, moderator: false, user: false },
				{ name: "Ajuster les quotas d'upload disque", admin: true, moderator: false, user: false },
				{
					name: "Générer des clés d'invitation système",
					admin: true,
					moderator: false,
					user: false
				},
				{ name: "Suppression définitive d'un compte", admin: true, moderator: false, user: false }
			]
		},
		{
			category: 'Système & Diffusion Globale',
			permissions: [
				{
					name: 'Publier un post système avec notification push',
					admin: true,
					moderator: false,
					user: false
				},
				{
					name: "Publier des packs d'icônes / émojis d'instance",
					admin: true,
					moderator: false,
					user: false
				},
				{
					name: 'Purge du stockage et fichiers orphelins',
					admin: true,
					moderator: false,
					user: false
				},
				{
					name: 'Gestion des sauvegardes de la base de données',
					admin: true,
					moderator: false,
					user: false
				}
			]
		}
	];
</script>

<div class="admin-page">
	<header class="page-header">
		<div>
			<h1 class="page-title">Permissions et rôles</h1>
			<p class="page-desc">
				Définition des privilèges d'accès et matrice des rôles pour les administrateurs, modérateurs
				et membres.
			</p>
		</div>
	</header>

	<!-- RÉPARTITION DES RÔLES -->
	<div class="roles-summary-grid">
		<div class="role-card">
			<div class="role-badge admin">Administrateur</div>
			<div class="role-count">{data.roleDistribution.admin} compte(s)</div>
			<p class="role-desc">
				Accès total à la console, configuration serveur, quotas et actions destructives.
			</p>
		</div>

		<div class="role-card">
			<div class="role-badge moderator">Modérateur</div>
			<div class="role-count">{data.roleDistribution.moderator} compte(s)</div>
			<p class="role-desc">
				Modération des contenus inappropriés, gestion des signalements et suspensions.
			</p>
		</div>

		<div class="role-card">
			<div class="role-badge user">Membre standard</div>
			<div class="role-count">{data.roleDistribution.user} compte(s)</div>
			<p class="role-desc">
				Utilisation normale du réseau selon les règles de visibilité et quotas attribués.
			</p>
		</div>
	</div>

	<!-- MATRICE DES DROITS -->
	<div class="matrix-card">
		<div class="matrix-header">
			<h2>Matrice des droits d'accès</h2>
			<span class="info-tag">En lecture pour cette version</span>
		</div>

		<div class="table-container">
			<table class="permissions-table">
				<thead>
					<tr>
						<th>Capacité</th>
						<th class="col-center">Admin</th>
						<th class="col-center">Modérateur</th>
						<th class="col-center">Membre</th>
					</tr>
				</thead>
				<tbody>
					{#each permissionsMatrix as section (section.category)}
						<tr class="section-row">
							<td colspan="4">{section.category}</td>
						</tr>
						{#each section.permissions as perm (perm.name)}
							<tr>
								<td class="perm-name">{perm.name}</td>
								<td class="col-center">
									{#if perm.admin}
										<span class="check-allowed" title="Autorisé">✓</span>
									{:else}
										<span class="check-denied" title="Refusé">—</span>
									{/if}
								</td>
								<td class="col-center">
									{#if perm.moderator}
										<span class="check-allowed" title="Autorisé">✓</span>
									{:else}
										<span class="check-denied" title="Refusé">—</span>
									{/if}
								</td>
								<td class="col-center">
									{#if perm.user}
										<span class="check-allowed" title="Autorisé">✓</span>
									{:else}
										<span class="check-denied" title="Refusé">—</span>
									{/if}
								</td>
							</tr>
						{/each}
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>

<style>
	.admin-page {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.page-header {
		border-bottom: 1px solid #e2e8f0;
		padding-bottom: 16px;
	}

	.page-title {
		margin: 0 0 6px 0;
		font-size: 1.5rem;
		font-weight: 700;
		color: #0f172a;
		letter-spacing: -0.02em;
	}

	.page-desc {
		margin: 0;
		color: #64748b;
		font-size: 0.95rem;
	}

	/* RÔLES */
	.roles-summary-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 16px;
	}

	.role-card {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.role-badge {
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 3px 8px;
		border-radius: 4px;
		align-self: flex-start;
	}
	.role-badge.admin {
		background: #fee2e2;
		color: #991b1b;
	}
	.role-badge.moderator {
		background: #fef3c7;
		color: #92400e;
	}
	.role-badge.user {
		background: #f1f5f9;
		color: #475569;
	}

	.role-count {
		font-size: 1.4rem;
		font-weight: 700;
		color: #0f172a;
	}

	.role-desc {
		margin: 0;
		font-size: 0.85rem;
		color: #64748b;
		line-height: 1.4;
	}

	/* MATRICE */
	.matrix-card {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.matrix-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 12px;
	}

	.matrix-header h2 {
		margin: 0;
		font-size: 1.15rem;
		font-weight: 600;
		color: #0f172a;
	}

	.info-tag {
		font-size: 0.75rem;
		font-weight: 600;
		background: #f1f5f9;
		color: #475569;
		padding: 4px 10px;
		border-radius: 6px;
	}

	.table-container {
		overflow-x: auto;
	}

	.permissions-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.88rem;
		text-align: left;
	}

	.permissions-table th {
		padding: 10px 14px;
		font-weight: 600;
		color: #475569;
		border-bottom: 2px solid #e2e8f0;
		background: #f8fafc;
	}

	.permissions-table td {
		padding: 12px 14px;
		border-bottom: 1px solid #f1f5f9;
	}

	.section-row td {
		background: #f8fafc;
		font-weight: 700;
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #64748b;
		padding: 10px 14px;
	}

	.col-center {
		text-align: center;
		width: 120px;
	}

	.perm-name {
		color: #1e293b;
		font-weight: 500;
	}

	.check-allowed {
		color: #16a34a;
		font-weight: bold;
		font-size: 1.1rem;
	}

	.check-denied {
		color: #cbd5e1;
		font-weight: bold;
	}
</style>
