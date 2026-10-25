<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';

	let { form } = $props();

	// Modes : 'login' ou 'register'
	let mode = $state<'login' | 'register'>('login');

	// États de connexion
	let identifier = $state('');
	let secretKey = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleLogin(e: Event) {
		e.preventDefault();
		loading = true;
		error = '';

		const { error: err } = await authClient.signIn.email({
			email: identifier,
			password: secretKey
		});

		if (err) {
			error = 'Identifiant ou mot de passe incorrect.';
		} else {
			window.location.href = resolve('/');
		}
		loading = false;
	}
</script>

<main class="auth-container">
	<a href={resolve('/')} class="back-link">← Retour à l'accueil</a>

	<div class="auth-box">
		<div class="tabs">
			<button type="button" class:active={mode === 'login'} onclick={() => (mode = 'login')}>
				Connexion
			</button>
			<button type="button" class:active={mode === 'register'} onclick={() => (mode = 'register')}>
				J'ai une clé
			</button>
		</div>

		{#if mode === 'login'}
			<form onsubmit={handleLogin} class="auth-form">
				<h2>Bon retour</h2>
				{#if error}<div class="error-box">{error}</div>{/if}

				<div class="input-group">
					<label for="identifier">Email</label>
					<input id="identifier" type="email" bind:value={identifier} required />
				</div>
				<div class="input-group">
					<label for="secretKey">Mot de passe</label>
					<input id="secretKey" type="password" bind:value={secretKey} required />
				</div>
				<button type="submit" disabled={loading}>
					{loading ? 'Chargement...' : 'Se connecter'}
				</button>
			</form>
		{:else}
			<form
				method="POST"
				action="?/registerWithKey"
				class="auth-form"
				use:enhance={() => {
					loading = true;
					return async ({ update }) => {
						try {
							// LE FIX EST ICI : reset: false empêche d'effacer le mot de passe
							await update({ reset: false });
						} finally {
							// finally garantit que le bouton redeviendra cliquable, quoi qu'il arrive
							loading = false;
						}
					};
				}}
			>
				<h2>Rejoindre le réseau</h2>

				{#if form?.message}<div class="error-box">{form.message}</div>{/if}

				<div class="input-group">
					<label for="inviteKey">Clé d'invitation (Obligatoire)</label>
					<input id="inviteKey" name="inviteKey" type="text" placeholder="INV-XXXXX" required />
				</div>
				<div class="input-group">
					<label for="username">Nom d'utilisateur</label>
					<input id="username" name="username" type="text" required />
				</div>
				<div class="input-group">
					<label for="email">Email</label>
					<input id="email" name="email" type="email" required />
				</div>
				<div class="input-group">
					<label for="password">Mot de passe</label>
					<input id="password" name="password" type="password" minlength="8" required />
				</div>

				<button type="submit" disabled={loading}>
					{loading ? 'Création...' : 'Créer mon compte'}
				</button>
			</form>
		{/if}
	</div>
</main>

<style>
	.auth-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 40px 16px;
		min-height: 100vh;
		background: #fafafa;
	}
	.auth-box {
		background: white;
		padding: 32px;
		border-radius: 12px;
		border: 1px solid #eaeaea;
		width: 100%;
		max-width: 400px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
	}

	.tabs {
		display: flex;
		margin-bottom: 24px;
		border-bottom: 2px solid #eaeaea;
	}
	.tabs button {
		flex: 1;
		background: none;
		border: none;
		padding: 12px;
		font-weight: bold;
		color: #999;
		cursor: pointer;
		border-bottom: 2px solid transparent;
		margin-bottom: -2px;
	}
	.tabs button.active {
		color: #1a1a1a;
		border-bottom-color: #1a1a1a;
	}

	.auth-form {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.auth-form h2 {
		margin: 0 0 8px 0;
		font-size: 1.5rem;
		text-align: center;
	}
	.error-box {
		background-color: #fee2e2;
		color: #dc2626;
		padding: 12px;
		border-radius: 6px;
		font-size: 0.9rem;
	}
	.input-group label {
		display: block;
		margin-bottom: 6px;
		font-weight: 500;
		font-size: 0.9rem;
	}
	.input-group input {
		width: 100%;
		padding: 12px;
		border: 1px solid #ccc;
		border-radius: 6px;
		font-size: 1rem;
		box-sizing: border-box;
	}
	button[type='submit'] {
		padding: 14px;
		background-color: #1a1a1a;
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 1rem;
		font-weight: bold;
		cursor: pointer;
		margin-top: 8px;
	}
	button:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}
	.back-link {
		align-self: flex-start;
		margin-bottom: 20px;
		color: #666;
		text-decoration: none;
		font-weight: bold;
	}
	.back-link:hover {
		color: #1a1a1a;
	}
</style>
