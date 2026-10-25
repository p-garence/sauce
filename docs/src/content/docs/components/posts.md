---
title: Publications & Édition
description: Fiches de référence des composants de l'écosystème de publication (affichage, carrousels, création de slides).
---

## 1. `Post.svelte`

- **Domaine** : Publications
- **Responsabilité(s)** : Carte principale de publication orchestrant l'en-tête utilisateur, le carrousel de slides, la légende textuelle et la barre d'interactions.

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `post` | `FeedPost` | Requis | Objet complet de la publication (auteur, diapositives, compteurs, visibilité). |
| `currentUserId` | `string \| null` | `null` | Identifiant de l'utilisateur connecté pour les permissions d'interaction. |
| `ondelete` | `(id: string) => void` | `undefined` | Callback lors de la suppression de la publication. |

### Dépendances
- **Stores & États globaux** : Aucun état global
- **APIs réseau** : Aucune directe (déléguée aux sous-composants `LikeButton` et `ActionMenu`).

---

## 2. `PostHeader.svelte`

- **Domaine** : Publications
- **Responsabilité(s)** : En-tête affichant l'avatar de l'auteur, son nom, le lien vers le profil, l'indicateur de visibilité et le menu contextuel d'actions.

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `author` | `PostAuthor` | Requis | Profil de l'auteur (id, username, name, avatarUrl). |
| `createdAt` | `string \| Date` | Requis | Date de publication pour l'horodatage relatif. |
| `visibility` | `string` | `"public"` | Niveau de visibilité (`public`, `followers`, `group`). |
| `isOwner` | `boolean` | `false` | Indique si l'utilisateur courant est l'auteur du post. |
| `onaction` | `(action: string) => void` | `undefined` | Callback lors d'une action du menu (masquer, modifier, supprimer). |

### Dépendances
- **Stores & États globaux** : Aucun état global
- **APIs réseau** : Aucune

---

## 3. `PostCarousel.svelte`

- **Domaine** : Publications
- **Responsabilité(s)** : Défilement horizontal fluide des diapositives multimédias avec lecture automatique des vidéos au défilement et pagination.

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `slides` | `PostSlide[]` | Requis | Tableau des diapositives (images, vidéos ou diapositives texte stylisées). |
| `aspectRatio` | `string` | `"1/1"` | Ratio d'affichage contraint du carrousel. |

### Dépendances
- **Stores & États globaux** : Aucun état global
- **APIs réseau** : Streaming des médias

---

## 4. `CarouselSlideEditor.svelte`

- **Domaine** : Édition & Création
- **Responsabilité(s)** : Édition visuelle de la diapositive sélectionnée (saisie de texte enrichi avec mentions, sélecteur d'émojis, alignement du texte ou prévisualisation de média).

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `slide` | `EditableSlide` | Requis | Objet de la slide courante en cours de modification. |
| `onupdate` | `(updated: EditableSlide) => void` | Requis | Callback notifié à chaque changement de texte, média ou style. |
| `onopenmediaeditor` | `() => void` | `undefined` | Déclenche l'ouverture de l'éditeur de dessin et filtres. |

### Dépendances
- **Stores & États globaux** : Aucun état global
- **APIs réseau** : Aucune

---

## 5. `CarouselThumbnailsBar.svelte`

- **Domaine** : Édition & Création
- **Responsabilité(s)** : Barre horizontale affichant les miniatures des diapositives, l'indicateur actif, le réordonnancement et les boutons d'ajout de slides (texte ou média).

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `slides` | `EditableSlide[]` | Requis | Liste ordonnée des diapositives créées. |
| `activeIndex` | `number` | `0` | Index de la slide actuellement sélectionnée. |
| `onselect` | `(index: number) => void` | Requis | Notification du changement de slide active. |
| `onaddslide` | `(type: 'text' \| 'media') => void` | Requis | Ajout d'une nouvelle diapositive. |
| `onremoveslide` | `(index: number) => void` | Requis | Suppression de la diapositive à l'index spécifié. |

### Dépendances
- **Stores & États globaux** : Aucun état global
- **APIs réseau** : Aucune

---

## 6. `AssetPackPickerModal.svelte`

- **Domaine** : Publications & Personnalisation
- **Responsabilité(s)** : Modale permettant à l'auteur de lier un de ses packs d'icônes ou d'émojis à une publication pour que les autres utilisateurs puissent le découvrir et l'enregistrer.

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `isOpen` | `boolean` | `false` | Contrôle d'ouverture de la modale. |
| `selectedAssetId` | `string \| null` | `null` | Identifiant du pack sélectionné. |
| `onselect` | `(pack: AssetPackInfo) => void` | Requis | Callback lors du choix d'un pack. |

### Dépendances
- **Stores & États globaux** : Aucun état global
- **APIs réseau** : Appel `GET /api/emoji-sets` et `GET /api/icon-sets` pour lister les packs du créateur.
