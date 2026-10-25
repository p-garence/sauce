<!--
  @component CustomAssetsMediaCard
  @domain settings/media
  @description Carte récapitulative de l'espace disque occupé par les packs d'icônes et d'émojis personnalisés.
  @responsibilities
    - Présenter la liste des packs d'icônes créés et leur poids
    - Présenter la liste des collections d'émojis créées et leur poids
    - Fournir les raccourcis de navigation vers les onglets de gestion dédiés
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import SettingsCard from '$lib/components/settings/ui/SettingsCard.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { formatBytes } from '$lib/utils/format';
	import type { UserMediaIconSetItem, UserMediaEmojiSetItem } from '$lib/server/media';

	/**
	 * Propriétés du composant CustomAssetsMediaCard
	 */
	interface Props {
		/** Packs d'icônes personnalisés de l'utilisateur */
		iconSets?: UserMediaIconSetItem[];
		/** Collections d'émojis personnalisées de l'utilisateur */
		emojiSets?: UserMediaEmojiSetItem[];
	}

	let { iconSets = [], emojiSets = [] }: Props = $props();
</script>

<SettingsCard
	title="Packs d'icônes & Collections d'emojis"
	description="Consultez l'espace disque occupé par vos créations d'icônes et d'emojis personnalisés."
>
	<div class="custom-assets-grid">
		<!-- Icon Sets -->
		<div class="asset-category-box">
			<div class="asset-category-header">
				<div class="asset-cat-title">
					<Icon name="status.palette" size={18} />
					<strong>Packs d'icônes ({iconSets.length})</strong>
				</div>
				<a href={resolve('/parametres?tab=icons')} class="link-manage">Gérer les icônes →</a>
			</div>
			{#if iconSets.length === 0}
				<p class="asset-empty">Aucun pack d'icônes personnalisé créé.</p>
			{:else}
				<div class="asset-items-list">
					{#each iconSets as set (set.id)}
						<div class="asset-row">
							<div class="asset-row-info">
								<span class="asset-name">{set.name}</span>
								<span class="asset-meta">{set.iconCount} icône{set.iconCount > 1 ? 's' : ''}</span>
							</div>
							<span class="asset-size">{formatBytes(set.totalSizeBytes)}</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Emoji Sets -->
		<div class="asset-category-box">
			<div class="asset-category-header">
				<div class="asset-cat-title">
					<Icon name="media.image" size={18} />
					<strong>Collections d'emojis ({emojiSets.length})</strong>
				</div>
				<a href={resolve('/parametres?tab=emojis')} class="link-manage">Gérer les emojis →</a>
			</div>
			{#if emojiSets.length === 0}
				<p class="asset-empty">Aucune collection d'emojis créée.</p>
			{:else}
				<div class="asset-items-list">
					{#each emojiSets as set (set.id)}
						<div class="asset-row">
							<div class="asset-row-info">
								<span class="asset-name">{set.name}</span>
								<span class="asset-meta">{set.emojiCount} emoji{set.emojiCount > 1 ? 's' : ''}</span
								>
							</div>
							<span class="asset-size">{formatBytes(set.totalSizeBytes)}</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</SettingsCard>

<style>
	.custom-assets-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 16px;
	}

	@media (min-width: 640px) {
		.custom-assets-grid {
			grid-template-columns: 1fr 1fr;
		}
	}

	.asset-category-box {
		padding: 14px;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.asset-category-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 8px;
	}

	.asset-cat-title {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.92rem;
		color: #0f172a;
	}

	.link-manage {
		font-size: 0.8rem;
		color: #0ea5e9;
		text-decoration: none;
		font-weight: 600;
	}

	.link-manage:hover {
		text-decoration: underline;
	}

	.asset-empty {
		font-size: 0.82rem;
		color: #94a3b8;
		font-style: italic;
		margin: 6px 0;
	}

	.asset-items-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.asset-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 6px 10px;
		background: #ffffff;
		border: 1px solid #f1f5f9;
		border-radius: 8px;
	}

	.asset-row-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.asset-name {
		font-size: 0.85rem;
		font-weight: 600;
		color: #1e293b;
	}

	.asset-meta {
		font-size: 0.75rem;
		color: #64748b;
	}

	.asset-size {
		font-size: 0.8rem;
		font-weight: 700;
		color: #475569;
	}
</style>
