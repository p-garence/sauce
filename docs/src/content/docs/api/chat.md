---
title: Endpoints Messagerie & Chat
description: Spécification des routes API pour créer des conversations et échanger des messages privés.
---

## 1. Créer ou récupérer une discussion

- **Méthode** : `POST`
- **Chemin** : `/api/chats`
- **Authentification** : Requise

### Requête pour un chat direct

```json
{
  "type": "direct",
  "participantIds": ["user_target_id"]
}
```

*Remarque : Si une discussion directe existe déjà entre ces deux utilisateurs, elle est automatiquement retournée sans créer de doublon.*

### Requête pour un chat de groupe

```json
{
  "type": "group",
  "name": "Équipe Projet",
  "participantIds": ["user_1", "user_2", "user_3"]
}
```

---

## 2. Envoyer un message

- **Méthode** : `POST`
- **Chemin** : `/api/chats/[id]/messages`
- **Authentification** : Requise (Participant au chat uniquement)

### Requête

```json
{
  "content": "Bonjour ! Le projet avance très bien."
}
```

### Réponse (201 Created)

```json
{
  "id": "msg_abc123",
  "chatId": "chat_xyz789",
  "senderId": "user_current",
  "content": "Bonjour ! Le projet avance très bien.",
  "createdAt": "2026-10-11T03:15:00.000Z"
}
```

---

## 3. Discussions non lues & Sourdines

- **Méthode** : `GET`
- **Chemin** : `/api/chat/unread`
- **Authentification** : Requise

Retourne la liste des IDs des discussions contenant des messages non lus (excluant les discussions en sourdine sauf si l'utilisateur y a été `@mentionné`), ainsi que la liste des discussions actuellement en sourdine.

### Réponse (200 OK)

```json
{
  "unreadChatIds": ["chat_1", "chat_2"],
  "mutedChatIds": ["chat_3"]
}
```

---

## 4. Suggestions de mentions & Statuts de permission

### Suggestions autocomplétion
- **Méthode** : `GET`
- **Chemin** : `/api/mention-suggestions?q=[query]&chatId=[optionalChatId]`
- **Authentification** : Requise

Retourne jusqu'à 8 suggestions d'utilisateurs autorisant les mentions (`allowMentions !== false`), en priorisant les membres de la discussion (si `chatId` est fourni), puis les abonnements, puis le reste de la communauté.

### Vérification de permission
- **Méthode** : `GET`
- **Chemin** : `/api/mention-status?usernames=alice,bob`
- **Authentification** : Requise

Retourne un dictionnaire `{ [username]: boolean }` indiquant si chaque compte mentionné est valide et autorise les mentions. Si `false`, les liens associés ne doivent pas être cliquables.
