---
title: Endpoints Abonnements & Suivi
description: Spécification des routes API pour suivre, se désabonner et modérer les demandes d'abonnement.
---

## 1. Consulter le statut d'un abonnement

- **Méthode** : `GET`
- **Chemin** : `/api/follow?targetId={userId}`
- **Authentification** : Requise

### Réponse (200 OK)

```json
{
  "isFollowing": true,
  "isPending": false
}
```

---

## 2. Basculer l'abonnement (Follow / Unfollow / Cancel)

- **Méthode** : `POST`
- **Chemin** : `/api/follow`
- **Authentification** : Requise

### Requête

```json
{
  "targetId": "user_12345",
  "action": "follow"
}
```

Valeurs possibles pour `action` :
- `"follow"` : Demande d'abonnement (crée un statut `accepted` ou `pending` selon les réglages de la cible).
- `"unfollow"` : Suppression de l'abonnement actif.
- `"cancel"` : Annulation d'une demande d'abonnement envoyée en attente.

### Réponse (200 OK)

```json
{
  "success": true,
  "status": "accepted"
}
```

---

## 3. Gérer une demande d'abonnement reçue

- **Méthode** : `POST`
- **Chemin** : `/api/follow/manage`
- **Authentification** : Requise

### Requête

```json
{
  "followerId": "user_67890",
  "action": "accept"
}
```

Valeurs pour `action` : `"accept"` ou `"refuse"`.

### Réponse (200 OK)

```json
{
  "success": true
}
```
