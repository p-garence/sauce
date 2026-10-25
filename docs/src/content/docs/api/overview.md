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
| **Publications** | `GET /api/feed` | Récupère le flux de posts selon le filtre actif |
| | `POST /api/posts` | Crée une nouvelle publication |
| | `PATCH /api/posts/[id]/visibility` | Modifie la visibilité d'un post |
| | `DELETE /api/posts/[id]` | Supprime définitivement un post |
| | `POST /api/posts/[id]/like` | Aime un post |
| | `DELETE /api/posts/[id]/like` | Retire le like d'un post |
| | `POST /api/posts/[id]/hide` | Masque un post du flux |
| **Abonnements** | `GET /api/follow?targetId=...` | Vérifie l'état de suivi d'un utilisateur |
| | `POST /api/follow` | S'abonne, se désabonne ou annule une demande |
| | `POST /api/follow/manage` | Accepte ou refuse une demande d'abonnement reçue |
| **Commentaires**| `GET /api/comments?postId=...` | Liste les commentaires paginés d'un post |
| | `POST /api/comments` | Publie un commentaire ou une réponse |
| | `POST /api/comments/like` | Like ou unlike un commentaire |
| **Messagerie** | `POST /api/chats` | Crée une discussion directe ou de groupe |
| | `POST /api/chats/[id]/messages` | Envoie un message dans une discussion |
| **Utilisateurs** | `GET /api/users/[username]` | Profil public selon préférences de visibilité |
| **Administration** | `GET /api/admin/stats` | Métriques globales du serveur |
| | `GET /api/admin/users` | Liste des utilisateurs enregistrés |
| | `PATCH /api/admin/users/[id]` | Modération (ban, rôle, nom, invitations) |
| | `DELETE /api/admin/users/[id]` | Suppression d'un compte utilisateur |
| **Instances & Réseau** | `GET /api/instances` | Répertoire des instances et serveurs |
| | `POST /api/instances` | Enregistrement d'un domaine d'instance |
| | `PATCH /api/instances/[id]` | Modification du niveau de confiance |
| | `DELETE /api/instances/[id]` | Retrait d'une instance de l'annuaire |
