---
title: Administration & Système
description: Fiches de référence des modules d'administration de l'instance et de modération.
---

## 1. Vue d'Ensemble du Panneau Admin

L'interface d'administration accessible sur `/admin` est strictement réservée aux utilisateurs disposant du rôle `admin`. Elle est découpée en onglets modulaires situés dans `src/lib/components/admin/`.

---

## 2. `AdminUsersTab.svelte`

- **Fichier** : `src/lib/components/admin/AdminUsersTab.svelte`
- **Domaine** : Administration & Utilisateurs
- **Responsabilité(s)** : Recherche d'utilisateurs avec filtrage instantané par pseudo/nom/email, modification des quotas d'upload, attribution de clés d'invitation, bannissement réactif ou promotion en administrateur.

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `users` | `AdminUserItem[]` | `[]` | Liste complète des utilisateurs enregistrés sur l'instance. |

### Dépendances
- **Stores & États globaux** : Aucun état global
- **APIs réseau** : Actions de formulaire SvelteKit `?/banUser`, `?/updateUserQuota`, `?/addInvites`, `?/deleteUser`.

---

## 3. `AdminPostsTab.svelte` & `AdminStoriesTab.svelte`

- **Fichier** : `src/lib/components/admin/AdminPostsTab.svelte` & `src/lib/components/admin/AdminStoriesTab.svelte`
- **Domaine** : Modération
- **Responsabilité(s)** : Surveillance des publications récentes et stories éphémères de l'instance, pagination dynamique par curseur, filtrage textuel et suppression définitive avec purge immédiate des fichiers médias physiques.

### Props (`AdminPostsTab.svelte`)

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `initialPosts` | `AdminPostItem[]` | Requis | Liste initiale des publications chargées. |
| `initialCursor` | `string \| null` | Requis | Curseur de pagination pour le chargement infini. |
| `totalPosts` | `number` | Requis | Compteur global de publications sur l'instance. |

### Props (`AdminStoriesTab.svelte`)

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `initialStories` | `AdminStoryItem[]` | Requis | Liste initiale des stories chargées. |
| `initialCursor` | `string \| null` | Requis | Curseur de pagination pour le chargement des stories suivantes. |
| `totalStories` | `number` | Requis | Compteur global de stories sur l'instance. |

### Dépendances
- **Stores & États globaux** : Aucun état global
- **APIs réseau** : `DELETE /api/admin/posts` et `DELETE /api/admin/stories`.

---

## 4. `AdminStorageTab.svelte`

- **Fichier** : `src/lib/components/admin/AdminStorageTab.svelte`
- **Domaine** : Maintenance Système
- **Responsabilité(s)** : Diagnostic global de l'espace disque du serveur (libre vs occupé), taille cumulée des dossiers `uploads/` et `postgres/`, détection et nettoyage des fichiers orphelins (médias non référencés depuis plus de 24h).

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `serverStorage` | `ServerStorageData \| null` | Requis | Métriques physiques de l'espace disque serveur. |
| `orphans` | `OrphanMediaData \| null` | Requis | Liste et poids des fichiers médias non référencés. |

### Dépendances
- **Stores & États globaux** : Aucun état global
- **APIs réseau** : `GET /api/admin/media/orphans` et `DELETE /api/admin/media/orphans`.

---

## 5. `AdminAppearance.svelte`

- **Fichier** : `src/lib/components/admin/AdminAppearance.svelte`
- **Domaine** : Personnalisation Globale
- **Responsabilité(s)** : Panneau d'administration de l'apparence orchestrant la sélection des packs d'icônes par défaut (`AdminIconsManager`) et l'activation collective des packs d'émojis officiels (`AdminEmojisManager`).

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `instanceSettings` | `InstanceSettingsData` | Requis | Paramètres globaux de l'instance. |
| `publishedIconSets` | `IconSet[]` | `[]` | Packs d'icônes publics disponibles sur l'instance. |
| `publishedEmojiSets` | `EmojiSet[]` | `[]` | Packs d'émojis publics disponibles sur l'instance. |

### Dépendances
- **Stores & États globaux** : Configuration d'apparence globale.
- **APIs réseau** : `POST /api/admin/appearance`.
