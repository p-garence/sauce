<!--
  @component SearchInput
  @domain ui
  @description Champ de recherche réutilisable avec icône loupe et bouton d'effacement.
-->
<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	let {
		value = $bindable(''),
		placeholder = 'Rechercher...',
		isLoading = false,
		oninput,
		onclear
	}: {
		value?: string;
		placeholder?: string;
		isLoading?: boolean;
		oninput?: (e: Event) => void;
		onclear?: () => void;
	} = $props();

	function handleClear() {
		value = '';
		if (onclear) onclear();
	}
</script>

<div class="search-input-wrapper">
	<span class="search-icon" aria-hidden="true"><Icon name="action.search" size={16} /></span>
	<input type="text" {placeholder} bind:value {oninput} />
	{#if isLoading}
		<span class="loading-spinner" aria-label="Chargement"
			><Icon name="status.time" size={14} /></span
		>
	{:else if value}
		<button class="clear-btn" type="button" onclick={handleClear} aria-label="Effacer">
			<Icon name="action.close" size={14} />
		</button>
	{/if}
</div>

<style>
	.search-input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
		width: 100%;
	}

	.search-icon {
		position: absolute;
		left: 14px;
		color: #94a3b8;
		pointer-events: none;
	}

	.loading-spinner {
		position: absolute;
		right: 14px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		color: #94a3b8;
	}

	input {
		width: 100%;
		padding: 12px 40px;
		border: 1px solid #e2e8f0;
		border-radius: 24px;
		font-size: 1rem;
		outline: none;
		transition:
			border-color 0.2s,
			box-shadow 0.2s;
		background: #f8fafc;
	}

	input:focus {
		border-color: #0ea5e9;
		background: #fff;
		box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15);
	}

	.clear-btn {
		position: absolute;
		right: 14px;
		background: none;
		border: none;
		color: #94a3b8;
		font-size: 1rem;
		cursor: pointer;
		padding: 4px;
		border-radius: 50%;
		line-height: 1;
		transition: color 0.2s;
	}

	.clear-btn:hover {
		color: #475569;
	}
</style>
