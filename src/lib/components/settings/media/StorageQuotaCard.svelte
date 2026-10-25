<!--
  @component StorageQuotaCard
  @domain settings/media
  @description Carte d'affichage du quota de stockage multimédia serveur et de l'espace cache local de l'appareil.
  @responsibilities
    - Afficher la jauge de remplissage du quota avec pourcentage et code couleur dynamique
    - Afficher l'espace restant disponible
    - Inspecter l'espace cache local du navigateur via l'API Storage
    - Permettre le vidage du cache local de l'application
-->
<script lang="ts">
	import SettingsCard from '$lib/components/settings/ui/SettingsCard.svelte';
	import { formatBytes } from '$lib/utils/format';

	/**
	 * Propriétés du composant StorageQuotaCard
	 */
	interface Props {
		/** Octets actuellement consommés par l'utilisateur */
		currentUsedBytes: number;
		/** Quota total alloué en octets */
		quotaBytes: number;
		/** Pourcentage d'utilisation calculé (0 à 100) */
		usedPercentage: number;
		/** Couleur hexadécimale de la barre de progression (vert/orange/rouge) */
		progressColor: string;
	}

	let {
		currentUsedBytes,
		quotaBytes,
		usedPercentage,
		progressColor
	}: Props = $props();

	// Stockage sur l'appareil (navigateur / cache)
	let deviceStorage = $state<{ usage: number; quota: number; remaining: number } | null>(null);
	let isClearingCache = $state(false);
	let cacheClearedFeedback = $state(false);

	$effect(() => {
		if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
			navigator.storage
				.estimate()
				.then((est) => {
					const u = est.usage ?? 0;
					const q = est.quota ?? 0;
					deviceStorage = {
						usage: u,
						quota: q,
						remaining: Math.max(0, q - u)
					};
				})
				.catch(() => {});
		}
	});

	async function handleClearAppCache() {
		isClearingCache = true;
		try {
			if (typeof window !== 'undefined' && 'caches' in window) {
				const keys = await window.caches.keys();
				await Promise.all(keys.map((k) => window.caches.delete(k)));
			}
			if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
				const est = await navigator.storage.estimate();
				const u = est.usage ?? 0;
				const q = est.quota ?? 0;
				deviceStorage = {
					usage: u,
					quota: q,
					remaining: Math.max(0, q - u)
				};
			}
			cacheClearedFeedback = true;
			setTimeout(() => {
				cacheClearedFeedback = false;
			}, 3000);
		} catch (err) {
			console.error('Erreur vidage cache:', err);
		} finally {
			isClearingCache = false;
		}
	}
</script>

<SettingsCard
	title="Stockage & Quota Médias"
	description="Suivez votre consommation d'espace disque et gérez vos fichiers uploadés."
>
	<div class="quota-container">
		<div class="quota-header">
			<span class="quota-label">Utilisation du quota</span>
			<span class="quota-values">
				<strong>{formatBytes(currentUsedBytes)}</strong> / {formatBytes(quotaBytes)}
				<span class="percentage">({usedPercentage.toFixed(1)}%)</span>
			</span>
		</div>

		<div class="progress-bar-bg">
			<div
				class="progress-bar-fill"
				style="width: {usedPercentage}%; background-color: {progressColor};"
			></div>
		</div>

		<div class="quota-footer">
			<span class="remaining-text">
				Espace restant : <strong>{formatBytes(Math.max(0, quotaBytes - currentUsedBytes))}</strong>
			</span>
			<span class="quota-info">Limite par défaut : 2 Go (modifiable dans l'admin)</span>
		</div>

		{#if deviceStorage}
			<div class="device-storage-section">
				<div class="device-storage-header">
					<span class="device-storage-title">Stockage sur cet appareil</span>
					<button
						type="button"
						class="btn-clear-cache"
						onclick={handleClearAppCache}
						disabled={isClearingCache}
						title="Vider le cache hors-ligne et les données locales temporaires"
					>
						{isClearingCache
							? 'Nettoyage...'
							: cacheClearedFeedback
								? '✓ Cache vidé'
								: 'Vider le cache local'}
					</button>
				</div>

				<div class="stat-bubble compact">
					<span class="bubble-label">Données de l'app en cache</span>
					<strong class="bubble-value">{formatBytes(deviceStorage.usage)}</strong>
					<span class="bubble-sub">Images et ressources locales</span>
				</div>
			</div>
		{/if}
	</div>
</SettingsCard>

<style>
	.quota-container {
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding: 4px 0;
	}

	.quota-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.95rem;
		flex-wrap: wrap;
		gap: 8px;
	}

	.quota-label {
		color: #374151;
		font-weight: 500;
	}

	.quota-values {
		color: #4b5563;
	}

	.percentage {
		color: #6b7280;
		font-size: 0.85rem;
		margin-left: 4px;
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

	.quota-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.85rem;
		color: #6b7280;
		flex-wrap: wrap;
		gap: 8px;
	}

	.remaining-text strong {
		color: #111827;
	}

	.quota-info {
		font-style: italic;
	}

	.device-storage-section {
		margin-top: 6px;
		padding-top: 14px;
		border-top: 1px solid #f3f4f6;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.device-storage-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 8px;
	}

	.device-storage-title {
		font-size: 0.9rem;
		font-weight: 600;
		color: #1f2937;
	}

	.stat-bubble {
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 10px;
		padding: 12px 14px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.stat-bubble.compact {
		padding: 10px 14px;
	}

	.bubble-label {
		font-size: 0.8rem;
		color: #6b7280;
		font-weight: 500;
	}

	.bubble-value {
		font-size: 1.35rem;
		font-weight: 700;
		color: #111827;
		line-height: 1.2;
	}

	.bubble-sub {
		font-size: 0.75rem;
		color: #9ca3af;
	}

	.btn-clear-cache {
		background: #ffffff;
		border: 1px solid #d1d5db;
		color: #374151;
		font-size: 0.8rem;
		font-weight: 500;
		padding: 4px 10px;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-clear-cache:hover:not(:disabled) {
		background: #f3f4f6;
		border-color: #9ca3af;
	}

	.btn-clear-cache:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
