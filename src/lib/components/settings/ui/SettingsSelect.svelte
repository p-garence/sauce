<!-- src/lib/components/ui/settings/SettingsSelect.svelte -->
<script lang="ts">
	let {
		title,
		description = '',
		value = $bindable(''),
		name = '',
		options = []
	}: {
		title: string;
		description?: string;
		value?: string;
		name?: string;
		options: { value: string; label: string }[];
	} = $props();
</script>

<div class="setting-row">
	<div class="setting-text">
		<strong>{title}</strong>
		{#if description}<p>{description}</p>{/if}
	</div>
	<select bind:value {name} class="custom-select">
		{#each options as opt (opt.label)}
			<option value={opt.value}>{opt.label}</option>
		{/each}
	</select>
</div>

<style>
	.setting-row {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		padding: 12px 0;
		border-bottom: 1px solid #f1f5f9;
		gap: 8px;
	}
	@media (min-width: 480px) {
		.setting-row {
			flex-direction: row;
			justify-content: space-between;
			align-items: center;
		}
	}
	.setting-row:last-child {
		border-bottom: none;
	}

	.setting-text strong {
		display: block;
		font-size: 0.95rem;
		color: #1a1a1a;
		margin-bottom: 2px;
	}
	.setting-text p {
		font-size: 0.85rem;
		color: #64748b;
		margin: 0;
		line-height: 1.3;
	}

	.custom-select {
		padding: 10px;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		font-size: 0.95rem;
		background: #f8f9fa;
		cursor: pointer;
		flex-shrink: 0;
		min-width: 150px;
	}
	.custom-select:focus {
		outline: 2px solid #1a1a1a;
	}
</style>
