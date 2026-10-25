<!-- src/routes/admin-setup/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';

	let { form } = $props();
	let loading = $state(false);
</script>

<main class="setup-container">
	<div class="card">
		<h1>🛠️ Initialisation du serveur</h1>
		<p>Bienvenue sur votre nouvelle instance. Veuillez créer le compte administrateur fondateur.</p>

		<!-- On utilise use:enhance pour que le rechargement soit fluide sans rafraîchir la page -->
		<form
			method="POST"
			use:enhance={() => {
				loading = true;
				return async ({ update }) => {
					await update();
					loading = false;
				};
			}}
		>
			{#if form?.message}
				<div class="error-box">{form.message}</div>
			{/if}

			<div class="input-group">
				<label for="username">Nom d'utilisateur</label>
				<input id="username" name="username" type="text" required />
			</div>

			<div class="input-group">
				<label for="identifier">Email</label>
				<!-- On ajoute l'attribut "name" pour que le serveur puisse lire la valeur -->
				<input id="identifier" name="identifier" type="text" required />
			</div>

			<div class="input-group">
				<label for="secretKey">Clé d'accès (8 caractères minimum)</label>
				<input id="secretKey" name="secretKey" type="password" required minlength="8" />
			</div>

			<button type="submit" disabled={loading}>
				{loading ? 'Création...' : 'Créer le réseau'}
			</button>
		</form>
	</div>
</main>

<style>
	.setup-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 100vh;
		background-color: #fafafa;
		padding: 16px;
	}
	.card {
		background: white;
		padding: 32px;
		border-radius: 12px;
		border: 1px solid #eaeaea;
		width: 100%;
		max-width: 400px;
	}
	h1 {
		margin-top: 0;
		font-size: 1.5rem;
	}
	p {
		color: #666;
		margin-bottom: 24px;
		font-size: 0.95rem;
	}
	.error-box {
		background: #fee2e2;
		color: #dc2626;
		padding: 12px;
		border-radius: 6px;
		margin-bottom: 16px;
	}
	.input-group {
		margin-bottom: 16px;
	}
	label {
		display: block;
		margin-bottom: 8px;
		font-weight: 500;
		font-size: 0.9rem;
	}
	input {
		width: 100%;
		padding: 10px;
		border: 1px solid #ccc;
		border-radius: 6px;
		font-size: 1rem;
		box-sizing: border-box;
	}
	button {
		width: 100%;
		padding: 14px;
		background: #1a1a1a;
		color: white;
		border: none;
		border-radius: 6px;
		font-weight: bold;
		font-size: 1rem;
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}
</style>
