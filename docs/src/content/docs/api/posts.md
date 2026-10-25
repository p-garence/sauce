---
title: Endpoints Publications
description: Spécification des routes API dédiées à la gestion des posts, à la visibilité et aux interactions.
---

## 1. Consulter un post

- **Méthode** : `GET`
- **Chemin** : `/api/posts/[id]`
- **Authentification** : Optionnelle

### Règles d'Accès
Applique automatiquement la fonction `canSeePost` :
- Si la requête est un utilisateur non connecté ou une instance externe : retourne le post uniquement si `visibility === "public"`.
- Si connecté : accessible selon le cercle (auteur, réseau, abonnés acceptés ou groupe privé).

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
      "avatar": "/uploads/david.webp",
      "isFollowing": false
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

Valeurs possibles pour `visibility` : `"public"`, `"network"`, `"followers"`, `"group"`.

### Réponse (200 OK)

```json
{
  "success": true,
  "visibility": "group",
  "groupId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
```

---

## 2. Liker / Déliker un post

- **Méthode** : `POST` / `DELETE`
- **Chemin** : `/api/posts/[id]/like`
- **Authentification** : Requise

### Réponse (200 OK)

```json
{
  "success": true
}
```

---

## 3. Masquer / Afficher un post

- **Méthode** : `POST`
- **Chemin** : `/api/posts/[id]/hide`
- **Authentification** : Requise

### Requête

```json
{
  "hide": true
}
```

### Réponse (200 OK)

```json
{
  "success": true,
  "hidden": true
}
```

---

## 4. Supprimer un post

- **Méthode** : `DELETE`
- **Chemin** : `/api/posts/[id]`
- **Authentification** : Requise (Auteur ou Admin)

### Réponse (200 OK)

```json
{
  "success": true
}
```
