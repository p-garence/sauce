---
title: Endpoints Messagerie & Chat
description: Spécification des routes API pour initialiser des conversations directes ou de groupe, charger l'historique et gérer les messages.
---

## 1. Ouvrir une discussion directe

- **Méthode** : `GET`
- **Chemin** : `/api/chat/direct/[username]`
- **Authentification** : Requise

Récupère la conversation directe existante entre l'utilisateur connecté et le destinataire ciblé, ou en crée une nouvelle sans doublon.

### Réponse (200 OK)

```json
{
  "chatId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
```

---

## 2. Créer un groupe de discussion

- **Méthode** : `POST`
- **Chemin** : `/api/chat/group/create`
- **Authentification** : Requise

### Requête

```json
{
  "name": "Équipe Projet",
  "description": "Discussion technique du projet",
  "participantIds": ["u_123", "u_456"]
}
```

### Réponse (200 OK)

```json
{
  "success": true,
  "chatId": "7c9e6679-7425-40de-944b-e07fc1f90ae7"
}
```

---

## 3. Charger l'historique des messages

- **Méthode** : `GET`
- **Chemin** : `/api/chat/history?chatId={id}&before={isoTimestamp}&limit=30`
- **Authentification** : Requise (Membre du salon uniquement)

Alimente la pagination ascendante lors du défilement vers le haut dans la conversation.

### Réponse (200 OK)

```json
{
  "messages": [
    {
      "id": "msg_123",
      "senderId": "u_abc",
      "content": "Bonjour à tous !",
      "mediaUrl": null,
      "audioUrl": null,
      "createdAt": "2026-10-10T14:30:00.000Z",
      "isRead": true
    }
  ],
  "hasMore": false
}
```

---

## 4. Marquer une conversation comme lue

- **Méthode** : `POST`
- **Chemin** : `/api/chat/read`
- **Authentification** : Requise

### Requête

```json
{
  "chatId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
```

### Réponse (200 OK)

```json
{
  "success": true
}
```

---

## 5. Modifier un message envoyé

- **Méthode** : `PATCH`
- **Chemin** : `/api/chat/messages/[id]`
- **Authentification** : Requise (Auteur du message uniquement)

### Requête

```json
{
  "content": "Texte corrigé du message"
}
```

### Réponse (200 OK)

```json
{
  "success": true,
  "message": {
    "id": "msg_123",
    "content": "Texte corrigé du message",
    "updatedAt": "2026-10-10T14:35:00.000Z"
  }
}
```

---

## 6. Supprimer un message envoyé

- **Méthode** : `DELETE`
- **Chemin** : `/api/chat/messages/[id]`
- **Authentification** : Requise (Auteur du message uniquement)

### Réponse (200 OK)

```json
{
  "success": true
}
```
