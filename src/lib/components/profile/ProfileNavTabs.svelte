<script lang="ts">
	/**
	 * @component ProfileNavTabs
	 * @domain Profile
	 * @description Onglets de navigation entre les publications et favoris sur son propre profil
	 * @responsibilities
	 * - Proposer l'alternance entre l'onglet Publications et Favoris
	 * - Notifier le parent du changement d'onglet actif
	 */
	interface Props {
		/** Onglet actif sélectionné */
		activeTab: 'posts' | 'likes';
		/** Callback déclenché lors du changement d'onglet */
		onTabChange: (tab: 'posts' | 'likes') => void;
	}

	let { activeTab, onTabChange }: Props = $props();
</script>

<div class="profile-tabs">
	<button
		type="button"
		class="tab-btn {activeTab === 'posts' ? 'active' : ''}"
		onclick={() => onTabChange('posts')}
	>
		Publications
	</button>
	<button
		type="button"
		class="tab-btn {activeTab === 'likes' ? 'active' : ''}"
		onclick={() => onTabChange('likes')}
	>
		Favoris
	</button>
</div>

<style>
	.profile-tabs {
		display: flex;
		border-bottom: 1px solid var(--border-color, #eaeaea);
		margin-top: 8px;
	}
	.tab-btn {
		flex: 1;
		background: none;
		border: none;
		padding: 14px;
		font-size: 0.95rem;
		font-weight: bold;
		color: var(--text-muted, #94a3b8);
		cursor: pointer;
		border-bottom: 2px solid transparent;
		transition: all 0.2s;
	}
	.tab-btn.active {
		color: var(--text-default, #1e293b);
		border-bottom-color: var(--text-default, #1e293b);
	}
	.tab-btn:hover:not(.active) {
		color: var(--text-muted, #64748b);
		background: var(--bg-default, #f8fafc);
	}
</style>
