import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
	base: '/wikidev',
	outDir: '../static/wikidev',
	integrations: [
		starlight({
			title: 'Social Platform — Documentation Développeur',
			description: 'Documentation technique, architecture, composants UI, services et API.',
			defaultLocale: 'root',
			locales: {
				root: {
					label: 'Français',
					lang: 'fr'
				}
			},
			sidebar: [
				{
					label: 'Guides & Procédures',
					items: [
						{ label: 'Démarrage rapide', slug: 'index' },
						{ label: 'Créer un composant UI', slug: 'guides/nouveau-composant' },
						{ label: 'Ajouter un service backend', slug: 'guides/nouveau-service' },
						{ label: 'Tests E2E & Débogage Playwright', slug: 'guides/tests-e2e' },
						{ label: 'Base de données & Migrations', slug: 'guides/database' }
					]
				},
				{
					label: 'Architecture & Design Patterns',
					items: [
						{ label: 'Vue d’ensemble', slug: 'architecture/overview' },
						{ label: 'UI Optimiste & Runes Svelte 5', slug: 'architecture/optimistic-ui' },
						{ label: 'Pipeline Médias, Upload & Streaming', slug: 'architecture/media-pipeline' },
						{ label: 'Services Backend & Base de données', slug: 'architecture/services' }
					]
				},
				{
					label: 'Composants UI',
					items: [
						{ label: 'Catalogue des composants', slug: 'components/overview' },
						{ label: 'Primitives & Partagés', slug: 'components/primitives' },
						{ label: 'Publications & Édition', slug: 'components/posts' },
						{ label: 'Commentaires & Réactions', slug: 'components/comments' },
						{ label: 'Messagerie & Chat', slug: 'components/chat' },
						{ label: 'Stories & Médias', slug: 'components/stories' },
						{ label: 'Paramètres & Personnalisation', slug: 'components/settings' },
						{ label: 'Administration & Système', slug: 'components/admin' }
					]
				},
				{
					label: 'API & Endpoints',
					items: [
						{ label: 'Vue d’ensemble API', slug: 'api/overview' },
						{ label: 'Publications (/api/posts)', slug: 'api/posts' },
						{ label: 'Abonnements (/api/follow)', slug: 'api/follows' },
						{ label: 'Commentaires (/api/comments)', slug: 'api/comments' },
						{ label: 'Messagerie (/api/chat)', slug: 'api/chat' },
						{ label: 'Utilisateurs (/api/users)', slug: 'api/users' },
						{ label: 'Administration (/api/admin)', slug: 'api/admin' },
						{ label: 'Instances Réseau (/api/instances)', slug: 'api/instances' }
					]
				}
			]
		})
	]
});

