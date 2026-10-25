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
