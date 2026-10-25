---
title: Endpoints Commentaires
description: Spécification des routes API pour récupérer, poster et aimer des commentaires et réponses imbriquées.
---

## 1. Récupérer les commentaires d'un post

- **Méthode** : `GET`
- **Chemin** : `/api/comments?postId={id}&page=1&limit=5&sort=newest&parentId={optional}`
- **Authentification** : Requise

### Paramètres d'URL

| Paramètre | Type | Par défaut | Description |
| :--- | :--- | :--- | :--- |
| `postId` | `string` | *(Requis)* | Identifiant du post associé |
| `parentId` | `string` | `null` | Si spécifié, retourne les réponses au commentaire ciblé |
| `sort` | `string` | `"newest"` | Tri : `"newest"`, `"oldest"`, ou `"top"` |
| `page` | `number` | `1` | Numéro de la page |
| `limit` | `number` | `5` | Nombre d'éléments par page |

### Réponse (200 OK)

```json
[
  {
    "id": "c_12345",
    "postId": "p_67890",
    "content": "Superbe publication !",
    "createdAt": "2026-10-11T03:00:00.000Z",
    "likesCount": 4,
    "isLiked": true,
    "repliesCount": 2,
    "author": {
      "id": "user_abc",
      "username": "claire",
      "name": "Claire Dupont",
      "image": "/uploads/claire.webp"
    }
  }
]
```

---

## 2. Publier un commentaire

- **Méthode** : `POST`
- **Chemin** : `/api/comments`
- **Authentification** : Requise

### Requête

```json
{
  "postId": "p_67890",
  "content": "Je suis tout à fait d'accord avec cette analyse.",
  "parentId": null
}
```

---

## 3. Liker ou Unliker un commentaire

- **Méthode** : `POST`
- **Chemin** : `/api/comments/like`
- **Authentification** : Requise

### Requête

```json
{
  "commentId": "c_12345",
  "action": "like"
}
```
