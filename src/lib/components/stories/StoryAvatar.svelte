<!--
  @component StoryAvatar
  @domain stories
  @description Avatar utilisateur entouré d'un anneau indiquant la présence de stories actives/non-vues.
-->
<script lang="ts">
	interface Props {
		image?: string | null;
		username?: string | null;
		size?: number;
		borderWidth?: number;
		hasStory?: boolean;
		unviewed?: boolean;
		groupRing?: boolean;
		groupColor?: string | null;
		onclick?: ((e: MouseEvent) => void) | null;
		title?: string;
		class?: string;
	}

	let {
		image = null,
		username = '?',
		size = 62,
		borderWidth = 2.5,
		hasStory = false,
		unviewed = false,
		groupRing = false,
		groupColor = null,
		onclick = null,
		title,
		class: className = ''
	}: Props = $props();

	let containerStyle = $derived.by(() => {
		const styles: string[] = [`width: ${size}px`, `height: ${size}px`, `--avatar-size: ${size}px`];
		if (groupColor) {
			styles.push(`--group-color: ${groupColor}`);
		}
		return styles.join('; ');
	});

	let ringStyle = $derived(hasStory ? `padding: ${borderWidth}px;` : 'padding: 0;');
</script>

{#if onclick && (hasStory || onclick !== null)}
	<button
		type="button"
		class="story-avatar-btn {className}"
		class:has-story={hasStory}
		class:unviewed={hasStory && unviewed}
		class:group-ring={hasStory && unviewed && groupRing}
		style={containerStyle}
		{onclick}
		{title}
		aria-label={title || (hasStory ? `Voir la story de ${username}` : `Avatar de ${username}`)}
	>
		<div class="avatar-ring" style={ringStyle}>
			<div class="avatar-inner">
				{#if image}
					<img src={image} alt="Avatar de {username}" />
				{:else}
					<div class="avatar-placeholder">
						{username?.charAt(0).toUpperCase() || '?'}
					</div>
				{/if}
			</div>
		</div>
	</button>
{:else}
	<div
		class="story-avatar-container {className}"
		class:has-story={hasStory}
		class:unviewed={hasStory && unviewed}
		class:group-ring={hasStory && unviewed && groupRing}
		style={containerStyle}
		{title}
		role="img"
		aria-label={title || `Avatar de ${username}`}
	>
		<div class="avatar-ring" style={ringStyle}>
			<div class="avatar-inner">
				{#if image}
					<img src={image} alt="Avatar de {username}" />
				{:else}
					<div class="avatar-placeholder">
						{username?.charAt(0).toUpperCase() || '?'}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.story-avatar-btn {
		position: relative;
		border: none;
		background: transparent;
		padding: 0;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		outline: none;
		user-select: none;
		flex-shrink: 0;
		transition: transform 0.15s ease;
	}

	.story-avatar-btn.has-story {
		cursor: pointer;
	}

	.story-avatar-btn.has-story:hover {
		transform: scale(1.03);
	}

	.story-avatar-btn.has-story:active {
		transform: scale(0.96);
	}

	.story-avatar-container {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		user-select: none;
		flex-shrink: 0;
	}

	.avatar-ring {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		background: transparent;
		transition:
			background 0.2s ease,
			transform 0.15s ease;
	}

	/* Anneau Story Non vue : Dégradé vif façon Insta */
	.has-story.unviewed .avatar-ring {
		background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888);
	}

	/* Anneau Story Groupe spécial : Couleur personnalisée */
	.has-story.unviewed.group-ring .avatar-ring {
		background: var(--group-color, #10b981);
	}

	/* Anneau Story Déjà vue : Anneau neutre discret */
	.has-story:not(.unviewed) .avatar-ring {
		background: #9ca3af;
	}

	.avatar-inner {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		overflow: hidden;
		background: var(--bg-surface, #fff);
		box-sizing: border-box;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* Si a une story, bordure de séparation avec l'anneau */
	.has-story .avatar-inner {
		border: 2px solid var(--bg-surface, #fff);
	}

	/* Si pas de story, bordure standard */
	:not(.has-story) .avatar-inner {
		border: 2px solid var(--border-color, #eaeaea);
	}

	.avatar-inner img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.avatar-placeholder {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--bg-default, #f0f0f0);
		color: var(--text-muted, #666);
		font-weight: 700;
		font-size: calc(var(--avatar-size, 62px) * 0.4);
		text-transform: uppercase;
	}
</style>
