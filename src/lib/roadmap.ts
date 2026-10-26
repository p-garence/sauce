export type TaskStatus = 'todo' | 'done';

export interface RoadmapItem {
	title: string;
	status: TaskStatus;
}

export interface RoadmapCategory {
	theme: string;
	items: RoadmapItem[];
}

export const roadmapData: RoadmapCategory[] = [
	{
		theme: 'Comptes & Sécurité',
		items: [
			{ title: 'Connexion / Inscription', status: 'done' },
			{ title: 'Paramètres pour générer des clefs', status: 'done' },
			{ title: "Gérer le mode Demande d'abonnement", status: 'done' },
			{ title: 'Gérer le passage des posts publique en privé', status: 'done' },
			{ title: 'Paramètre montrer ou pas les abonements/abonnés', status: 'done' },
			{ title: 'Montrer abonneemnt en commun', status: 'done' },
			{ title: 'Onboarding après inscription', status: 'done' },
			{ title: 'Passage sur la sécurité', status: 'done' }
		]
	},
	{
		theme: 'Flux & Algorithme',
		items: [
			{ title: 'Sélection du flux dans le Feed', status: 'done' },
			{ title: 'Composant Feed', status: 'done' },
			{ title: 'Paramétrage des flux V0 : vu/pas vu - abonnement/tous', status: 'done' },
			{ title: 'Mise en place des flux par défaut', status: 'done' },
			{ title: 'Gestion des Flux', status: 'done' },
			{ title: 'Fusion de Flux', status: 'done' },
			{ title: 'Flux par tag', status: 'done' },
			{ title: 'Flux RSS', status: 'done' },
			{ title: 'Flux Newletter', status: 'todo' },
			{ title: 'Algo recommendation : V1', status: 'todo' }
		]
	},
	{
		theme: 'Interface Utilisateur',
		items: [
			{ title: 'Adaptation et refonte UI/UX Mobile', status: 'done' },
			{ title: 'Correction affichage "commentaire populaire"', status: 'done' },
			{ title: 'Affichage correct du chat sur Mobile', status: 'done' },
			{ title: 'Affichage correct du panneau de recadrage', status: 'done' }
		]
	},
	{
		theme: 'Messagerie',
		items: [
			{ title: 'Reaction aux messages', status: 'done' },
			{ title: 'Envoie Image / fichier', status: 'done' },
			{ title: 'Emojis personalisé', status: 'done' },
			{ title: '@ Dans conversation', status: 'done' },
			{ title: 'Envoyer des messages privés', status: 'done' },
			{ title: 'Liste des messages', status: 'done' },
			{ title: 'Messagerie', status: 'done' },
			{ title: 'Messagerie en direct (Live)', status: 'done' },
			{ title: 'Notification sur le bouton chat et la liste des chats', status: 'done' },
			{ title: "Modification d'un chat", status: 'done' },
			{ title: 'Groupes', status: 'done' },
			{ title: 'Groupes en mode flux', status: 'done' },
			{ title: 'Inviation Message et Parametre associé', status: 'done' },
			{ title: 'Suppression de conversations', status: 'done' },
			{ title: 'Option chat chiffré de bout en bout', status: 'todo' },
			{ title: 'Sourdine', status: 'done' }
		]
	},
	{
		theme: 'Notifications',
		items: [
			{ title: 'Envoi des notifications temps réel', status: 'done' },
			{ title: "Alertes (abonnement, j'aime, commentaire, messages)", status: 'done' },
			{ title: 'Paramètres pour gérer les notifications', status: 'done' },
			{ title: 'Redirection aprés clic sur Notification', status: 'done' },
			{ title: "Notifications demande d'abonnement", status: 'done' },
			{ title: 'Vider les notifications', status: 'done' },
			{ title: 'Chargement partiel des notifications', status: 'done' },
			{ title: 'Web Notification', status: 'done' },
			{ title: 'Push Notification', status: 'done' }
		]
	},
	{
		theme: 'Médias',
		items: [
			{ title: 'Double tap pour like', status: 'done' },
			{ title: 'Types supportés : Texte, Photo, Vidéo', status: 'done' },
			{ title: 'Augmentation limite upload', status: 'done' },
			{ title: "Possibilité d'upload multiple", status: 'done' },
			{ title: 'Panneau de crop', status: 'done' },
			{ title: 'Compression des medias', status: 'done' },
			{ title: 'Paramètre de gestion des médias', status: 'done' },
			{ title: 'Panneau modification photo (ajout texte et dessin)', status: 'done' },
			{ title: 'Panneau modification photo (ajout image)', status: 'done' }
		]
	},
	{
		theme: 'Déploiement et Infrastructure',
		items: [
			{ title: 'Configuration Dockerfile', status: 'done' },
			{ title: 'Configuration docker-compose', status: 'done' },
			{ title: "Gestion de l'URL et proxy", status: 'done' },
			{ title: 'Mise en place des tests (e2e)', status: 'done' },
			{ title: 'Documentation technique', status: 'done' },
			{ title: "Passage sur l'API", status: 'done' },
			{ title: 'Backup données automatique', status: 'todo' },
			{ title: 'Déploiement serveur', status: 'todo' },
			{ title: 'Securisation serveur', status: 'todo' }
		]
	},
	{
		theme: 'Posts',
		items: [
			{ title: 'Publication de posts', status: 'done' },
			{ title: 'Affichage dans un Feed', status: 'done' },
			{ title: 'Masquer, supprimer ou modifier ses posts', status: 'done' },
			{ title: 'Système de like et de commentaires', status: 'done' },
			{ title: 'Indicateur post déjà vu', status: 'done' },
			{ title: 'Page dédiée au post', status: 'done' },
			{ title: 'Visibilité des posts', status: 'done' },
			{ title: 'Tag sur les posts', status: 'done' },
			{ title: '@ Dans post', status: 'done' },
			{ title: 'Type de post : Stories', status: 'done' },
			{ title: 'Type de post : Thread', status: 'todo' },
			{ title: 'Post brouillion / prévisualisation', status: 'todo' },
			{ title: 'Chargement progressif vidéo', status: 'todo' }
		]
	},
	{
		theme: 'Profil',
		items: [
			{ title: 'Compre privé : pas cherchable et post pas public et reseau', status: 'todo' },
			{ title: 'Infos : nom, bio, site, photo de profil', status: 'done' },
			{ title: 'Visibilité des infos selon statut public/privé', status: 'done' },
			{ title: 'Grille des posts publiés et likés', status: 'done' },
			{ title: "S'abonner, se désabonner et listes de 'en communs'", status: 'done' },
			{ title: 'Modifier ses informations', status: 'done' },
			{ title: 'Afficher posts par ordre de popularité', status: 'done' },
			{ title: "Groupe d'abonnement ", status: 'done' },
			{ title: 'Possibilité de voir les abonnements/abonné/en commun si autorisé.', status: 'done' }
		]
	},
	{
		theme: 'Recherche',
		items: [
			{ title: 'Recherche des personnes par nom', status: 'done' },
			{ title: 'Recherche des posts (texte, description)', status: 'done' }
		]
	},
	{
		theme: 'Panneau Admin et modération',
		items: [
			{
				title: 'Mise en place (Onglet Users, Publications, Stories, Actions Globales',
				status: 'done'
			},
			{ title: 'Systeme de notification serveur ', status: 'done' },
			{ title: 'Systeme de report', status: 'todo' },
			{ title: 'Changement des constante serveur ', status: 'todo' },
			{ title: 'System de permissions modérateur / admin', status: 'todo' },
			{ title: 'Systeme de Sauvegardes', status: 'todo' },
			{ title: 'Interface', status: 'done' }
		]
	},
	{
		theme: "Site d'accueil et gestion de déploiement",
		items: [
			{ title: 'Zone pour gérer ces serveurs', status: 'todo' },
			{ title: 'Deploiement automatisé', status: 'todo' }
		]
	},
	{
		theme: 'Fédération & Réseau',
		items: [
			{ title: 'Intégration au Fediverse (ActivityPub)', status: 'todo' },
			{ title: 'Communication inter-instances', status: 'todo' }
		]
	}
];
