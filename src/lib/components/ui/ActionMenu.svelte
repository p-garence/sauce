<!--
  @component ActionMenu
  @domain ui
  @description Menu contextuel déroulant (3 points) avec actions dynamiques et icônes.
-->
<script lang="ts">
	import type { MenuAction } from '$lib/types';
	import Icon from '$lib/components/ui/Icon.svelte';

	let {
		actions,
		direction = 'auto'
	}: {
		actions: MenuAction[];
		direction?: 'auto' | 'up' | 'down';
	} = $props();

	let isOpen = $state(false);
	let openUpwards = $state(false);
	let menuMaxHeight = $state<number | null>(null);
	let buttonRef = $state<HTMLButtonElement | null>(null);

	function toggleMenu(e: MouseEvent) {
		e.stopPropagation();
		e.preventDefault();
		if (!isOpen) {
			if (buttonRef) {
				const rect = buttonRef.getBoundingClientRect();
				const scrollParent = buttonRef.closest(
					'.messages-container, .scroll-container, [data-scroll-container]'
				);
				let spaceBelow = window.innerHeight - rect.bottom;
				let spaceAbove = rect.top;

				if (scrollParent) {
					const parentRect = scrollParent.getBoundingClientRect();
					spaceBelow = Math.min(spaceBelow, parentRect.bottom - rect.bottom);
					spaceAbove = Math.min(spaceAbove, rect.top - parentRect.top);
				}

				if (direction === 'up') {
					openUpwards = spaceAbove >= 120 || spaceAbove >= spaceBelow;
				} else if (direction === 'down') {
					openUpwards = false;
				} else {
					const estimatedMenuHeight = 180;
					openUpwards =
						spaceBelow < estimatedMenuHeight &&
						spaceAbove > spaceBelow &&
						spaceAbove >= 140;
				}

				const availableSpace = openUpwards ? spaceAbove : spaceBelow;
				menuMaxHeight = Math.floor(Math.max(100, availableSpace - 12));
			} else {
				openUpwards = direction === 'up';
				menuMaxHeight = null;
			}
		}
		isOpen = !isOpen;
	}

	function closeMenu() {
		isOpen = false;
	}

	function handleAction(e: MouseEvent, action: MenuAction) {
		e.stopPropagation();
		e.preventDefault();
		closeMenu();
		action.onClick();
	}
</script>

<div class="menu-wrapper">
	<button
		bind:this={buttonRef}
		class="btn-more"
		onclick={toggleMenu}
		aria-label="Plus d'options"
	>
		<Icon name="action.menu" size={18} />
	</button>

	{#if isOpen}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="menu-overlay" onclick={closeMenu}></div>

		<div
			class="dropdown-menu"
			class:up={openUpwards}
			style={menuMaxHeight ? `max-height: ${menuMaxHeight}px;` : ''}
		>
			{#each actions as action, i (i)}
				<button
					class="menu-item {action.variant === 'danger' ? 'danger' : ''}"
					onclick={(e) => handleAction(e, action)}
				>
					{action.label}
				</button>

				{#if action.dividerBelow}
					<hr class="menu-divider" />
				{/if}
			{/each}
		</div>
	{/if}
</div>

<style>
	.menu-wrapper {
		position: relative;
	}

	/* 👇 CORRECTION : Cercle parfait avec width/height fixes et flexbox */
	.btn-more {
		background: none;
		border: none;
		font-size: 1.2rem;
		color: #64748b;
		cursor: pointer;
		width: 34px;
		height: 34px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		transition:
			background 0.2s,
			color 0.2s;
	}
	.btn-more:hover {
		background: #e2e8f0;
		color: #1e293b;
	}

	.menu-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 199;
	}

	.dropdown-menu {
		position: absolute;
		top: 100%;
		right: 0;
		margin-top: 4px;
		background: white;
		border: 1px solid #eaeaea;
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		min-width: 170px;
		overflow-y: auto;
		overflow-x: hidden;
		z-index: 200;
		display: flex;
		flex-direction: column;
	}

	.dropdown-menu.up {
		top: auto;
		bottom: 100%;
		margin-top: 0;
		margin-bottom: 4px;
	}

	.menu-item {
		width: 100%;
		text-align: left;
		padding: 12px 16px;
		border: none;
		background: none;
		cursor: pointer;
		font-size: 0.95rem;
		display: flex;
		align-items: center;
		gap: 12px;
		color: #1a1a1a;
		transition: background 0.2s;
	}
	.menu-item:hover {
		background: #f8fafc;
	}
	.menu-item.danger {
		color: #ef4444;
		font-weight: 500;
	}
	.menu-item.danger:hover {
		background: #fef2f2;
	}

	.menu-divider {
		border: none;
		border-top: 1px solid #eaeaea;
		margin: 0;
	}
</style>
