---
title: Vue d'Ensemble de l'API REST
description: Conventions, authentification, codes de statut et formats d'échange de l'API SvelteKit.
---

L'application expose des endpoints REST sous le préfixe `/api/` pour alimenter les interactions dynamiques du frontend et permettre d'éventuelles intégrations externes.

---

## Authentification des Requêtes

Toutes les routes protégées utilisent l'authentification par session gérée par **Better-Auth**.

Pour vérifier la session dans un endpoint :
```typescript
import { requireApiSession } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request }) => {
  const session = await requireApiSession(request);
  const currentUserId = session.user.id;
  // ...
};
```

Si le cookie de session est absent ou invalide, une réponse standard `401 Unauthorized` est automatiquement retournée.

---

## Conventions de Statut HTTP

- `200 OK` : Requête traitée avec succès.
- `201 Created` : Ressource créée (post, commentaire, message).
- `400 Bad Request` : Paramètres manquants ou payload JSON invalide.
- `401 Unauthorized` : Utilisateur non authentifié.
- `403 Forbidden` : Utilisateur non autorisé à accéder à la ressource (post privé, liste cachée).
- `404 Not Found` : Ressource introuvable.
- `500 Internal Server Error` : Erreur serveur non interceptée.

---

## Liste des Endpoints

| Domaine | Méthode & Chemin | Description |
| :--- | :--- | :--- |
| **Publications** | `GET /api/feed-posts` | Récupère le flux de posts selon le filtre actif et curseur |
| | `GET /api/posts/[id]` | Consulte une publication unique avec contrôle d'accès |
| | `PATCH /api/posts/[id]/visibility` | Modifie la visibilité d'un post (`public`, `followers`, `group`, `private`) |
| | `DELETE /api/posts/[id]` | Supprime définitivement un post et ses médias physiques |
| | `POST /api/like` | Like ou unlike une publication (`action: 'like' \| 'unlike'`) |
| | `GET /api/posts/[id]/likes` | Liste les utilisateurs ayant aimé une publication |
| | `POST /api/posts/hide` | Masque ou démasque un post du flux (`action: 'hide' \| 'unhide'`) |
| **Abonnements** | `GET /api/follow?targetId=...` | Vérifie l'état de suivi d'un utilisateur |
| | `POST /api/follow` | S'abonne, se désabonne ou annule une demande en attente |
| | `POST /api/follow/manage` | Accepte ou refuse une demande d'abonnement reçue |
| **Commentaires**| `GET /api/comments?postId=...` | Liste les commentaires paginés d'un post |
| | `POST /api/comments` | Publie un commentaire racine ou une réponse ciblée |
| | `PATCH /api/comments/[id]` | Modifie le texte d'un commentaire existant |
| | `DELETE /api/comments/[id]` | Supprime définitivement un commentaire |
| | `POST /api/comments/like` | Like ou unlike un commentaire |
| **Messagerie** | `GET /api/chat/direct/[username]` | Récupère ou ouvre une discussion directe |
| | `POST /api/chat/group/create` | Crée un groupe de discussion |
| | `GET /api/chat/history` | Charge l'historique antérieur des messages d'un chat |
| | `POST /api/chat/read` | Marque les messages d'un chat comme lus |
| | `PATCH /api/chat/messages/[id]` | Modifie le contenu d'un message envoyé |
| | `DELETE /api/chat/messages/[id]` | Supprime un message envoyé |
| **Utilisateurs** | `GET /api/users/[username]` | Profil public selon préférences de visibilité |
| | `GET /api/users/block` | Liste les profils bloqués |
| | `POST /api/users/block` | Bloque ou débloque un profil utilisateur |
| **Administration** | `GET /api/admin/stats` | Métriques globales du serveur |
| | `GET /api/admin/users` | Liste paginée des utilisateurs enregistrés |
| | `PATCH /api/admin/users/[id]` | Modération (ban, rôle, nom, quota, invitations) |
| | `DELETE /api/admin/users/[id]` | Suppression d'un compte utilisateur |
| | `DELETE /api/admin/posts` | Purge admin d'une publication litigieuse |
| | `DELETE /api/admin/stories` | Purge admin d'une story |
| | `GET /api/admin/media/orphans` | Diagnostic des médias orphelins sur le disque |
| | `DELETE /api/admin/media/orphans` | Nettoyage des fichiers orphelins non référencés |
| **Instances & Réseau** | `GET /api/instances` | Répertoire des instances et serveurs |
| | `POST /api/instances` | Enregistrement d'un domaine d'instance |
| | `PATCH /api/instances/[id]` | Modification du niveau de confiance |
| | `DELETE /api/instances/[id]` | Retrait d'une instance de l'annuaire |
