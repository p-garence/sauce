<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { onMount } from 'svelte';
	import '../app.css';
	import MediaEditorModal from '$lib/components/media-editor/MediaEditorModal.svelte';
	let { children } = $props();

	onMount(() => {
		sessionStorage.setItem('app_navigated', 'false');
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.register('/service-worker.js').catch((err) => {
				console.error('[SW] Erreur enregistrement:', err);
			});
		}
	});

	afterNavigate(({ from }) => {
		if (from) {
			sessionStorage.setItem('app_navigated', 'true');
		}
	});
</script>

<MediaEditorModal />
{@render children()}

<style>
	/* 1. Le correctif magique pour les tailles : 
       Le padding est inclus dans la taille finale au lieu de s'y ajouter */
	:global(*),
	:global(*::before),
	:global(*::after) {
		box-sizing: border-box;
	}

	/* 2. On verrouille le body pour le mobile */
	:global(html),
	:global(body) {
		margin: 0;
		padding: 0;

		/* Interdit formellement à l'appli de déborder sur les côtés */
		max-width: 100vw;
		overflow-x: hidden;

		/* Empêche les tailles de polices bizarres quand on tourne le téléphone */
		-webkit-text-size-adjust: 100%;

		background-color: #fafafa;
		font-family:
			-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
	}

	/* 3. Comportement des médias sur mobile (évite qu'une image soit plus large que l'écran) */
	:global(img),
	:global(video) {
		max-width: 100%;
		height: auto;
	}
</style>
