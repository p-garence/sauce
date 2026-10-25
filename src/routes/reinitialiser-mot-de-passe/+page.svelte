<script lang="ts">
	/**
	 * @component ReinitialiserMotDePassePage
	 * @domain auth
	 * @description Page de définition d'un nouveau mot de passe suite à la réception d'un lien de récupération par e-mail.
	 *
	 * @responsibilities
	 * - Récupérer le jeton secret (token) depuis les paramètres de l'URL.
	 * - Valider la conformité du nouveau mot de passe (taille minimale, confirmation identique).
	 * - Consommer le jeton via Better-Auth (authClient.resetPassword) et gérer l'invalidation / expiration.
	 * - Rediriger vers la page de connexion dès confirmation.
	 */

	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { authClient } from '$lib/auth-client';

	const token = $derived(page.url.searchParams.get('token') || '');

	let newPassword = $state('');
	let confirmPassword = $state('');
	let error = $state('');
	let success = $state(false);
	let loading = $state(false);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!token) {
			error = 'Lien de réinitialisation invalide ou absent.';
			return;
		}

		if (newPassword.length < 8) {
			error = 'Le mot de passe doit comporter au moins 8 caractères.';
			return;
		}

		if (newPassword !== confirmPassword) {
			error = 'Les deux mots de passe ne correspondent pas.';
			return;
		}

		loading = true;
		error = '';

		try {
			const { error: err } = await authClient.resetPassword({
				newPassword,
				token
			});

			if (err) {
				if (err.code === 'INVALID_TOKEN' || err.message?.toLowerCase().includes('token')) {
					error =
						'Ce lien de réinitialisation est invalide ou a expiré. Veuillez refaire une demande.';
				} else {
					error = err.message || 'Une erreur est survenue lors de la mise à jour.';
				}
			} else {
				success = true;
				setTimeout(() => {
					window.location.href = resolve('/login');
				}, 2200);
			}
		} catch {
			error = 'Une erreur inattendue est survenue. Veuillez réessayer.';
		} finally {
			loading = false;
		}
	}
</script>

<main class="auth-container">
	<a href={resolve('/login')} class="back-link">← Retour à la connexion</a>

	<div class="auth-box">
		<h2>Nouveau mot de passe</h2>

		{#if !token}
			<div class="error-box">
				Ce lien de réinitialisation est incomplet (jeton manquant). Veuillez formuler une nouvelle
				demande depuis la page de connexion.
			</div>
			<div class="action-footer">
				<a href={resolve('/login')} class="submit-btn text-center">Faire une demande</a>
			</div>
		{:else if success}
			<div class="info-box">
				✓ Votre mot de passe a été mis à jour avec succès !<br />
				Redirection vers la page de connexion en cours...
			</div>
			<div class="action-footer">
				<a href={resolve('/login')} class="submit-btn text-center">Se connecter immédiatement</a>
			</div>
		{:else}
			<p class="desc-text">Définissez votre nouveau mot de passe (au moins 8 caractères).</p>

			{#if error}
				<div class="error-box">{error}</div>
			{/if}

			<form onsubmit={handleSubmit} class="auth-form">
				<div class="input-group">
					<label for="newPassword">Nouveau mot de passe</label>
					<input
						id="newPassword"
						type="password"
						bind:value={newPassword}
						minlength="8"
						required
						autocomplete="new-password"
					/>
				</div>

				<div class="input-group">
					<label for="confirmPassword">Confirmer le mot de passe</label>
					<input
						id="confirmPassword"
						type="password"
						bind:value={confirmPassword}
						minlength="8"
						required
						autocomplete="new-password"
					/>
				</div>

				<button type="submit" class="submit-btn" disabled={loading}>
					{loading ? 'Modification en cours...' : 'Mettre à jour mon mot de passe'}
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
	h2 {
		margin: 0 0 12px 0;
		font-size: 1.5rem;
		text-align: center;
	}
	.desc-text {
		font-size: 0.9rem;
		color: #666;
		line-height: 1.4;
		margin: 0 0 16px 0;
		text-align: center;
	}
	.error-box {
		background-color: #fee2e2;
		color: #dc2626;
		padding: 12px;
		border-radius: 6px;
		font-size: 0.9rem;
		line-height: 1.4;
		margin-bottom: 16px;
	}
	.info-box {
		background-color: #ecfdf5;
		color: #065f46;
		padding: 16px;
		border-radius: 6px;
		font-size: 0.95rem;
		border: 1px solid #a7f3d0;
		line-height: 1.5;
		text-align: center;
		margin-bottom: 16px;
	}
	.auth-form {
		display: flex;
		flex-direction: column;
		gap: 16px;
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
	.submit-btn {
		display: block;
		padding: 14px;
		background-color: #1a1a1a;
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 1rem;
		font-weight: bold;
		cursor: pointer;
		margin-top: 8px;
		text-decoration: none;
		box-sizing: border-box;
	}
	.submit-btn:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}
	.text-center {
		text-align: center;
	}
	.action-footer {
		margin-top: 16px;
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
