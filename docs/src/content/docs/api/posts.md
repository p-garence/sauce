---
title: Endpoints Publications
description: Spécification des routes API dédiées à la gestion des posts, à la visibilité, au flux et aux interactions.
---

## 1. Consulter un post

- **Méthode** : `GET`
- **Chemin** : `/api/posts/[id]`
- **Authentification** : Optionnelle

### Règles d'Accès
Applique automatiquement la fonction `assertCanSeePost` :
- Si la requête est un utilisateur anonyme : accessible uniquement si `visibility === "public"`.
- Si connecté : accessible selon le cercle d'audience (auteur, abonnés acceptés ou groupe privé).

### Réponse (200 OK)

```json
{
  "post": {
    "id": "p_12345",
    "content": "Bonjour le réseau !",
    "postType": "text",
    "mediaUrls": null,
    "likesCount": 12,
    "commentsCount": 3,
    "visibility": "public",
    "createdAt": "2026-10-10T15:00:00.000Z",
    "author": {
      "id": "u_abc",
      "username": "david",
      "name": "David",
      "avatar": "/uploads/david.webp"
    },
    "isLiked": false,
    "isHidden": false
  }
}
```

---

## 2. Modifier la visibilité d'un post

- **Méthode** : `PATCH`
- **Chemin** : `/api/posts/[id]/visibility`
- **Authentification** : Requise (Auteur uniquement)

### Requête

```json
{
  "visibility": "group",
  "groupId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
```

Valeurs autorisées pour `visibility` : `"public"`, `"followers"`, `"group"`, `"private"`.

### Réponse (200 OK)

```json
{
  "success": true,
  "visibility": "group",
  "groupId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
```

---

## 3. Liker ou Déliker une publication

- **Méthode** : `POST`
- **Chemin** : `/api/like`
- **Authentification** : Requise

### Requête

```json
{
  "postId": "p_12345",
  "action": "like"
}
```

Valeurs autorisées pour `action` : `"like"` ou `"unlike"`.

### Réponse (200 OK)

```json
{
  "success": true
}
```

---

## 4. Obtenir les mentions "J'aime" d'un post

- **Méthode** : `GET`
- **Chemin** : `/api/posts/[id]/likes`
- **Authentification** : Requise

Retourne la liste des utilisateurs ayant aimé la publication, en excluant les personnes bloquées.

### Réponse (200 OK)

```json
[
  {
    "id": "u_abc",
    "username": "claire",
    "name": "Claire",
    "image": "/uploads/claire.webp",
    "likedAt": "2026-10-10T15:05:00.000Z",
    "isFollowing": true
  }
]
```

---

## 5. Masquer ou Démasquer un post

- **Méthode** : `POST`
- **Chemin** : `/api/posts/hide`
- **Authentification** : Requise

### Requête

```json
{
  "postId": "p_12345",
  "action": "hide"
}
```

Valeurs autorisées pour `action` : `"hide"` ou `"unhide"`.

### Réponse (200 OK)

```json
{
  "success": true
}
```

---

## 6. Supprimer définitivement un post

- **Méthode** : `DELETE`
- **Chemin** : `/api/posts/[id]`
- **Authentification** : Requise (Auteur ou Rôle Admin)

Supprime l'entrée en base de données et nettoie les fichiers médias physiques associés s'ils ne sont plus référencés.

### Réponse (200 OK)

```json
{
  "success": true
}
```

---

## 7. Récupérer le flux de publications

- **Méthode** : `GET`
- **Chemin** : `/api/feed-posts?feedId={id}&cursor={cursor}&limit=10`
- **Authentification** : Optionnelle

Alimente le scroll infini des publications selon la configuration du flux actif.
