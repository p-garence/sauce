<!-- src/lib/components/settings/ui/SettingsRow.svelte -->
<script lang="ts">
	/**
	 * @component SettingsRow
	 * @domain settings/ui
	 * @description Ligne de paramètre affichant un libellé, une valeur courante et une action optionnelle (ex: bouton modifier).
	 */
	import type { Snippet } from 'svelte';

	let {
		title,
		value = undefined,
		description = undefined,
		action = undefined,
		children = undefined
	}: {
		title: string;
		value?: string;
		description?: string;
		action?: Snippet;
		children?: Snippet;
	} = $props();
</script>

<div class="settings-row">
	<div class="row-info">
		<span class="row-title">{title}</span>
		{#if value}
			<span class="row-value">{value}</span>
		{/if}
		{#if description}
			<p class="row-desc">{description}</p>
		{/if}
		{#if children}
			{@render children()}
		{/if}
	</div>
	{#if action}
		<div class="row-action">
			{@render action()}
		</div>
	{/if}
</div>

<style>
	.settings-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 14px 0;
		border-bottom: 1px solid #f1f5f9;
		gap: 16px;
	}
	.settings-row:last-child {
		border-bottom: none;
	}
	.row-info {
		display: flex;
		flex-direction: column;
		gap: 3px;
		flex: 1;
		min-width: 0;
	}
	.row-title {
		font-size: 0.95rem;
		font-weight: 600;
		color: #1e293b;
	}
	.row-value {
		font-size: 0.92rem;
		color: #475569;
		word-break: break-all;
	}
	.row-desc {
		font-size: 0.8rem;
		color: #64748b;
		margin: 2px 0 0 0;
		line-height: 1.35;
	}
	.row-action {
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}
</style>
