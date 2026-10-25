<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHeader from '$lib/components/navigation/PageHeader.svelte';
	import Post from '$lib/components/post/Post.svelte'; // Votre composant existant !
	import Icon from '$lib/components/ui/Icon.svelte';

	let { data } = $props();
</script>

<div class="single-post-page">
	<!-- Le PageHeader permet de revenir au flux ou au profil -->
	<PageHeader title="Publication" back_location="/" />

	<main class="post-container">
		<!-- 👇 ON VÉRIFIE SI LE POST EXISTE ENCORE -->
		{#if data.post}
			<Post post={data.post} />
		{:else}
			<div class="not-found-message">
				<span class="icon"><Icon name="action.delete" size={32} /></span>
				<h2>Post introuvable</h2>
				<p>Cette publication a été supprimée ou n'existe pas.</p>
				<a href={resolve('/flux')} class="btn-home">Retour au flux</a>
			</div>
		{/if}
	</main>
</div>

<style>
	.single-post-page {
		width: 100%;
		max-width: var(--max-content-width, 600px);
		margin: 0 auto;
		background: var(--bg-surface, #ffffff);
		flex: 1;

		/* Espace en bas pour la navigation mobile */
		padding-bottom: calc(var(--nav-height, 60px) + env(safe-area-inset-bottom) + 20px);
	}

	.post-container {
		/* Permet au composant Post de ne pas être collé aux bords sur certains écrans */
		width: 100%;
	}

	.not-found-message {
		padding: 64px 20px;
		text-align: center;
		color: #475569;
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	.not-found-message .icon {
		font-size: 3rem;
		margin-bottom: 16px;
		display: block;
	}
	.not-found-message h2 {
		margin: 0 0 8px 0;
		color: #1e293b;
	}
	.not-found-message p {
		margin: 0 0 24px 0;
		color: #64748b;
	}

	.btn-home {
		background: #0ea5e9;
		color: white;
		text-decoration: none;
		padding: 10px 20px;
		border-radius: 8px;
		font-weight: bold;
	}
</style>
