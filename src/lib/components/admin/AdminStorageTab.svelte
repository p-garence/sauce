<script lang="ts">
	/**
	 * @component AdminStorageTab
	 * @domain Admin / Storage
	 * @description Onglet de supervision du stockage serveur et nettoyage des médias orphelins
	 * @responsibilities
	 * - Afficher la consommation totale des médias uploadés et l'espace disque serveur libre
	 * - Présenter la jauge visuelle d'occupation du disque
	 * - Détecter les fichiers orphelins et permettre leur purge sécurisée
	 */
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { formatBytes } from '$lib/utils/format';

	export interface ServerStorageData {
		totalDiskBytes: number;
		freeDiskBytes: number;
		totalAppBytes?: number;
		uploadsCount?: number;
	}

	export interface OrphanItem {
		filename: string;
		sizeBytes: number;
	}

	export interface OrphanMediaData {
		orphanCount: number;
		totalOrphanBytes: number;
		orphans: OrphanItem[];
	}

	interface Props {
		/** Métriques de stockage du serveur physique */
		serverStorage: ServerStorageData | null;
		/** Données et liste des fichiers médias orphelins */
		orphans: OrphanMediaData | null;
	}

	let { serverStorage, orphans }: Props = $props();

	let isCleaning = $state(false);

	let usedDiskBytes = $derived(
		serverStorage && serverStorage.totalDiskBytes > 0
			? Math.max(0, serverStorage.totalDiskBytes - serverStorage.freeDiskBytes)
			: 0
	);

	let diskPercent = $derived(
		serverStorage && serverStorage.totalDiskBytes > 0
			? Math.min(100, Math.max(0, (usedDiskBytes / serverStorage.totalDiskBytes) * 100))
			: 0
	);
</script>

<section class="tab-section">
	<!-- DONNÉES DE L'APPLICATION (SERVEUR) -->
	<div class="server-storage-card">
		<div class="storage-card-header">
			<div>
				<h2>Données de l'application (Serveur)</h2>
				<p class="action-desc">
					Consommation totale des fichiers médias hébergés et espace disque restant sur la machine
					serveur.
				</p>
			</div>
			{#if serverStorage?.uploadsCount}
				<span class="badge-count">{serverStorage.uploadsCount} fichier(s) média</span>
			{/if}
		</div>

		<div class="storage-metrics-grid">
			<div class="metric-bubble">
				<span class="metric-label">Données de l'application</span>
				<strong class="metric-value primary">
					{formatBytes(serverStorage?.totalAppBytes ?? 0)}
				</strong>
				<span class="metric-sub">Photos, vidéos et médias hébergés</span>
			</div>

			<div class="metric-bubble">
				<span class="metric-label">Espace restant sur le serveur</span>
				<strong class="metric-value success">
					{formatBytes(serverStorage?.freeDiskBytes ?? 0)}
				</strong>
				<span class="metric-sub">
					{#if serverStorage && serverStorage.totalDiskBytes > 0}
						sur {formatBytes(serverStorage.totalDiskBytes)} au total
					{:else}
						Espace disque libre
					{/if}
				</span>
			</div>
		</div>

		{#if serverStorage && serverStorage.totalDiskBytes > 0}
			<div class="disk-progress-wrapper">
				<div class="disk-progress-labels">
					<span>Occupation du disque serveur</span>
					<span>
						<strong>{formatBytes(usedDiskBytes)}</strong> / {formatBytes(
							serverStorage.totalDiskBytes
						)} ({diskPercent.toFixed(1)}%)
					</span>
				</div>
				<div class="progress-bar-bg">
					<div
						class="progress-bar-fill"
						style="width: {diskPercent}%; background-color: {diskPercent > 90
							? '#ef4444'
							: diskPercent > 75
								? '#f59e0b'
								: '#3b82f6'};"
					></div>
				</div>
			</div>
		{/if}
	</div>

	<div class="orphan-header-card">
		<div>
			<h2>Détection et Nettoyage des Médias Orphelins</h2>
			<p class="action-desc">
				Fichiers présents sur le disque (`uploads/`) non rattachés aux publications, stories,
				messages de chat ou profils. Une période de sécurité de 2h protège les envois et brouillons
				en cours.
			</p>
		</div>
		{#if orphans && orphans.orphanCount > 0}
			<form
				method="POST"
				action="{resolve('/admin/storage')}?/cleanupOrphans"
				use:enhance={() => {
					isCleaning = true;
					return async ({ update }) => {
						await update();
						isCleaning = false;
					};
				}}
				onsubmit={(e) => {
					if (
						!confirm(
							`Supprimer définitivement les ${orphans.orphanCount} fichiers orphelins (${formatBytes(orphans.totalOrphanBytes)}) ?`
						)
					)
						e.preventDefault();
				}}
			>
				<button class="btn btn-red" disabled={isCleaning}>
					{isCleaning
						? 'Nettoyage en cours...'
						: `Nettoyer tous les orphelins (${orphans.orphanCount})`}
				</button>
			</form>
		{/if}
	</div>

	{#if orphans && orphans.orphanCount > 0}
		<div class="orphan-alert alert-warning">
			<strong>{orphans.orphanCount}</strong> fichier(s) orphelin(s) détecté(s), occupant
			<strong>{formatBytes(orphans.totalOrphanBytes)}</strong> d'espace disque inutile.
		</div>
		<div class="orphan-list">
			{#each orphans.orphans as orphan (orphan.filename)}
				<div class="orphan-item">
					<span class="orphan-filename">{orphan.filename}</span>
					<span class="orphan-filesize">{formatBytes(orphan.sizeBytes)}</span>
				</div>
			{/each}
		</div>
	{:else}
		<div class="orphan-alert alert-success">
			Aucun fichier orphelin détecté. Le stockage est parfaitement propre !
		</div>
	{/if}
</section>

<style>
	.server-storage-card {
		background: #ffffff;
		border: 1px solid #e5e7eb;
		border-radius: 10px;
		padding: 20px;
		margin-bottom: 24px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.storage-card-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		flex-wrap: wrap;
		gap: 12px;
	}

	.storage-card-header h2 {
		margin: 0 0 6px 0;
		font-size: 1.25rem;
		color: #111827;
	}

	.action-desc {
		margin: 0 0 16px 0;
		font-size: 0.88rem;
		color: #6b7280;
		line-height: 1.4;
	}

	.storage-metrics-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 16px;
	}

	.metric-bubble {
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 14px 16px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.metric-label {
		font-size: 0.85rem;
		color: #6b7280;
		font-weight: 500;
	}

	.metric-value {
		font-size: 1.45rem;
		font-weight: 700;
		color: #111827;
	}

	.metric-value.primary {
		color: #2563eb;
	}

	.metric-value.success {
		color: #059669;
	}

	.metric-sub {
		font-size: 0.78rem;
		color: #9ca3af;
	}

	.badge-count {
		background: #e0f2fe;
		color: #0369a1;
		font-size: 0.8rem;
		font-weight: 600;
		padding: 4px 10px;
		border-radius: 12px;
	}

	.disk-progress-wrapper {
		display: flex;
		flex-direction: column;
		gap: 6px;
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 12px 16px;
	}

	.disk-progress-labels {
		display: flex;
		justify-content: space-between;
		font-size: 0.85rem;
		color: #4b5563;
		flex-wrap: wrap;
		gap: 4px;
	}

	.progress-bar-bg {
		width: 100%;
		height: 10px;
		background: #e5e7eb;
		border-radius: 6px;
		overflow: hidden;
	}

	.progress-bar-fill {
		height: 100%;
		border-radius: 6px;
		transition:
			width 0.3s ease,
			background-color 0.3s ease;
	}

	.orphan-header-card {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 16px;
		margin-bottom: 16px;
	}

	.orphan-header-card h2 {
		margin: 0 0 6px 0;
		font-size: 1.25rem;
		color: #111827;
	}

	.orphan-alert {
		padding: 12px 16px;
		border-radius: 8px;
		font-size: 0.9rem;
		margin-bottom: 16px;
	}

	.alert-warning {
		background: #fef3c7;
		color: #92400e;
		border: 1px solid #fde68a;
	}

	.alert-success {
		background: #dcfce7;
		color: #166534;
		border: 1px solid #bbf7d0;
	}

	.orphan-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
		max-height: 280px;
		overflow-y: auto;
		background: #f9fafb;
		padding: 12px;
		border-radius: 8px;
		border: 1px solid #e5e7eb;
	}

	.orphan-item {
		display: flex;
		justify-content: space-between;
		padding: 8px 12px;
		background: white;
		border-radius: 6px;
		font-size: 0.85rem;
		border: 1px solid #f3f4f6;
		font-family: monospace;
	}

	.orphan-filename {
		color: #374151;
		word-break: break-all;
	}

	.orphan-filesize {
		color: #dc2626;
		font-weight: 600;
		margin-left: 12px;
		white-space: nowrap;
	}

	.btn {
		padding: 8px 14px;
		border: none;
		border-radius: 6px;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		color: white;
		display: inline-flex;
		align-items: center;
		transition: opacity 0.15s ease;
	}

	.btn:hover {
		opacity: 0.9;
	}

	.btn-red {
		background: #dc2626;
	}
</style>
