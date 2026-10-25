<!--
  @component StoryProgressBar
  @domain stories
  @description Barres de progression segmentées en haut du lecteur de stories indiquant le slide actif et le nombre de stories dans le bundle.
  @responsibilities
    - Afficher une barre segmentée pour chaque story du bundle actif
    - Indiquer visuellement les stories déjà passées et la story courante (100% fill)
-->
<script lang="ts">
	interface Props {
		stories: Array<{ id: string }>;
		currentIndex: number;
	}

	let { stories = [], currentIndex = 0 }: Props = $props();
</script>

<div class="progress-bar-container">
	{#each stories as item, i (item.id)}
		<div class="progress-segment">
			<div class="progress-fill" style="width: {i <= currentIndex ? 100 : 0}%;"></div>
		</div>
	{/each}
</div>

<style>
	.progress-bar-container {
		position: absolute;
		top: 10px;
		left: 10px;
		right: 10px;
		display: flex;
		gap: 4px;
		z-index: 30;
	}

	.progress-segment {
		flex: 1;
		height: 2.5px;
		background: rgba(255, 255, 255, 0.35);
		border-radius: 2px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: #fff;
		transition: width 0.15s ease;
	}
</style>
