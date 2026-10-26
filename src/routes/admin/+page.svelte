<!--
  @component AdminDashboardPage
  @domain admin
  @description Tableau de bord d'accueil de la console d'administration avec vue d'ensemble des métriques de l'instance.
  @responsibilities
    - Afficher les indicateurs de santé et d'activité de l'instance (membres, contenus, stockage)
    - Proposer des accès directs aux différentes sections de gestion
-->
<script lang="ts">
	import type { PageData } from './$types';
	import { resolve } from '$app/paths';
	import { formatBytes } from '$lib/utils/format';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
</script>

<div class="dashboard-page">
	<header class="page-header">
		<div>
			<h1 class="page-title">Tableau de bord</h1>
			<p class="page-desc">
				Vue d'ensemble de l'activité, des ressources et de la santé de votre instance.
			</p>
		</div>
	</header>

	<!-- CARTES DE MÉTRIQUES PRINCIPALES -->
	<div class="metrics-grid">
		<div class="metric-card">
			<span class="metric-label">Membres inscrits</span>
			<div class="metric-value-row">
				<span class="metric-value">{data.totalUsers}</span>
			</div>
			<span class="metric-subtext">Comptes enregistrés sur l'instance</span>
			<a href={resolve('/admin/users')} class="metric-link">Gérer les utilisateurs →</a>
		</div>

		<div class="metric-card">
			<span class="metric-label">Publications</span>
			<div class="metric-value-row">
				<span class="metric-value">{data.stats.totalPosts}</span>
			</div>
			<span class="metric-subtext">Posts publics, abonnés ou groupes</span>
			<a href={resolve('/admin/posts')} class="metric-link">Modérer les posts →</a>
		</div>

		<div class="metric-card">
			<span class="metric-label">Stories actives</span>
			<div class="metric-value-row">
				<span class="metric-value">{data.stats.totalStories}</span>
			</div>
			<span class="metric-subtext">Publications éphémères en cours</span>
			<a href={resolve('/admin/stories')} class="metric-link">Modérer les stories →</a>
		</div>

		<div class="metric-card">
			<span class="metric-label">Espace multimédia</span>
			<div class="metric-value-row">
				<span class="metric-value">{formatBytes(data.serverStorage.totalAppBytes ?? 0)}</span>
			</div>
			<span class="metric-subtext">
				{formatBytes(data.serverStorage.freeDiskBytes ?? 0)} restants sur le disque ({data
					.serverStorage.uploadsCount ?? 0} fichiers)
			</span>
			<a href={resolve('/admin/storage')} class="metric-link">Détails du stockage →</a>
		</div>
	</div>

	<!-- ALERTE ORPHELINS SI NÉCESSAIRE -->
	{#if data.orphans && data.orphans.orphanCount > 0}
		<div class="alert-banner warning">
			<div class="alert-content">
				<strong>Fichiers orphelins détectés</strong>
				<p>
					{data.orphans.orphanCount} fichier(s) sur le disque ({formatBytes(
						data.orphans.totalOrphanBytes
					)}) ne sont plus référencés dans la base de données.
				</p>
			</div>
			<a href={resolve('/admin/storage')} class="alert-action-btn"> Nettoyer le stockage </a>
		</div>
	{/if}

	<!-- NAVIGATION RAPIDE PAR GROUPES -->
	<div class="quick-access-section">
		<h2 class="section-title">Sections d'administration</h2>
		<div class="quick-cards-grid">
			<a href={resolve('/admin/users')} class="quick-card">
				<h3>Utilisateurs</h3>
				<p>Gestion des rôles, bannissements, quotas de stockage et clés d'invitation.</p>
			</a>

			<a href={resolve('/admin/permissions')} class="quick-card">
				<h3>Permissions et rôles</h3>
				<p>Configuration des privilèges d'accès, permissions des groupes et modérateurs.</p>
			</a>

			<a href={resolve('/admin/system-post')} class="quick-card">
				<h3>Post système</h3>
				<p>Diffuser un message officiel avec notification push à tous les membres.</p>
			</a>

			<a href={resolve('/admin/appearance')} class="quick-card">
				<h3>Apparence et packs</h3>
				<p>Gestion des packs d'icônes et d'émojis officiels de l'instance.</p>
			</a>

			<a href={resolve('/admin/backups')} class="quick-card">
				<h3>Sauvegardes</h3>
				<p>Sauvegardes de la base de données PostgreSQL et snapshots médias.</p>
			</a>

			<a href={resolve('/admin/actions')} class="quick-card">
				<h3>Actions globales</h3>
				<p>Maintenance, purge, outils de test et génération de données.</p>
			</a>
		</div>
	</div>
</div>

<style>
	.dashboard-page {
		display: flex;
		flex-direction: column;
		gap: 28px;
	}

	.page-header {
		border-bottom: 1px solid #e2e8f0;
		padding-bottom: 16px;
	}

	.page-title {
		margin: 0 0 6px 0;
		font-size: 1.6rem;
		font-weight: 700;
		color: #0f172a;
		letter-spacing: -0.02em;
	}

	.page-desc {
		margin: 0;
		color: #64748b;
		font-size: 0.95rem;
	}

	/* MÉTRIQUES */
	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 16px;
	}

	.metric-card {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		padding: 18px 20px;
		display: flex;
		flex-direction: column;
		gap: 6px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
	}

	.metric-label {
		font-size: 0.8rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: #64748b;
	}

	.metric-value-row {
		display: flex;
		align-items: baseline;
		margin: 4px 0 2px 0;
	}

	.metric-value {
		font-size: 1.85rem;
		font-weight: 700;
		color: #0f172a;
		letter-spacing: -0.02em;
	}

	.metric-subtext {
		font-size: 0.8rem;
		color: #94a3b8;
		flex: 1;
	}

	.metric-link {
		margin-top: 10px;
		font-size: 0.82rem;
		font-weight: 600;
		color: #2563eb;
		text-decoration: none;
		display: inline-block;
	}
	.metric-link:hover {
		text-decoration: underline;
	}

	/* ALERTE */
	.alert-banner.warning {
		background: #fffbeb;
		border: 1px solid #fef3c7;
		border-left: 4px solid #f59e0b;
		border-radius: 8px;
		padding: 16px 20px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
	}

	.alert-content strong {
		display: block;
		font-size: 0.95rem;
		color: #92400e;
		margin-bottom: 2px;
	}

	.alert-content p {
		margin: 0;
		font-size: 0.85rem;
		color: #b45309;
	}

	.alert-action-btn {
		background: #f59e0b;
		color: white;
		text-decoration: none;
		font-size: 0.85rem;
		font-weight: 600;
		padding: 8px 14px;
		border-radius: 6px;
		white-space: nowrap;
		transition: background-color 0.15s ease;
	}
	.alert-action-btn:hover {
		background: #d97706;
	}

	/* QUICK ACCESS */
	.quick-access-section {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.section-title {
		margin: 0;
		font-size: 1.15rem;
		font-weight: 600;
		color: #0f172a;
	}

	.quick-cards-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 14px;
	}

	.quick-card {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		padding: 18px;
		text-decoration: none;
		transition: all 0.15s ease;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.quick-card:hover {
		border-color: #cbd5e1;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
		transform: translateY(-1px);
	}

	.quick-card h3 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: #0f172a;
	}

	.quick-card p {
		margin: 0;
		font-size: 0.85rem;
		color: #64748b;
		line-height: 1.4;
	}
</style>
