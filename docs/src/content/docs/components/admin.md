---
title: Administration & Système
description: Fiches de référence des modules d'administration de l'instance et de modération.
---

## 1. Vue d'Ensemble du Panneau Admin

L'interface d'administration accessible sur `/admin` est strictement réservée aux utilisateurs disposant du rôle `admin`. Elle est découpée en onglets modulaires situés dans `src/lib/components/admin/`.

---

## 2. `AdminUsersTab.svelte`

- **Domaine** : Administration & Utilisateurs
- **Responsabilité(s)** : Recherche d'utilisateurs, consultation des rôles, promotion/rétrogradation d'administrateurs, suspension de compte ou réinitialisation d'accès.

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `users` | `AdminUserSummary[]` | `[]` | Liste paginée des utilisateurs enregistrés sur l'instance. |
| `onupdaterole` | `(userId: string, role: string) => void` | Requis | Callback lors du changement de rôle d'un membre. |

### Dépendances
- **Stores & États globaux** : Aucun état global
- **APIs réseau** : `PATCH /api/admin/users/[id]`.

---

## 3. `AdminPostsTab.svelte` & `AdminStoriesTab.svelte`

- **Domaine** : Modération
- **Responsabilité(s)** : Surveillance des publications récentes et stories éphémères, filtrage par statut ou auteur, et suppression définitive de contenus litigieux avec suppression immédiate des fichiers médias associés.

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `items` | `Array<AdminPost \| AdminStory>` | `[]` | Liste des contenus pour modération. |
| `ondelete` | `(id: string) => void` | Requis | Déclenchement de la suppression admin. |

### Dépendances
- **Stores & États globaux** : Aucun état global
- **APIs réseau** : `DELETE /api/admin/posts` et `DELETE /api/admin/stories`.

---

## 4. `AdminStorageTab.svelte`

- **Domaine** : Maintenance Système
- **Responsabilité(s)** : Diagnostic global du disque serveur, taille cumulée des dossiers `uploads/` et `postgres/`, détection et nettoyage des fichiers orphelins (médias non référencés depuis plus de 24h).

### Dépendances
- **Stores & États globaux** : Aucun état global
- **APIs réseau** : Endpoints de diagnostic serveur.

---

## 5. `AdminAppearance.svelte`

- **Domaine** : Personnalisation Globale
- **Responsabilité(s)** : Gestion des packs d'émojis et icônes officiels fournis par défaut à l'ensemble des membres de l'instance, avec activation globale en un clic.

### Dépendances
- **Stores & États globaux** : Met à jour la configuration d'apparence de l'instance.
- **APIs réseau** : `POST /api/admin/appearance`.
