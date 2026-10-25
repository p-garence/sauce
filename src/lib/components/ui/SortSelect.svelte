<!--
  @component SortSelect
  @domain ui
  @description Sélecteur déroulant de mode de tri des publications.
-->
<script lang="ts">
	let {
		value = $bindable(),
		options = [],
		onChange = undefined // 👈 On utilise un nom de prop personnalisé
	}: {
		value?: string;
		options?: { value: string; label: string }[];
		onChange?: () => void;
	} = $props();

	function handleNativeChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		value = target.value; // 1. On met à jour la variable liée ($state)
		if (onChange) onChange(); // 2. On déclenche le fetchPosts du parent
	}
</script>

<!-- On utilise {value} au lieu de bind:value pour contrôler manuellement l'ordre -->
<select class="sort-select" {value} onchange={handleNativeChange}>
	{#each options as opt (opt)}
		<option value={opt.value}>{opt.label}</option>
	{/each}
</select>

<style>
	.sort-select {
		padding: 6px 12px;
		border-radius: 16px;
		border: 1px solid #e2e8f0;
		background: #f8fafc;
		font-size: 0.85rem;
		font-weight: 600;
		color: #475569;
		cursor: pointer;
		outline: none;
		transition: border-color 0.2s;
	}
	.sort-select:focus {
		border-color: var(--primary, #0ea5e9);
		background: #ffffff;
	}
</style>
