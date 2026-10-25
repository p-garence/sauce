<!-- src/lib/components/ui/settings/SettingsButton.svelte -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	let {
		href = undefined,
		variant = 'primary',
		type = 'button',
		disabled = false,
		onclick = undefined,
		children
	}: {
		href?: string;
		variant?: 'primary' | 'secondary' | 'danger' | 'info';
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
		onclick?: (e: MouseEvent) => void;
		children: Snippet;
	} = $props();
</script>

{#if href}
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
	<a {href} class="btn {variant}">{@render children()}</a>
{:else}
	<button {type} class="btn {variant}" {onclick} {disabled}>{@render children()}</button>
{/if}

<style>
	.btn {
		display: block;
		width: 100%;
		text-align: center;
		padding: 12px;
		border-radius: 8px;
		font-weight: 600;
		text-decoration: none;
		cursor: pointer;
		border: 1px solid transparent;
		font-size: 1rem;
		transition: all 0.2s ease;
		font-family: inherit;
	}
	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	.primary {
		background: #1a1a1a;
		color: white;
	}
	.secondary {
		background: white;
		color: #1a1a1a;
		border-color: #eaeaea;
	}
	.secondary:hover {
		background: #f9fafb;
	}
	.danger {
		background: white;
		color: #dc2626;
		border-color: #dc2626;
	}
	.danger:hover {
		background: #fef2f2;
	}
	.info {
		background: #eff6ff;
		color: #2563eb;
		border-color: #bfdbfe;
	}
</style>
