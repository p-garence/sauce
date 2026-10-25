<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';

	let { form } = $props();

	// Modes : 'login' | 'register' | 'forgot'
	let mode = $state<'login' | 'register' | 'forgot'>('login');

	// États de connexion
	let identifier = $state('');
	let secretKey = $state('');
	let error = $state('');
	let loading = $state(false);

	// États de réinitialisation de mot de passe
	let forgotEmail = $state('');
	let forgotLoading = $state(false);
	let forgotSuccess = $state(false);
	let forgotError = $state('');

	async function handleLogin(e: Event) {
		e.preventDefault();
		const trimmedIdentifier = identifier.trim();
		const trimmedPassword = secretKey;

		if (!trimmedIdentifier || !trimmedPassword) {
			error = 'Veuillez renseigner votre email et votre mot de passe.';
			return;
		}

		// Si l'utilisateur a saisi un nom d'utilisateur au lieu d'un email
		if (!trimmedIdentifier.includes('@') || !trimmedIdentifier.includes('.')) {
			error = 'Veuillez saisir une adresse email valide (ex: exemple@domaine.com).';
			return;
		}

		loading = true;
		error = '';

		try {
			const res = await authClient.signIn.email({
				email: trimmedIdentifier,
				password: trimmedPassword
			});

			if (res?.error) {
				error = 'Identifiant ou mot de passe incorrect.';
			} else if (res?.data) {
				window.location.href = resolve('/');
			} else {
				error = 'Identifiant ou mot de passe incorrect.';
			}
		} catch (err: unknown) {
			console.error('Erreur lors de la connexion:', err);
			error = 'Identifiant ou mot de passe incorrect.';
		} finally {
			loading = false;
		}
	}

	async function handleRequestReset(e: Event) {
		e.preventDefault();
		if (!forgotEmail) return;
		forgotLoading = true;
		forgotError = '';
		forgotSuccess = false;

		try {
			const { error: err } = await authClient.requestPasswordReset({
				email: forgotEmail
			});
			if (err) {
				forgotError = err.message || 'Une erreur est survenue lors de la demande.';
			} else {
				forgotSuccess = true;
			}
		} catch {
			forgotError = 'Une erreur inattendue est survenue. Veuillez réessayer.';
		} finally {
			forgotLoading = false;
		}
	}
</script>

<main class="auth-container">
	<a href={resolve('/')} class="back-link">← Retour à l'accueil</a>

	<div class="auth-box">
		{#if mode !== 'forgot'}
			<div class="tabs">
				<button
					type="button"
					class:active={mode === 'login'}
					onclick={() => {
						mode = 'login';
						error = '';
					}}
				>
					Connexion
				</button>
				<button
					type="button"
					class:active={mode === 'register'}
					onclick={() => {
						mode = 'register';
						error = '';
					}}
				>
					J'ai une clé
				</button>
			</div>
		{/if}

		{#if mode === 'login'}
			<form onsubmit={handleLogin} class="auth-form" novalidate>
				<h2>Bon retour</h2>
				{#if error}<div class="error-box">{error}</div>{/if}

				<div class="input-group">
					<label for="identifier">Email</label>
					<input
						id="identifier"
						type="text"
						placeholder="nom@exemple.com"
						bind:value={identifier}
						autocomplete="email"
						required
					/>
				</div>
				<div class="input-group">
					<label for="secretKey">Mot de passe</label>
					<input
						id="secretKey"
						type="password"
						placeholder="••••••••"
						bind:value={secretKey}
						autocomplete="current-password"
						required
					/>
				</div>
				<div class="forgot-link-wrapper">
					<button
						type="button"
						class="link-btn"
						onclick={() => {
							mode = 'forgot';
							forgotEmail = identifier && identifier.includes('@') ? identifier : '';
							forgotSuccess = false;
							forgotError = '';
						}}
					>
						Mot de passe oublié ?
					</button>
				</div>
				<button type="submit" disabled={loading}>
					{loading ? 'Connexion en cours...' : 'Se connecter'}
				</button>
			</form>
		{:else if mode === 'forgot'}
			<form onsubmit={handleRequestReset} class="auth-form">
				<h2>Mot de passe oublié</h2>
				<p class="desc-text">
					Saisissez l'adresse e-mail associée à votre compte pour recevoir un lien de
					réinitialisation.
				</p>

				{#if forgotSuccess}
					<div class="info-box">
						Un e-mail vous a été envoyé si un compte correspond à cette adresse. Pensez à vérifier
						vos spams.
					</div>
				{/if}
				{#if forgotError}
					<div class="error-box">{forgotError}</div>
				{/if}

				{#if !forgotSuccess}
					<div class="input-group">
						<label for="forgotEmail">Email</label>
						<input id="forgotEmail" type="email" bind:value={forgotEmail} required />
					</div>
					<button type="submit" disabled={forgotLoading}>
						{forgotLoading ? 'Envoi en cours...' : 'Envoyer le lien de récupération'}
					</button>
				{/if}

				<div class="back-action-wrapper">
					<button
						type="button"
						class="link-btn"
						onclick={() => {
							mode = 'login';
							forgotSuccess = false;
							forgotError = '';
						}}
					>
						← Revenir à la connexion
					</button>
				</div>
			</form>
		{:else}
			<form
				method="POST"
				action="?/registerWithKey"
				class="auth-form"
				novalidate
				use:enhance={() => {
					loading = true;
					return async ({ update }) => {
						try {
							// reset: false empêche d'effacer les champs en cas d'erreur
							await update({ reset: false });
						} finally {
							loading = false;
						}
					};
				}}
			>
				<h2>Rejoindre le réseau</h2>

				{#if form?.message}<div class="error-box">{form.message}</div>{/if}

				<div class="input-group">
					<label for="inviteKey">Clé d'invitation (Obligatoire)</label>
					<input id="inviteKey" name="inviteKey" type="text" placeholder="Ex: INV-XXXXX" required />
				</div>
				<div class="input-group">
					<label for="username">Nom d'utilisateur</label>
					<input
						id="username"
						name="username"
						type="text"
						placeholder="Ex: alice"
						autocomplete="username"
						required
					/>
				</div>
				<div class="input-group">
					<label for="email">Email</label>
					<input
						id="email"
						name="email"
						type="email"
						placeholder="Ex: alice@domaine.com"
						autocomplete="email"
						required
					/>
				</div>
				<div class="input-group">
					<label for="password">Mot de passe (8 caractères minimum)</label>
					<input
						id="password"
						name="password"
						type="password"
						placeholder="Min. 8 caractères"
						autocomplete="new-password"
						required
					/>
				</div>

				<button type="submit" disabled={loading}>
					{loading ? 'Création en cours...' : 'Créer mon compte'}
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
	.forgot-link-wrapper {
		display: flex;
		justify-content: flex-end;
		margin-top: -6px;
	}
	.link-btn {
		background: none;
		border: none;
		padding: 0;
		color: #666;
		font-size: 0.85rem;
		text-decoration: underline;
		cursor: pointer;
	}
	.link-btn:hover {
		color: #1a1a1a;
	}
	.back-action-wrapper {
		display: flex;
		justify-content: center;
		margin-top: 8px;
	}
	.info-box {
		background-color: #ecfdf5;
		color: #065f46;
		padding: 12px;
		border-radius: 6px;
		font-size: 0.9rem;
		border: 1px solid #a7f3d0;
		line-height: 1.4;
	}
	.desc-text {
		font-size: 0.9rem;
		color: #666;
		line-height: 1.4;
		margin: 0 0 4px 0;
		text-align: center;
	}
</style>
