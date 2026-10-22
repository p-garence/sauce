---
title: Commentaires & Réactions
description: Fiches de référence du système de discussion, réponses hiérarchiques et saisie multimédia.
---

## 1. `CommentSection.svelte`

- **Fichier** : `src/lib/components/comments/CommentSection.svelte`
- **Domaine** : Commentaires
- **Responsabilité(s)** : Volet dépliable affichant la liste paginée et triée des commentaires d'une publication (`CommentItem`), gérant le chargement par curseur et intégrant le compositeur de saisie (`CommentComposer`).

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `postId` | `string` | Requis | Identifiant de la publication ciblée. |
| `isOpen` | `boolean` | `false` | État d'ouverture du volet (liable via `bind:isOpen`). |
| `onCommentAdded` | `() => void` | `undefined` | Callback lors de la publication réussie d'un nouveau commentaire. |
| `onCommentDeleted` | `(deletedCount: number) => void` | `undefined` | Callback lors de la suppression d'un commentaire (actualise le compteur du post). |

### Dépendances
- **Stores & États globaux** : Aucun état global
- **APIs réseau** : `GET /api/comments?postId=...` pour charger les pages de commentaires.

---

## 2. `CommentBaseItem.svelte`

- **Fichier** : `src/lib/components/comments/CommentBaseItem.svelte`
- **Domaine** : Commentaires
- **Responsabilité(s)** : Composant atomique factorisé pour un commentaire racine ou une réponse : affichage de l'auteur avec lien profil, date relative (`FormattedDate`), texte enrichi (`RichContent`), likes optimistes, édition inline avec mentions et émojis, et suppression.

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `comment` | `CommentData` | Requis | Données du commentaire (liable via `bind:comment`). |
| `isReply` | `boolean` | `false` | Vrai s'il s'agit d'une réponse imbriquée de second niveau. |
| `onReply` | `() => void` | `undefined` | Callback déclenché pour répondre spécifiquement à ce commentaire. |
| `onDeleted` | `(id: string, softDeleted?: boolean) => void` | `undefined` | Callback notifié après suppression effective. |
| `onUpdated` | `(updated: CommentData) => void` | `undefined` | Callback notifié après modification du texte. |
| `children` | `Snippet` | `undefined` | Fente pour intégrer la liste récursive des sous-réponses. |

### Dépendances
- **Stores & États globaux** : Lit l'utilisateur connecté via `page.state.sessionUser`.
- **APIs réseau** : `POST /api/comments/like`, `PATCH /api/comments/[id]`, `DELETE /api/comments/[id]`.

---

## 3. `CommentComposer.svelte`

- **Fichier** : `src/lib/components/comments/CommentComposer.svelte`
- **Domaine** : Commentaires
- **Responsabilité(s)** : Formulaire de rédaction de commentaire ou de réponse avec support du texte enrichi, suggestions de mentions `@utilisateur`, sélecteur d'émojis personnalisés et envoi asynchrone sans rechargement.

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `postId` | `string` | Requis | Identifiant de la publication cible. |
| `replyTo` | `{ id: string; username: string } \| null` | `null` | Cible de réponse active (liable via `bind:replyTo`). |
| `onCommentSubmitted` | `(added: CommentData) => void` | `undefined` | Callback déclenché à l'ajout réussi d'un commentaire. |
| `onCancelReply` | `() => void` | `undefined` | Callback pour annuler le mode réponse ciblé. |

### Dépendances
- **Stores & États globaux** : `page.state.sessionUser` pour vérifier l'authentification.
- **APIs réseau** : `POST /api/comments` pour la création du commentaire.
