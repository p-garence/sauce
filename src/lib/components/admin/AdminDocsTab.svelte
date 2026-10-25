<script lang="ts">
	import { resolve } from '$app/paths';

	/**
	 * @component AdminDocsTab
	 * @domain Admin / Docs
	 * @description Onglet de présentation et d'accès rapide à la documentation technique
	 * @responsibilities
	 * - Proposer un lien direct vers la documentation Astro Starlight locale
	 * - Résumer les points d'architecture clés et commandes CLI utiles pour l'administrateur
	 */
</script>

<section class="tab-section docs-section">
	<div class="docs-banner">
		<div>
			<h2>Documentation du Projet</h2>
			<p class="action-desc">
				Documentation technique interactive générée avec Astro Starlight (27 pages, recherche
				plein texte intégrée).
			</p>
		</div>
		<a
			href={resolve('/wikidev')}
			target="_blank"
			rel="noopener noreferrer"
			class="btn btn-blue"
		>
			Ouvrir le Wiki Dev (/wikidev) ↗
		</a>
	</div>

	<div class="docs-cards-grid">
		<div class="doc-card">
			<h3>Modération & Administration</h3>
			<p>
				Bannissement révoquant immédiatement toutes les sessions actives. Attribution des rôles
				admin et gestion des suppressions en cascade avec purge des médias disque.
			</p>
		</div>

		<div class="doc-card">
			<h3>Médias & Quotas de Stockage</h3>
			<p>
				Quota par utilisateur (2 Go par défaut) modifiable depuis l'onglet Utilisateurs.
				Compression automatique WebP / H.264 et scanner d'orphelins.
			</p>
		</div>

		<div class="doc-card">
			<h3>Flux & State Memory</h3>
			<p>
				Curseur de pagination opaque en Base64, conservation réactive du scroll et de
				l'historique lors de la navigation entre profils et onglets.
			</p>
		</div>

		<div class="doc-card">
			<h3>Commandes Utiles</h3>
			<ul class="code-list">
				<li><code>npm run dev</code> : Serveur de développement SvelteKit</li>
				<li><code>npm run check</code> : Diagnostic Svelte 5 / TypeScript</li>
				<li><code>npm run docs:dev</code> : Serveur de documentation Starlight</li>
				<li><code>npm run docs:build</code> : Build statique de la documentation</li>
			</ul>
		</div>
	</div>
</section>

<style>
	.docs-banner {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 16px;
		background: #eff6ff;
		border: 1px solid #bfdbfe;
		border-radius: 10px;
		padding: 20px;
		margin-bottom: 24px;
	}

	.docs-banner h2 {
		margin: 0 0 6px 0;
		font-size: 1.25rem;
		color: #1e40af;
	}

	.action-desc {
		margin: 0;
		font-size: 0.88rem;
		color: #6b7280;
		line-height: 1.4;
	}

	.docs-cards-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 16px;
	}

	.doc-card {
		border: 1px solid #e5e7eb;
		border-radius: 10px;
		padding: 18px;
		background: #fafafa;
	}

	.doc-card h3 {
		margin: 0 0 8px 0;
		font-size: 1rem;
		color: #111827;
	}

	.doc-card p {
		margin: 0;
		font-size: 0.88rem;
		color: #4b5563;
		line-height: 1.45;
	}

	.code-list {
		margin: 0;
		padding-left: 18px;
		font-size: 0.85rem;
		color: #374151;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.code-list code {
		background: #e5e7eb;
		padding: 2px 6px;
		border-radius: 4px;
		font-family: monospace;
	}

	.btn {
		padding: 8px 14px;
		border: none;
		border-radius: 6px;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		color: white;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		transition: opacity 0.15s ease;
	}

	.btn:hover {
		opacity: 0.9;
	}

	.btn-blue {
		background: #2563eb;
	}
</style>
