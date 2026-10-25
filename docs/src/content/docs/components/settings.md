---
title: Paramètres & Personnalisation
description: Fiches de référence des panneaux de gestion de compte, quotas médias, flux, groupes et assets.
---

## 1. `SettingsMedia.svelte` & `StorageQuotaCard.svelte`

- **Domaine** : Paramètres & Stockage
- **Responsabilité(s)** : Suivi en temps réel de l'espace disque consommé par rapport au quota maximal, ventilation détaillée (posts, stories, messages de chat, assets) et outils de suppression ciblée.

### Props (`SettingsMedia.svelte`)

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `quotaBytes` | `number` | Requis | Quota maximal alloué en octets. |
| `usedBytes` | `number` | Requis | Espace total actuellement occupé sur le serveur. |
| `postsMedia` | `MediaPostItem[]` | `[]` | Liste des publications avec leur poids calculé. |

### Dépendances
- **Stores & États globaux** : Aucun état global
- **APIs réseau** : `DELETE /api/posts/[id]` et suppression physique des fichiers.

---

## 2. `SettingsFeeds.svelte` & `FeedConfigForm.svelte`

- **Domaine** : Paramètres & Flux
- **Responsabilité(s)** : Formulaire unifié de configuration pour créer ou modifier un flux personnalisé (nom, filtres de visibilité, exclusion des posts vus, inclusion de flux RSS distants).

### Props (`FeedConfigForm.svelte`)

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `feed` | `FeedConfigInput \| null` | `null` | Configuration du flux existant en cas de modification, ou `null` pour création. |
| `availableRssSources` | `RssSourceItem[]` | `[]` | Liste des sources de flux RSS disponibles sur l'instance. |
| `onsubmit` | `(data: FeedConfigInput) => void` | Requis | Callback de validation du formulaire. |
| `oncancel` | `() => void` | `undefined` | Callback d'annulation. |

### Dépendances
- **Stores & États globaux** : Aucun état global
- **APIs réseau** : Aucune directe (soumission via actions de formulaire SvelteKit).

---

## 3. `SettingsEmojis.svelte` & `SettingsIcons.svelte`

- **Domaine** : Personnalisation
- **Responsabilité(s)** : Gestion des collections d'émojis et packs d'icônes SVG (création de pack, ajout d'items, publication dans la bibliothèque collective, activation/désactivation).

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `myPacks` | `AssetPackInfo[]` | `[]` | Packs créés par l'utilisateur connecté. |
| `savedPacks` | `AssetPackInfo[]` | `[]` | Packs tiers enregistrés depuis la bibliothèque de l'instance. |
| `activePackId` | `string \| null` | `null` | Pack actuellement activé pour l'interface de l'utilisateur. |

### Dépendances
- **Stores & États globaux** : Met à jour `emojiStore.svelte.ts` lors de l'activation/sélection.
- **APIs réseau** : Endpoints REST `/api/emoji-sets` et `/api/icon-sets`.

---

## 4. `SettingsPrivacy.svelte` & `SettingsGroups.svelte`

- **Domaine** : Confidentialité & Relations
- **Responsabilité(s)** : Configuration de l'approbation des abonnés, modération des messages entrants, visibilité des listes de relations, blocage d'utilisateurs et création de groupes d'amis.

### Dépendances
- **Stores & États globaux** : Aucun état global
- **APIs réseau** : `POST ?/updatePrivacyToggles`, `POST /api/users/block`, `POST /api/groups/members`.
