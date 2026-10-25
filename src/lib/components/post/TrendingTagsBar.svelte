<!--
  @component TrendingTagsBar
  @domain post
  @description Ruban horizontal défilant des hashtags populaires.
-->
<script lang="ts">
	import type { TrendingTagItem } from '$lib/types';

	let {
		tags = [],
		selectedTags = [],
		max = 10,
		label = '',
		onTagClick
	}: {
		tags?: (string | TrendingTagItem)[];
		selectedTags?: string[];
		max?: number;
		label?: string;
		onTagClick: (tagName: string) => void;
	} = $props();

	// Normalise en objets { name, count }
	let normalizedTags = $derived(
		(tags || [])
			.map((t) => (typeof t === 'string' ? { name: t, count: undefined } : t))
			.slice(0, max)
	);

	function handleHorizontalScroll(e: WheelEvent) {
		if (e.deltaY !== 0 && !e.shiftKey) {
			const target = e.currentTarget as HTMLElement;
			const maxScroll = target.scrollWidth - target.clientWidth;
			if (maxScroll > 0) {
				const canScrollRight = e.deltaY > 0 && target.scrollLeft < maxScroll - 1;
				const canScrollLeft = e.deltaY < 0 && target.scrollLeft > 1;
				if (canScrollRight || canScrollLeft) {
					target.scrollLeft += e.deltaY;
					e.preventDefault();
				}
			}
		}
	}
</script>

{#if normalizedTags.length > 0}
	<div class="trending-tags-section">
		{#if label}
			<span class="trending-tags-label">{label}</span>
		{/if}

		<div class="trending-tags-list" onwheel={handleHorizontalScroll}>
			{#each normalizedTags as tag (tag.name)}
				{@const isSelected = selectedTags.includes(tag.name)}
				<button
					type="button"
					class="trending-tag-chip"
					class:selected={isSelected}
					onclick={() => onTagClick(tag.name)}
					title="{isSelected ? 'Retirer' : 'Ajouter'} #{tag.name}{tag.count !== undefined ? ` (${tag.count} post${tag.count > 1 ? 's' : ''})` : ''}"
				>
					#{tag.name}
					{#if tag.count !== undefined}
						<span class="tag-count">{tag.count}</span>
					{/if}
				</button>
			{/each}
		</div>
	</div>
{/if}

<style>
	.trending-tags-section {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin-top: 6px;
		width: 100%;
	}

	.trending-tags-label {
		font-size: 0.8rem;
		font-weight: 600;
		color: #64748b;
	}

	.trending-tags-list {
		display: flex;
		flex-wrap: nowrap;
		overflow-x: auto;
		gap: 6px;
		scrollbar-width: thin;
		scrollbar-color: #cbd5e1 transparent;
		overscroll-behavior-x: contain;
		-webkit-overflow-scrolling: touch;
		padding: 4px 2px 6px 2px;
	}

	.trending-tags-list::-webkit-scrollbar {
		height: 4px;
	}

	.trending-tags-list::-webkit-scrollbar-track {
		background: transparent;
	}

	.trending-tags-list::-webkit-scrollbar-thumb {
		background: #cbd5e1;
		border-radius: 4px;
	}

	.trending-tags-list::-webkit-scrollbar-thumb:hover {
		background: #94a3b8;
	}

	.trending-tag-chip {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px 10px;
		border-radius: 14px;
		border: 1px solid #cbd5e1;
		background: #ffffff;
		color: #334155;
		font-size: 0.8rem;
		font-weight: 500;
		cursor: pointer;
		white-space: nowrap;
		flex-shrink: 0;
		transition: all 0.15s ease;
	}

	.trending-tag-chip:hover {
		background: #f0f9ff;
		border-color: #7dd3fc;
		color: #0369a1;
	}

	.trending-tag-chip.selected {
		background: var(--primary, #0ea5e9);
		border-color: var(--primary, #0ea5e9);
		color: #ffffff;
		font-weight: 600;
	}

	.tag-count {
		font-size: 0.72rem;
		background: rgba(0, 0, 0, 0.08);
		padding: 1px 5px;
		border-radius: 8px;
		margin-left: 2px;
	}

	.trending-tag-chip.selected .tag-count {
		background: rgba(255, 255, 255, 0.25);
		color: #ffffff;
	}
</style>
