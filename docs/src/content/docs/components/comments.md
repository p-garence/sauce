---
title: Commentaires & Réactions
description: Fiches de référence du système de discussion, réponses hiérarchiques et saisie multimédia.
---

## 1. `CommentSection.svelte`

- **Domaine** : Commentaires
- **Responsabilité(s)** : Volet repliable affichant la liste des commentaires d'un post, la pagination des pages et l'intégration du compositeur.

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `postId` | `string` | Requis | Identifiant du post parent. |
| `isOpen` | `boolean` | `false` | État d'ouverture du volet de commentaires. |
| `currentUserId` | `string \| null` | `null` | Utilisateur authentifié. |
| `onclose` | `() => void` | `undefined` | Callback lors de la fermeture du volet. |

### Dépendances
- **Stores & États globaux** : Aucun état global
- **APIs réseau** : `GET /api/comments?postId=...` pour le chargement des commentaires.

---

## 2. `CommentBaseItem.svelte`

- **Domaine** : Commentaires
- **Responsabilité(s)** : Rendu unifié d'un commentaire ou d'une réponse : avatar, auteur, horodatage, contenu texte riche avec mentions, message vocal, like optimiste, édition inline et suppression.

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `comment` | `CommentData` | Requis | Données du commentaire (id, auteur, texte, vocal, likes, date). |
| `currentUserId` | `string \| null` | `null` | Identifiant de l'utilisateur courant. |
| `isReply` | `boolean` | `false` | Adapte l'indentation et la taille des boutons pour une sous-réponse. |
| `onreply` | `(comment: CommentData) => void` | `undefined` | Invoqué lors du clic sur le bouton Répondre. |
| `ondelete` | `(id: string) => void` | `undefined` | Notification de suppression du commentaire. |

### Dépendances
- **Stores & États globaux** : Aucun état global
- **APIs réseau** : `POST/DELETE /api/comments/like`, `PATCH/DELETE /api/comments/[id]`.

---

## 3. `CommentComposer.svelte`

- **Domaine** : Commentaires
- **Responsabilité(s)** : Formulaire de saisie de commentaire ou réponse avec support du texte enrichi, suggestions de mentions `@`, sélecteur d'émojis et enregistrement d'un mémo vocal.

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `postId` | `string` | Requis | Identifiant de la publication cible. |
| `replyTo` | `CommentData \| null` | `null` | Commentaire parent auquel l'utilisateur répond, ou `null` pour un commentaire racine. |
| `onsubmit` | `(newComment: CommentData) => void` | Requis | Callback notifié à la création effective du commentaire. |
| `oncancelreply` | `() => void` | `undefined` | Annule le mode réponse en cours. |

### Dépendances
- **Stores & États globaux** : Aucun état global
- **APIs réseau** : `POST /api/comments` et `POST /api/upload` (pour le message vocal).
