---
title: Endpoints Instances & Réseau
description: Spécification des routes API pour le répertoire des instances et serveurs du réseau.
---

L'annuaire des instances sous `/api/instances` répertorie les domaines des serveurs connus et leur niveau de confiance.

---

## 1. Lister les instances

- **Méthode** : `GET`
- **Chemin** : `/api/instances`
- **Authentification** : Publique

### Réponse (200 OK)

```json
[
  {
    "id": "i_abc123",
    "domain": "social.example.org",
    "trustLevel": "known",
    "addedAt": "2026-10-10T14:00:00.000Z"
  }
]
```

---

## 2. Enregistrer une instance

- **Méthode** : `POST`
- **Chemin** : `/api/instances`
- **Authentification** : Requise (Rôle `admin`)

### Requête

```json
{
  "domain": "instance2.mon-reseau.fr",
  "trustLevel": "known"
}
```

---

## 3. Modifier le niveau de confiance

- **Méthode** : `PATCH`
- **Chemin** : `/api/instances/[id]`
- **Authentification** : Requise (Rôle `admin`)

### Requête

```json
{
  "trustLevel": "ally"
}
```

*Niveaux de confiance possibles* : `"fusion"`, `"ally"`, `"known"`, `"accessible"`, `"banned"`.

---

## 4. Retirer une instance

- **Méthode** : `DELETE`
- **Chemin** : `/api/instances/[id]`
- **Authentification** : Requise (Rôle `admin`)

### Réponse (200 OK)

```json
{
  "success": true,
  "deletedInstanceId": "i_abc123"
}
```
