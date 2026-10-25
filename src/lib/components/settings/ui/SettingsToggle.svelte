<script lang="ts">
	let {
		title,
		description = '',
		checked = $bindable(false),
		name = '',
		onchange // 👈 1. On accepte la prop onchange
	}: {
		title: string;
		description?: string;
		checked?: boolean;
		name?: string;
		onchange?: (event: Event) => void; // 👈 2. On type l'événement
	} = $props();
</script>

<label class="setting-row">
	<div class="setting-text">
		<strong>{title}</strong>
		{#if description}<p>{description}</p>{/if}
	</div>
	<div class="switch">
		<!-- 👇 3. On transmet l'événement au vrai checkbox -->
		<input type="checkbox" bind:checked {name} {onchange} />
		<span class="slider"></span>
	</div>
</label>

<style>
	/* Votre CSS reste exactement le même */
	.setting-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 0;
		border-bottom: 1px solid #f1f5f9;
		cursor: pointer;
		gap: 16px;
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

	.switch {
		position: relative;
		width: 44px;
		height: 24px;
		flex-shrink: 0;
	}
	.switch input {
		opacity: 0;
		width: 0;
		height: 0;
		position: absolute;
	}
	.slider {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: #cbd5e1;
		transition: 0.4s;
		border-radius: 24px;
	}
	.slider:before {
		position: absolute;
		content: '';
		height: 18px;
		width: 18px;
		left: 3px;
		bottom: 3px;
		background-color: white;
		transition: 0.4s;
		border-radius: 50%;
	}
	input:checked + .slider {
		background-color: #10b981;
	}
	input:checked + .slider:before {
		transform: translateX(20px);
	}
</style>
