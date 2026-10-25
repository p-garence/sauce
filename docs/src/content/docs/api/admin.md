---
title: Endpoints Administration
description: Spécification des routes API pour la modération des utilisateurs, les quotas d'invitations et les statistiques globales.
---

Les endpoints d'administration sous `/api/admin/` sont réservés aux comptes possédant le rôle `admin`.

---

## 1. Statistiques Globales

- **Méthode** : `GET`
- **Chemin** : `/api/admin/stats`
- **Authentification** : Requise (Rôle `admin`)

### Réponse (200 OK)

```json
{
  "totalUsers": 142,
  "totalPosts": 856,
  "totalComments": 1240,
  "totalInstances": 5
}
```

---

## 2. Liste des Utilisateurs

- **Méthode** : `GET`
- **Chemin** : `/api/admin/users`
- **Authentification** : Requise (Rôle `admin`)

### Réponse (200 OK)

```json
[
  {
    "id": "u_12345",
    "username": "claire",
    "name": "Claire Dupont",
    "role": "user",
    "isBanned": false,
    "maxInvites": 5,
    "createdAt": "2026-10-10T12:00:00.000Z",
    "inviter": {
      "username": "admin"
    }
  }
]
```

---

## 3. Modifier un Utilisateur

- **Méthode** : `PATCH`
- **Chemin** : `/api/admin/users/[id]`
- **Authentification** : Requise (Rôle `admin`)

### Requête

Toutes les propriétés sont optionnelles dans le corps JSON :

```json
{
  "isBanned": true,
  "role": "admin",
  "name": "Nouveau Nom",
  "addInvites": 10,
  "storageQuotaBytes": 5368709120
}
```

*Remarque : Si `isBanned: true` est appliqué, toutes les sessions actives de l'utilisateur sont immédiatement révoquées.*

### Réponse (200 OK)

```json
{
  "success": true,
  "ban": { "success": true, "userId": "u_12345", "isBanned": true },
  "quota": { "success": true, "userId": "u_12345", "storageQuotaBytes": 5368709120 }
}
```

---

## 4. Supprimer un Utilisateur

- **Méthode** : `DELETE`
- **Chemin** : `/api/admin/users/[id]`
- **Authentification** : Requise (Rôle `admin`)

Supprime l'utilisateur, l'ensemble de ses publications et nettoie physiquement tous ses fichiers médias associés sur le disque.

### Réponse (200 OK)

```json
{
  "success": true,
  "deletedUserId": "u_12345"
}
```

---

## 5. Gestion des Médias Orphelins

Détection et nettoyage des fichiers sur le disque (`uploads/`) non référencés en base de données.

### Détecter les fichiers orphelins

- **Méthode** : `GET`
- **Chemin** : `/api/admin/media/orphans`
- **Authentification** : Requise (Rôle `admin`)

#### Réponse (200 OK)

```json
{
  "totalOrphanBytes": 15420120,
  "orphanCount": 4,
  "orphans": [
    {
      "filename": "f8d3...webp",
      "url": "/media/f8d3...webp",
      "sizeBytes": 3855030,
      "createdAt": "2026-10-10T14:22:00.000Z"
    }
  ]
}
```

### Nettoyer les fichiers orphelins

- **Méthode** : `DELETE`
- **Chemin** : `/api/admin/media/orphans`
- **Authentification** : Requise (Rôle `admin`)
- **Corps (optionnel)** : `{ "filenames": ["f8d3...webp"] }` (supprime tout si omis)

#### Réponse (200 OK)

```json
{
  "success": true,
  "deletedCount": 4,
  "freedBytes": 15420120
}
```
