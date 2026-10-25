<script lang="ts">
	/**
	 * @component AdminAppearance
	 * @domain Admin / Appearance
	 * @description Panneau d'administration de l'apparence globale de l'instance
	 * @responsibilities
	 * - Orchestrer la gestion des packs d'icônes intégrés et personnalisés (AdminIconsManager)
	 * - Orchestrer la gestion et sélection des packs d'émojis par défaut (AdminEmojisManager)
	 */
	import type { EmojiSet, IconSet } from '$lib/types';
	import type { InstanceSettingsData } from '$lib/server/instanceSettings';
	import AdminIconsManager from './AdminIconsManager.svelte';
	import AdminEmojisManager from './AdminEmojisManager.svelte';

	interface Props {
		/** Configuration actuelle des paramètres de l'instance */
		instanceSettings: InstanceSettingsData;
		/** Liste des packs d'icônes publiés */
		publishedIconSets?: IconSet[];
		/** Liste des packs d'émojis publiés */
		publishedEmojiSets?: EmojiSet[];
	}

	let {
		instanceSettings,
		publishedIconSets = [],
		publishedEmojiSets = []
	}: Props = $props();
</script>

<div class="appearance-container">
	<AdminIconsManager {instanceSettings} {publishedIconSets} />
	<AdminEmojisManager {publishedEmojiSets} />
</div>

<style>
	.appearance-container {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}
</style>
