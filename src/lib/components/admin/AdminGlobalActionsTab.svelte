<script lang="ts">
	/**
	 * @component AdminGlobalActionsTab
	 * @domain Admin / Actions
	 * @description Onglet des actions globales et de développement / démonstration
	 * @responsibilities
	 * - Afficher les statistiques de haut niveau (utilisateurs, posts, stories, commentaires, instances)
	 * - Proposer des actions de seeding : génération d'utilisateurs, publications et clés d'invitation
	 */
	import { enhance } from '$app/forms';

	export interface AdminStats {
		totalUsers: number;
		totalPosts: number;
		totalStories: number;
		totalComments: number;
		totalInstances: number;
	}

	interface Props {
		/** Statistiques globales de l'instance */
		stats: AdminStats;
	}

	let { stats }: Props = $props();
</script>

<section class="tab-section">
	<!-- STATS CARDS -->
	<div class="stats-grid">
		<div class="stat-card">
			<span class="stat-label">Utilisateurs</span>
			<span class="stat-value">{stats.totalUsers}</span>
		</div>
		<div class="stat-card">
			<span class="stat-label">Publications</span>
			<span class="stat-value">{stats.totalPosts}</span>
		</div>
		<div class="stat-card">
			<span class="stat-label">Stories</span>
			<span class="stat-value">{stats.totalStories}</span>
		</div>
		<div class="stat-card">
			<span class="stat-label">Commentaires</span>
			<span class="stat-value">{stats.totalComments}</span>
		</div>
		<div class="stat-card">
			<span class="stat-label">Instances</span>
			<span class="stat-value">{stats.totalInstances}</span>
		</div>
	</div>

	<div class="actions-grid">
		<!-- GÉNÉRATION UTILISATEURS -->
		<div class="action-card">
			<h3>Générateur d'Utilisateurs de Test</h3>
			<p class="action-desc">
				Crée automatiquement 30 utilisateurs de test complets avec profils, biographies et
				pseudonymes uniques.
			</p>
			<form
				method="POST"
				action="?/generateUsers"
				use:enhance
				onsubmit={(e) => {
					if (!confirm('Générer 30 utilisateurs de test aléatoires ?')) e.preventDefault();
				}}
			>
				<button class="btn btn-green"> Générer +30 Utilisateurs </button>
			</form>
		</div>

		<!-- GÉNÉRATION POSTS -->
		<div class="action-card">
			<h3>Générateur de Publications de Test</h3>
			<p class="action-desc">
				Crée automatiquement 30 publications variées avec dates aléatoires pour tester le flux et le
				défilement infini.
			</p>
			<form
				method="POST"
				action="?/generatePosts"
				use:enhance
				onsubmit={(e) => {
					if (!confirm('Générer 30 publications de test aléatoires ?')) e.preventDefault();
				}}
			>
				<button class="btn btn-purple"> Générer +30 Publications </button>
			</form>
		</div>

		<!-- GÉNÉRATION CLÉS D'INVITATION -->
		<div class="action-card">
			<h3>Générateur Rapide de Clés de Parrainage</h3>
			<p class="action-desc">
				Génère instantanément 10 clés d'invitation administrateur prêtes à être partagées.
			</p>
			<form
				method="POST"
				action="?/generateKeys"
				use:enhance
				onsubmit={(e) => {
					if (!confirm('Générer 10 clés d’invitation administrateur ?')) e.preventDefault();
				}}
			>
				<button class="btn btn-blue"> Générer +10 Clés Admin </button>
			</form>
		</div>
	</div>
</section>

<style>
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 16px;
		margin-bottom: 24px;
	}

	.stat-card {
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 10px;
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.stat-label {
		font-size: 0.85rem;
		color: #6b7280;
		font-weight: 500;
	}

	.stat-value {
		font-size: 1.8rem;
		font-weight: bold;
		color: #111827;
	}

	.actions-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
		gap: 20px;
	}

	.action-card {
		border: 1px solid #e5e7eb;
		border-radius: 10px;
		padding: 20px;
		background: #fdfdfd;
	}

	.action-card h3 {
		margin: 0 0 8px 0;
		font-size: 1.1rem;
		color: #1f2937;
	}

	.action-desc {
		margin: 0 0 16px 0;
		font-size: 0.88rem;
		color: #6b7280;
		line-height: 1.4;
	}

	.btn {
		padding: 8px 14px;
		border: none;
		border-radius: 6px;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		color: white;
		display: inline-flex;
		align-items: center;
		transition: opacity 0.15s ease;
	}

	.btn:hover {
		opacity: 0.9;
	}

	.btn-green {
		background: #16a34a;
	}

	.btn-purple {
		background: #9333ea;
	}

	.btn-blue {
		background: #2563eb;
	}
</style>
