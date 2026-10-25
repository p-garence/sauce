<!--
  @component Roadmap
  @domain ui
  @description Présentation de la feuille de route et des fonctionnalités de la plateforme.
-->
<script lang="ts">
	import { roadmapData } from '$lib/roadmap';

	// Tri dynamique : dans chaque thème, 'todo' apparaît avant 'done'
	const categories = roadmapData.map((cat) => ({
		...cat,
		items: [...cat.items].sort((a, b) => {
			if (a.status === 'todo' && b.status === 'done') return -1;
			if (a.status === 'done' && b.status === 'todo') return 1;
			return 0;
		})
	}));

	// Svelte 5 state pour gérer quels thèmes sont déroulés
	let expandedCategories = $state<Record<string, boolean>>({});

	function toggleExpand(theme: string) {
		expandedCategories[theme] = !expandedCategories[theme];
	}
</script>

<div class="roadmap-container">
	<header>
		<h1>Feuille de route</h1>
		<p>Suivi de l'avancement du développement de l'application.</p>
	</header>

	<div class="grid">
		{#each categories as category (category.theme)}
			<div class="card">
				<h2>{category.theme}</h2>
				<ul class="task-list">
					{#each category.items as item, index (item.title)}
						<!-- Affiche si l'index est < 5 OU si la catégorie est étendue -->
						{#if index < 5 || expandedCategories[category.theme]}
							<li class="task {item.status}">
								<span class="status-icon">
									{item.status === 'done' ? '✓' : '○'}
								</span>
								<span class="task-title">{item.title}</span>
							</li>
						{/if}
					{/each}
				</ul>

				{#if category.items.length > 5}
					<button class="toggle-btn" onclick={() => toggleExpand(category.theme)}>
						{expandedCategories[category.theme]
							? 'Voir moins'
							: `Voir plus (${category.items.length - 5})`}
					</button>
				{/if}
			</div>
		{/each}
	</div>
</div>

<style>
	.roadmap-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 24px 16px;
		color: #1a1a1a;
	}

	header {
		margin-bottom: 24px;
	}

	h1 {
		font-size: 1.8rem;
		margin: 0 0 4px 0;
	}

	header p {
		color: #666;
		font-size: 0.95rem;
		margin: 0;
	}

	/* Layout plus resserré */
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 16px;
		align-items: start; /* Évite que les cartes s'étirent en hauteur inutilement */
	}

	.card {
		background: #fff;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 16px;
	}

	h2 {
		font-size: 1.1rem;
		font-weight: 600;
		margin: 0 0 12px 0;
		padding-bottom: 8px;
		border-bottom: 1px solid #f3f4f6;
		color: #111827;
	}

	.task-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 8px; /* Espacement serré entre les items */
	}

	.task {
		display: flex;
		align-items: flex-start;
		font-size: 0.9rem;
		line-height: 1.3;
	}

	.status-icon {
		flex-shrink: 0;
		width: 18px;
		font-weight: bold;
		margin-right: 6px;
	}

	/* Différence visuelle entre Todo et Done */
	.task.todo {
		color: #111827;
		font-weight: 500;
	}
	.task.todo .status-icon {
		color: #d97706; /* Orange discret pour attirer l'oeil */
	}

	.task.done {
		color: #6b7280; /* Texte grisé pour ce qui est fini */
	}
	.task.done .status-icon {
		color: #10b981; /* Vert de validation */
	}

	.toggle-btn {
		margin-top: 12px;
		background: none;
		border: none;
		color: #3b82f6;
		font-size: 0.85rem;
		font-weight: 500;
		cursor: pointer;
		padding: 0;
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.toggle-btn:hover {
		color: #2563eb;
	}
</style>
