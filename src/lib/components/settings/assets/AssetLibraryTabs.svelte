<!--
  @component AssetLibraryTabs
  @domain settings/assets
  @description Barre d'onglets pour basculer entre les créations personnelles et les packs sauvegardés d'autres utilisateurs.
  @responsibilities
    - Afficher les deux onglets « Mes créations » et « Sauvegardés »
    - Afficher le badge de comptage pour chaque catégorie
    - Déclencher le changement d'onglet actif
-->
<script lang="ts">
	/**
	 * Propriétés du composant AssetLibraryTabs
	 */
	interface Props {
		/** Onglet actuellement actif */
		activeTab: 'owned' | 'saved';
		/** Nombre de créations détenues */
		ownedCount: number;
		/** Nombre de collections ou packs sauvegardés */
		savedCount: number;
		/** Libellé optionnel de l'élément (ex: "Packs", "Collections") */
		itemLabel?: string;
		/** Callback lors du changement d'onglet */
		onTabChange: (tab: 'owned' | 'saved') => void;
	}

	let { activeTab, ownedCount, savedCount, itemLabel = 'Packs', onTabChange }: Props = $props();
</script>

<div class="asset-tabs-bar">
	<button
		type="button"
		class="tab-btn"
		class:active={activeTab === 'owned'}
		onclick={() => onTabChange('owned')}
	>
		Mes {itemLabel}
		<span class="count-badge">{ownedCount}</span>
	</button>
	<button
		type="button"
		class="tab-btn"
		class:active={activeTab === 'saved'}
		onclick={() => onTabChange('saved')}
	>
		Sauvegardés
		<span class="count-badge">{savedCount}</span>
	</button>
</div>

<style>
	.asset-tabs-bar {
		display: flex;
		gap: 8px;
		margin-bottom: 16px;
		border-bottom: 1px solid #e2e8f0;
		padding-bottom: 8px;
	}

	.tab-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 14px;
		border-radius: 20px;
		border: 1px solid #e2e8f0;
		background: #ffffff;
		color: #475569;
		font-size: 0.85rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.tab-btn:hover {
		background: #f1f5f9;
		color: #0f172a;
	}

	.tab-btn.active {
		background: #0ea5e9;
		color: #ffffff;
		border-color: #0ea5e9;
	}

	.count-badge {
		font-size: 0.75rem;
		padding: 1px 6px;
		border-radius: 10px;
		background: rgba(0, 0, 0, 0.08);
		font-weight: 600;
	}

	.tab-btn.active .count-badge {
		background: rgba(255, 255, 255, 0.25);
		color: #ffffff;
	}
</style>
