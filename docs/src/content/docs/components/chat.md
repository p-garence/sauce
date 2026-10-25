---
title: Messagerie & Chat
description: Fiches de référence des composants de messagerie instantanée directe et de groupe.
---

## 1. `ChatHeader.svelte`

- **Fichier** : `src/lib/components/chat/ChatHeader.svelte`
- **Domaine** : Messagerie
- **Responsabilité(s)** : En-tête de conversation affichant l'avatar, le titre du salon (pseudo du correspondant ou nom du groupe), le statut de sourdine, le bouton d'abonnement rapide (`FollowButton`) et le menu d'actions (sourdine, suppression, quitter).

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `chatId` | `string` | Requis | Identifiant de la conversation. |
| `type` | `'direct' \| 'group'` | Requis | Type de salon (direct ou groupe). |
| `title` | `string` | Requis | Nom du correspondant ou du groupe. |
| `image` | `string \| null` | `null` | URL de l'avatar ou de la photo de groupe. |
| `description` | `string \| null` | `null` | Description du groupe si applicable. |
| `isMuted` | `boolean` | `false` | Statut de mise en sourdine locale de la discussion. |
| `otherUserId` | `string \| null` | `null` | Identifiant de l'interlocuteur direct. |
| `otherUserUsername` | `string \| null` | `null` | Pseudo de l'interlocuteur pour lien profil. |
| `canGoBack` | `boolean` | `false` | Indique si le bouton retour doit utiliser l'historique ou aller à `/chat`. |
| `chatActions` | `MenuAction[]` | `[]` | Liste des actions du menu déroulant. |
| `onBack` | `(e: MouseEvent) => void` | `undefined` | Callback lors du clic sur le bouton retour. |

### Dépendances
- **Stores & États globaux** : Aucun état global
- **APIs réseau** : Aucune directe

---

## 2. `ChatMessageItem.svelte`

- **Fichier** : `src/lib/components/chat/ChatMessageItem.svelte`
- **Domaine** : Messagerie
- **Responsabilité(s)** : Bulle de message unifiée affichant le texte avec mentions, les vignettes de stories répondues, les pièces jointes (images, vidéos, fichiers avec taille), le lecteur vocal (`VoiceMessagePlayer`), l'édition inline et les actions (modifier, supprimer).

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `message` | `ChatMessage` | Requis | Données du message (id, expéditeur, texte, média, vocal, horodatage, statut). |
| `currentUserId` | `string` | Requis | Identifiant de l'utilisateur connecté (pour déterminer expéditeur vs destinataire). |
| `currentUsername` | `string` | `undefined` | Pseudo de l'utilisateur pour surligner les mentions directes. |
| `chatType` | `'direct' \| 'group'` | Requis | Contexte de discussion (affiche l'avatar/nom en groupe). |
| `isEditing` | `boolean` | `false` | Vrai si le message est actuellement en cours d'édition inline. |
| `isSavingEdit` | `boolean` | `false` | Vrai pendant la requête réseau de sauvegarde de l'édition. |
| `userFavoriteEmojis` | `EmojiItem[]` | `undefined` | Liste des emojis favoris pour la barre de réaction. |
| `onToggleReaction` | `(message: ChatMessage, emoji: EmojiItem) => void` | `undefined` | Callback lors de la sélection ou bascule d'une réaction. |
| `onStartEdit` | `(message: ChatMessage) => void` | `undefined` | Callback pour basculer le message en mode édition. |
| `onCancelEdit` | `() => void` | `undefined` | Callback pour annuler l'édition en cours. |
| `onSaveEdit` | `(messageId: string, newText: string) => void` | `undefined` | Callback pour enregistrer le texte modifié. |
| `onDelete` | `(messageId: string) => void` | `undefined` | Callback pour demander la suppression du message. |

### Dépendances
- **Stores & États globaux** : Aucun état global
- **APIs réseau** : Aucune directe (déléguée aux callbacks et formulaires).

---

## 3. `ChatInputBar.svelte`

- **Fichier** : `src/lib/components/chat/ChatInputBar.svelte`
- **Domaine** : Messagerie
- **Responsabilité(s)** : Barre de saisie multifonction supportant l'écriture de texte enrichi avec suggestions de mentions `@`, l'insertion d'émojis custom, la prévisualisation de pièces jointes (fichiers ou vocaux) et la soumission sans rechargement.

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `chatId` | `string` | Requis | Identifiant du chat actif. |
| `selectedFile` | `File \| null` | `null` | Fichier prêt à être envoyé (liable via `bind:selectedFile`). |
| `selectedFilePreview` | `string \| null` | `null` | URL locale pour l'aperçu image du fichier. |
| `recordedAudioUrl` | `string \| null` | `null` | URL blob de l'audio enregistré prêt à l'envoi. |
| `isRecording` | `boolean` | `false` | Indique si l'enregistreur vocal est actuellement en action. |
| `onToggleVoiceRecording` | `() => void` | Requis | Bascule l'activation de l'enregistreur vocal. |
| `onMessageSent` | `(msg: ChatMessage) => void` | `undefined` | Callback notifié à l'envoi réussi d'un nouveau message. |

### Dépendances
- **Stores & États globaux** : Aucun état global
- **APIs réseau** : Soumission via action de formulaire `?/sendMessage`.

---

## 4. `ChatAudioRecorder.svelte`

- **Fichier** : `src/lib/components/chat/ChatAudioRecorder.svelte`
- **Domaine** : Messagerie & Audio
- **Responsabilité(s)** : Module d'enregistrement vocal en direct via l'API WebRTC MediaRecorder : chronomètre, barres d'onde animées et contrôles d'arrêt/annulation/envoi direct.

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `isRecording` | `boolean` | `false` | État d'enregistrement actif (liable via `bind:isRecording`). |
| `onRecordingComplete` | `(file: File, url: string, autoSend: boolean) => void` | Requis | Callback délivrant le fichier audio produit (.webm/.ogg) et son URL locale. |
| `onCancel` | `() => void` | `undefined` | Callback déclenché à l'annulation de l'enregistrement. |

### Dépendances
- **Stores & États globaux** : Aucun état global
- **APIs réseau** : Aucune (capture 100% locale navigateur).

---

## 5. `ChatMessageRequestsBanner.svelte`

- **Fichier** : `src/lib/components/chat/ChatMessageRequestsBanner.svelte`
- **Domaine** : Messagerie & Sécurité
- **Responsabilité(s)** : Bandeaux d'information et d'actions pour la modération des messages entrants : demandes d'inconnus à accepter ou refuser, avertissements de blocage réciproque ou autorisation d'envoi d'un premier message d'introduction.

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `title` | `string` | Requis | Nom de l'interlocuteur ou du salon. |
| `amIBlocked` | `boolean` | `false` | Vrai si le membre connecté a bloqué cet interlocuteur. |
| `targetBlocked` | `boolean` | `false` | Vrai si l'interlocuteur a bloqué le membre connecté. |
| `amIRefused` | `boolean` | `false` | Vrai si le membre connecté a refusé la demande. |
| `targetRefused` | `boolean` | `false` | Vrai si l'interlocuteur a refusé la demande. |
| `targetPending` | `boolean` | `false` | Vrai si la demande d'accès est en attente chez l'interlocuteur. |
| `amIPending` | `boolean` | `false` | Vrai si une demande reçue attend notre validation. |
| `hasSentMessages` | `boolean` | `false` | Vrai si l'utilisateur connecté a déjà envoyé un message. |
| `canWrite` | `boolean` | `true` | Autorise ou bloque la saisie de messages. |
| `onIntroSent` | `(msg: ChatMessage) => void` | `undefined` | Callback lors de l'envoi d'un message d'introduction. |

### Dépendances
- **Stores & États globaux** : Aucun état global
- **APIs réseau** : Actions de formulaire `?/acceptRequest` et `?/refuseRequest`.

---

## 6. `MessageReactionBar.svelte`

- **Fichier** : `src/lib/components/chat/MessageReactionBar.svelte`
- **Domaine** : Messagerie & Réactions
- **Responsabilité(s)** : Barre flottante d'emojis favoris s'ouvrant sur appui long (long-press tactile mobile) ou via l'option "Réagir" du menu `...` (sur PC et mobile) au-dessus de la bulle de message. Permet d'ajouter ou retirer une réaction d'un clic, ou de rediriger vers les paramètres d'emojis (`/parametres?tab=emojis`) si l'utilisateur n'a aucun favori configuré.

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `favoriteEmojis` | `EmojiItem[]` | `[]` | Liste des emojis favoris de l'utilisateur connecté (résolus même si leur collection d'origine est désactivée). |
| `align` | `'left' \| 'right'` | `'left'` | Positionnement de la barre (droite pour messages envoyés, gauche pour reçus). |
| `onSelect` | `(emoji: EmojiItem) => void` | Requis | Callback exécuté lors du clic sur un emoji. |
| `onClose` | `() => void` | Requis | Callback pour fermer la barre flottante. |

### Dépendances
- **Composants** : `Icon.svelte`
- **Navigation** : Lien vers `resolve('/parametres?tab=emojis')`

---

## 7. `MessageReactionsModal.svelte`

- **Fichier** : `src/lib/components/chat/MessageReactionsModal.svelte`
- **Domaine** : Messagerie & Réactions
- **Responsabilité(s)** : Modale affichant la liste complète des participants ayant réagi à un message, ouverte au clic sur le badge de réaction centré en bas de la bulle de message (style Instagram). Propose un filtrage par onglet d'émoji ("Tous", "❤️", etc.), l'avatar et profil de chaque utilisateur, le retrait direct de sa propre réaction, et une rangée d'émojis favoris pour réagir immédiatement.

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `isOpen` | `boolean` | `false` | Détermine l'affichage de la modale. |
| `onClose` | `() => void` | Requis | Callback de fermeture (croix, touche Échap ou clic hors cadre). |
| `reactions` | `MessageReactionGroup[]` | `[]` | Groupes de réactions du message avec liste des participants et compteurs. |
| `currentUserId` | `string` | Requis | Identifiant de l'utilisateur connecté pour identifier sa réaction et permettre son retrait. |
| `favoriteEmojis` | `EmojiItem[]` | `[]` | Émojis favoris de l'utilisateur pour la barre de réaction rapide en pied de modale. |
| `onToggleReaction` | `(emoji: EmojiItem) => void` | `undefined` | Callback pour ajouter ou retirer une réaction. |

### Dépendances
- **Composants** : `Icon.svelte`
- **Navigation** : Liens profils vers `resolve('/profil/${username}')` et `/parametres?tab=emojis`


