---
title: Paramètres & Personnalisation
description: Fiches de référence des panneaux de gestion de compte, quotas médias, flux, groupes et assets.
---

## 1. `SettingsGeneral.svelte` & `SettingsRow.svelte`

- **Fichiers** : `src/lib/components/settings/SettingsGeneral.svelte` & `src/lib/components/settings/ui/SettingsRow.svelte`
- **Domaine** : Paramètres & Compte
- **Responsabilité(s)** : Affichage protégé des identifiants (pseudo et e-mail du compte) sous forme de lignes informatives avec boutons d'édition dédiés, formulaires de mise à jour isolés (`?/updateUsername`, `?/updateEmail`), réglage des comportements de l'application (double-tap pour aimer), raccourci d'administration et déconnexion.

### Props (`SettingsGeneral.svelte`)

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `user` | `User` | Requis | Données de l'utilisateur connecté (`username`, `email`, `doubleTap`, `role`). |
| `form` | `FormResult` | `undefined` | Retours de soumission des actions SvelteKit (`usernameSuccess`, `emailSuccess`, etc.). |

### Props (`SettingsRow.svelte`)

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `title` | `string` | Requis | Libellé ou titre du paramètre. |
| `value` | `string` | `undefined` | Valeur actuelle affichée. |
| `description` | `string` | `undefined` | Description ou précision sous le titre. |
| `action` | `Snippet` | `undefined` | Bouton d'action ou élément interactif affiché à droite. |

### Dépendances
- **APIs réseau** : `GET /api/users/check-username?username=...` pour la vérification de disponibilité en temps réel.
- **Actions SvelteKit** : `?/updateUsername`, `?/updateEmail`, `?/updateAccountInfo` et `?/updateBehaviorToggles`.

---

## 2. `SettingsMedia.svelte` & `StorageQuotaCard.svelte`

- **Fichier** : `src/lib/components/settings/SettingsMedia.svelte` & `src/lib/components/settings/media/StorageQuotaCard.svelte`
- **Domaine** : Paramètres & Stockage
- **Responsabilité(s)** : Suivi en temps réel de l'espace disque consommé par rapport au quota alloué, ventilation détaillée (posts, stories, messages de chat, assets) et outils de suppression ciblée.

### Props (`SettingsMedia.svelte`)

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `mediaUsage` | `UserMediaUsage` | `undefined` | Données agrégées d'utilisation de l'espace de stockage. |
| `currentUser` | `{ id: string; username: string \| null; name: string \| null; image: string \| null }` | `undefined` | Profil de l'utilisateur connecté. |
| `userGroups` | `UserGroup[]` | `[]` | Groupes de l'utilisateur pour le filtrage des stories. |

### Props (`StorageQuotaCard.svelte`)

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `currentUsedBytes` | `number` | Requis | Octets consommés sur le serveur. |
| `quotaBytes` | `number` | Requis | Quota maximal attribué en octets. |
| `usedPercentage` | `number` | Requis | Pourcentage d'utilisation calculé (0 à 100). |
| `progressColor` | `string` | Requis | Couleur dynamique de la jauge (vert, orange ou rouge). |

### Dépendances
- **Stores & États globaux** : Aucun état global
- **APIs réseau** : `DELETE /api/posts/[id]` et actions de formulaire `?/deleteMedia`.

---

## 2. `SettingsFeeds.svelte` & `FeedConfigForm.svelte`

- **Fichier** : `src/lib/components/settings/SettingsFeeds.svelte` & `src/lib/components/settings/feeds/FeedConfigForm.svelte`
- **Domaine** : Paramètres & Flux
- **Responsabilité(s)** : Formulaire unifié de configuration pour créer ou modifier un flux personnalisé (nom, filtres de visibilité, sources blend de fusion, tags tendance et flux RSS).

### Props (`FeedConfigForm.svelte`)

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `feed` | `UserFeed \| null` | `null` | Configuration du flux existant en modification, ou `null` pour création. |
| `feeds` | `UserFeed[]` | Requis | Liste de tous les flux de l'utilisateur pour la composition blend. |
| `groups` | `UserGroup[]` | `[]` | Groupes d'amis pour le filtrage d'audience. |
| `trendingTags` | `Array<{ name: string; count?: number }>` | `[]` | Suggestions de tags populaires cliquables. |
| `onCancel` | `() => void` | Requis | Callback d'annulation de la saisie. |
| `onSuccess` | `() => void` | Requis | Callback déclenché après soumission réussie. |

### Dépendances
- **Stores & États globaux** : `feedMemory.svelte.ts` pour réinitialiser le cache local après modification.
- **APIs réseau** : Actions de formulaire SvelteKit `?/createFeed` et `?/updateFeed`.

---

## 3. `SettingsEmojis.svelte` & `SettingsIcons.svelte`

- **Fichier** : `src/lib/components/settings/SettingsEmojis.svelte` & `src/lib/components/settings/SettingsIcons.svelte`
- **Domaine** : Personnalisation
- **Responsabilité(s)** : Gestion des collections d'émojis et packs d'icônes SVG (création de pack, ajout d'items, publication dans la bibliothèque collective de l'instance, activation/désactivation).

### Structure & Props
Ces panneaux sont des composants autonomes connectés aux endpoints REST d'assets. Ils ne requièrent aucune prop obligatoire et orchestrent leurs cartes modulaires (`AssetLibraryTabs`, `AssetPackCard`, `EmojiFavoritesCard`, `EmojiSetEditorModal`, `IconSetEditorModal`).

### Dépendances
- **Stores & États globaux** : `emojiStore.svelte.ts` pour l'application instantanée des packs activés.
- **APIs réseau** : Endpoints `/api/emoji-sets` et `/api/icon-sets` (activation, favoris, publication).

---

## 4. `SettingsPrivacy.svelte` & `SettingsGroups.svelte`

- **Fichier** : `src/lib/components/settings/SettingsPrivacy.svelte` & `src/lib/components/settings/SettingsGroups.svelte`
- **Domaine** : Confidentialité & Relations
- **Responsabilité(s)** : Configuration de l'approbation des abonnés, modération des messages entrants, visibilité des listes de relations, blocage d'utilisateurs (`PrivacyBlockedUsersCard`) et création de groupes d'amis (`GroupCreateCard`, `GroupItemCard`).

### Props (`SettingsPrivacy.svelte`)

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `user` | `User` | Requis | Données de l'utilisateur et ses préférences de visibilité actuelles. |
| `form` | `FormResult` | `undefined` | Retour de soumission d'action de formulaire. |
| `groups` | `UserGroup[]` | `[]` | Groupes de l'utilisateur pour la visibilité rétroactive. |
| `blockedUsers` | `BlockedUserItem[]` | `[]` | Liste des profils bloqués par l'utilisateur. |

### Props (`SettingsGroups.svelte`)

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `groups` | `UserGroup[]` | `[]` | Liste des groupes créés par l'utilisateur. |

### Dépendances
- **Stores & États globaux** : Aucun état global
- **APIs réseau** : Actions de formulaire `?/updatePrivacyToggles`, `POST /api/users/block`, `POST /api/groups/members`.
