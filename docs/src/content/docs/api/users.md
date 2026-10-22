---
title: Endpoints Utilisateurs & Profils
description: Spécification des routes API publiques pour consulter un profil utilisateur selon ses préférences de confidentialité.
---

L'endpoint `/api/users/[username]` permet à tout client (application web, mobile ou instance distante) de consulter les informations publiques d'un profil.

---

## 1. Consulter un profil utilisateur

- **Méthode** : `GET`
- **Chemin** : `/api/users/[username]`
- **Authentification** : Optionnelle

### Règles de Confidentialité Appliquées
Les données retournées respectent strictement les paramètres `profileVisibility` de l'utilisateur cible :
- `bio`, `site`, `age`, `genre`, `contactEmail` ne sont retournés que si autorisés publiquement (ou si le visiteur est le propriétaire du profil).
- `followersCount` et `followingCount` sont masqués (`null`) si l'utilisateur a désactivé l'affichage public de ses abonnés ou abonnements.

### Réponse (200 OK)

```json
{
  "user": {
    "id": "u_999",
    "username": "claire",
    "name": "Claire Dupont",
    "image": "/uploads/claire.webp",
    "createdAt": "2026-09-01T10:00:00.000Z",
    "bio": "Développeuse web & open source.",
    "site": "https://claire.dev",
    "age": null,
    "genre": null,
    "contactEmail": null,
    "followersCount": 128,
    "followingCount": 45
  }
}
```

### Réponse Erreur (404 Not Found)

```json
{
  "error": "Utilisateur introuvable"
}
```

---

## 2. Lister les utilisateurs bloqués

- **Méthode** : `GET`
- **Chemin** : `/api/users/block`
- **Authentification** : Requise

Retourne la liste complète des profils bloqués par l'utilisateur connecté.

### Réponse (200 OK)

```json
{
  "blockedUsers": [
    {
      "id": "u_blocked_1",
      "username": "spammer",
      "name": "Compte Bloqué",
      "image": null,
      "blockedAt": "2026-10-10T12:00:00.000Z"
    }
  ]
}
```

---

## 3. Bloquer ou débloquer un utilisateur

- **Méthode** : `POST`
- **Chemin** : `/api/users/block`
- **Authentification** : Requise

### Requête

```json
{
  "targetUserId": "u_blocked_1",
  "action": "block"
}
```

Valeurs autorisées pour `action` : `"block"` ou `"unblock"`.

### Réponse (200 OK)

```json
{
  "success": true,
  "action": "block"
}
```

---

## 4. Vérifier la disponibilité d'un pseudo

- **Méthode** : `GET`
- **Chemin** : `/api/users/check-username?username=[pseudo]`
- **Authentification** : Requise

Vérifie en temps réel si un nom d'utilisateur est syntaxiquement valide (3 à 30 caractères alphanumériques ou underscore) et disponible en base de données (insensible à la casse).

### Paramètres d'URL

| Paramètre | Type | Requis | Description |
| :--- | :--- | :--- | :--- |
| `username` | `string` | Oui | Pseudo à tester. |

### Réponse : Pseudo disponible (200 OK)

```json
{
  "available": true
}
```

*(Si le pseudo testé est le pseudo actuel de l'utilisateur connecté, la réponse inclut également `"isCurrent": true"`).*

### Réponse : Pseudo indisponible ou invalide (200 OK)

```json
{
  "available": false,
  "reason": "Ce nom d'utilisateur est déjà pris."
}
```

