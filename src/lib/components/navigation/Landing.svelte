<!--
  @component Landing
  @domain navigation
  @description Page vitrine d'accueil pour les visiteurs non connectés.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<div class="landing-container">
	<div class="hero">
		<h1>Bienvenue sur le Réseau</h1>
		<p class="subtitle">
			Objectif : Une plateforme décentralisée, basée sur le parrainage, le contrôle de vos données
			et des recommandations personnalisées.
		</p>
		<p class="subtitle">Actuellement : Version Alpha en développement</p>

		<div class="features">
			<div class="feature-card">
				<h3>Réseau de confiance</h3>
				<p>
					Chaque utilisateur est invité par un membre existant. Ce système de parrainage permet de
					lutter efficacement contre les bots.
				</p>
			</div>
			<div class="feature-card">
				<h3>Algorithmes sur mesure</h3>
				<p>
					Sélectionnez les données que vous partagez et gardez le contrôle total sur les algorithmes
					qui filtrent votre contenu.
				</p>
			</div>
			<div class="feature-card">
				<h3>Décentralisation</h3>
				<p>
					Vos données ne sont pas enfermées. Le contenu peut être partagé et hébergé sur plusieurs
					serveurs indépendants.
				</p>
			</div>
		</div>

		<a href={resolve('/login')} class="cta-button">Se connecter avec une clé</a>
	</div>
</div>

<style>
	/* VOTRE CSS INTACT */
	.landing-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: calc(100vh - 60px);
		padding: 20px;
		box-sizing: border-box;
	}
	.hero {
		text-align: center;
		max-width: 800px;
	}
	h1 {
		font-size: 3rem;
		color: #1a1a1a;
		margin-bottom: 16px;
	}
	.subtitle {
		font-size: 1.2rem;
		color: #666;
		margin-bottom: 40px;
	}
	.features {
		display: flex;
		gap: 24px;
		justify-content: center;
		margin-bottom: 48px;
		flex-wrap: wrap;
	}
	.feature-card {
		background: white;
		padding: 24px;
		border-radius: 12px;
		border: 1px solid #eaeaea;
		flex: 1;
		min-width: 250px;
		text-align: left;
	}
	.feature-card h3 {
		margin-top: 0;
	}
	.cta-button {
		display: inline-block;
		background-color: #1a1a1a;
		color: white;
		padding: 16px 32px;
		border-radius: 8px;
		text-decoration: none;
		font-weight: bold;
		font-size: 1.1rem;
	}
</style>
