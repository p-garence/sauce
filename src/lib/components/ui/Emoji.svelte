<!--
  @component Emoji
  @domain ui
  @description Composant unifié pour l'affichage d'un émoji personnalisé.
  @responsibilities
    - Rendre l'image de l'émoji sans fond parasite ni bordure
    - Adapter la taille en pixel ou unité CSS (em, rem)
    - Garantir la transparence naturelle et l'accessibilité
-->
<script lang="ts">
	interface Props {
		/** URL de l'image de l'émoji */
		src: string;
		/** Nom ou identifiant de l'émoji (pour alt et title) */
		name?: string;
		/** Taille (nombre en px ou chaîne CSS: "24px", "1.35em", etc.) */
		size?: number | string;
		/** Classe CSS additionnelle */
		class?: string;
		/** Style CSS inline additionnel */
		style?: string;
		/** Mode de chargement de l'image */
		loading?: 'lazy' | 'eager';
	}

	let {
		src,
		name = '',
		size,
		class: className = '',
		style: customStyle = '',
		loading = 'lazy'
	}: Props = $props();

	let formattedSize = $derived.by(() => {
		if (size === undefined || size === null) return null;
		return typeof size === 'number' ? `${size}px` : size;
	});

	let inlineStyle = $derived.by(() => {
		const parts: string[] = [];
		if (formattedSize) {
			parts.push(`width: ${formattedSize}`, `height: ${formattedSize}`);
		}
		if (customStyle) {
			parts.push(customStyle);
		}
		return parts.join('; ');
	});
</script>

<img
	{src}
	alt={name ? `:${name}:` : ''}
	title={name ? `:${name}:` : ''}
	class="app-emoji {className}"
	style={inlineStyle || undefined}
	{loading}
	draggable="false"
/>

<style>
	.app-emoji {
		display: inline-block;
		vertical-align: middle;
		object-fit: contain;
		border: none;
		background: transparent;
		border-radius: 0;
		padding: 0;
		margin: 0;
		flex-shrink: 0;
	}
</style>
