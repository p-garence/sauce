<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	let { children } = $props();
</script>

<div class="vitrine-layout">
	<nav class="top-nav">
		<div class="tabs">
			<a href={resolve('/')} class:active={page.url.pathname === '/'}>Accueil</a>
			<a href={resolve('/calendrier')} class:active={page.url.pathname === '/calendrier'}
				>Calendrier</a
			>
		</div>
		<div class="auth-tab">
			<a href={resolve('/login')} class="login-tab">Connexion</a>
		</div>
	</nav>

	<main class="content">
		{@render children()}
	</main>
</div>

<style>
	.vitrine-layout {
		/* 100dvh (Dynamic Viewport Height) : s'adapte à l'apparition/disparition 
           de la barre d'adresse du navigateur mobile, contrairement à 100vh */
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
	}

	.content {
		flex: 1;
		/* Évite que le contenu pousse l'écran en largeur (scroll horizontal) */
		min-width: 0;
		width: 100%;
	}

	.top-nav {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0 16px;
		/* safe-area-inset-top gère l'encoche (notch) sur les mobiles récents */
		padding-top: env(safe-area-inset-top);
		height: max-content;
		min-height: 60px;
		background: white;
		border-bottom: 1px solid #eaeaea;
		position: sticky;
		top: 0;
		z-index: 100;
	}

	.tabs {
		display: flex;
		gap: 4px; /* Réduit un peu pour les tout petits écrans */
		align-items: center;
	}

	.top-nav a {
		text-decoration: none;
		color: #666;
		font-weight: 500;
		/* On utilise max-content pour que le texte ne se coupe pas */
		font-size: 0.9rem;
		padding: 8px 12px;
		border-radius: 6px;
		-webkit-tap-highlight-color: transparent;
	}

	.top-nav a.active {
		color: #1a1a1a;
		background-color: #f0f0f0;
	}
</style>
