---
title: Messagerie & Chat
description: Fiches de référence des composants de messagerie instantanée directe et de groupe.
---

## 1. `ChatHeader.svelte`

- **Domaine** : Messagerie
- **Responsabilité(s)** : En-tête de conversation affichant les avatars, le nom du correspondant ou du groupe, le statut en ligne/sourdine et le menu d'actions (infos, mute, quitter).

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `chat` | `ChatInfo` | Requis | Informations sur la conversation (titre, participants, type direct/groupe). |
| `isMuted` | `boolean` | `false` | Statut de mise en sourdine locale de la discussion. |
| `onaction` | `(action: string) => void` | `undefined` | Callback lors du clic sur une option du menu d'actions. |

### Dépendances
- **Stores & États globaux** : Aucun état global
- **APIs réseau** : Aucune

---

## 2. `ChatMessageItem.svelte`

- **Domaine** : Messagerie
- **Responsabilité(s)** : Bulle de message affichant le texte avec mentions `@`, les images ou le lecteur audio vocal, le statut de lecture et les actions (répondre, modifier, supprimer).

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `message` | `ChatMessage` | Requis | Données du message (expéditeur, texte, média, vocal, horodatage, statut). |
| `isOwn` | `boolean` | `false` | Vrai si le message a été envoyé par l'utilisateur connecté. |
| `onreply` | `(msg: ChatMessage) => void` | `undefined` | Callback pour citer le message en réponse. |
| `ondelete` | `(id: string) => void` | `undefined` | Callback pour supprimer son propre message. |

### Dépendances
- **Stores & États globaux** : Aucun état global
- **APIs réseau** : Aucune directe

---

## 3. `ChatInputBar.svelte`

- **Domaine** : Messagerie
- **Responsabilité(s)** : Barre de saisie inférieure supportant l'écriture avec autocomplétion des mentions, l'insertion d'émojis, la sélection de photos/fichiers et le déclenchement de l'enregistreur vocal.

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `disabled` | `boolean` | `false` | Désactive la saisie (ex: discussion bloquée ou demande en attente). |
| `onsend` | `(payload: { text: string; mediaUrl?: string }) => void` | Requis | Notification d'envoi du message texte ou média. |
| `onrecordvoice` | `(audioBlob: Blob) => void` | Requis | Envoi d'un mémo vocal enregistré. |

### Dépendances
- **Stores & États globaux** : Aucun état global
- **APIs réseau** : Aucune directe (déléguée au contrôleur de page).

---

## 4. `ChatAudioRecorder.svelte`

- **Domaine** : Messagerie & Audio
- **Responsabilité(s)** : Enregistrement micro en direct, affichage du temps écoulé, bouton d'annulation et bouton d'envoi rapide.

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `oncomplete` | `(blob: Blob) => void` | Requis | Transmet l'audio enregistré au format WebM / Opus. |
| `oncancel` | `() => void` | Requis | Annule l'enregistrement en cours et libère le micro. |

### Dépendances
- **Stores & États globaux** : Aucun état global
- **APIs réseau** : Aucune (capture locale MediaRecorder).

---

## 5. `ChatMessageRequestsBanner.svelte`

- **Domaine** : Messagerie & Sécurité
- **Responsabilité(s)** : Bandeau affiché lorsqu'une personne non suivie ou inconnue envoie une demande de message, avec options pour accepter ou refuser/bloquer sans révéler la lecture du message.

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `senderName` | `string` | Requis | Nom d'affichage de la personne demanderesse. |
| `onaccept` | `() => void` | Requis | Callback pour accepter la demande et débloquer les échanges. |
| `ondecline` | `() => void` | Requis | Callback pour refuser ou supprimer la conversation. |

### Dépendances
- **Stores & États globaux** : Aucun état global
- **APIs réseau** : Aucune
