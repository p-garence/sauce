---
title: Publications & Édition
description: Fiches de référence des composants de l'écosystème de publication (affichage, carrousels, création de slides).
---

## 1. `Post.svelte`

- **Fichier** : `src/lib/components/post/Post.svelte`
- **Domaine** : Publications
- **Responsabilité(s)** : Carte principale de publication orchestrant l'en-tête auteur (`PostHeader`), le carrousel multimédia (`PostCarousel`), le texte enrichi (`RichContent`), la barre d'actions (`PostActionsBar`) et le volet de commentaires (`CommentSection`).

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `post` | `PostData` | Requis | Objet complet de la publication (auteur, carrousel, compteurs, visibilité). |

### Dépendances
- **Stores & États globaux** : `page.data.sessionUser` pour l'utilisateur connecté, `postState.svelte.ts` et `feedMemory.svelte.ts`.
- **APIs réseau** : `POST /api/like`, `POST /api/posts/hide`, `POST /api/posts/view` (tracking de vue).

---

## 2. `PostHeader.svelte`

- **Fichier** : `src/lib/components/post/PostHeader.svelte`
- **Domaine** : Publications
- **Responsabilité(s)** : En-tête affichant l'avatar de l'auteur, son nom, le lien vers le profil, l'indicateur ou sélecteur de visibilité (`VisibilitySelect`), le bouton d'abonnement rapide (`FollowButton`) et le menu contextuel (`ActionMenu`).

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `post` | `PostData` | Requis | Données de la publication (auteur, date, visibilité). |
| `isLoggedIn` | `boolean` | Requis | Indique si le visiteur est connecté. |
| `isOwnPost` | `boolean` | Requis | Vrai si le visiteur est l'auteur de la publication. |
| `isSystemPost` | `boolean` | Requis | Vrai s'il s'agit d'un message officiel du système. |
| `postActions` | `MenuAction[]` | Requis | Liste des actions disponibles dans le menu contextuel. |
| `onVisibilityChange` | `(newVis: PostVisibility, newGroupId: string \| null) => void` | `undefined` | Callback lors de la modification de la visibilité par l'auteur. |

### Dépendances
- **Stores & États globaux** : Aucun état global
- **APIs réseau** : Aucune directe

---

## 3. `PostCarousel.svelte`

- **Fichier** : `src/lib/components/post/PostCarousel.svelte`
- **Domaine** : Publications
- **Responsabilité(s)** : Carrousel horizontal fluide supportant les diapositives texte enrichi et les médias (images et vidéos avec lecture automatique via `IntersectionObserver`).

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `mediaUrls` | `CarouselItem[]` | Requis | Tableau des diapositives (texte avec style/alignement, image WebP ou vidéo MP4). |

### Dépendances
- **Stores & États globaux** : Aucun état global
- **APIs réseau** : Streaming des médias via `/media/[filename]`.

---

## 4. `CarouselSlideEditor.svelte`

- **Fichier** : `src/lib/components/post/editor/CarouselSlideEditor.svelte`
- **Domaine** : Édition & Création
- **Responsabilité(s)** : Édition et prévisualisation de la slide active d'une publication (panneau de texte enrichi avec mentions, émojis et alignement, ou média photo/vidéo avec raccourci vers la retouche).

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `item` | `EditorCarouselItem` | Requis | Slide active en cours d'édition (texte, couleur, image ou vidéo). |
| `isSimpleText` | `boolean` | `false` | Vrai si la publication ne contient qu'un unique panneau textuel simple. |
| `onRemove` | `() => void` | `undefined` | Callback pour supprimer la slide courante. |
| `onEditMedia` | `() => void` | `undefined` | Ouvre l'éditeur de dessin, filtres et recadrage multimédia. |

### Dépendances
- **Stores & États globaux** : Aucun état global
- **APIs réseau** : Aucune

---

## 5. `CarouselThumbnailsBar.svelte`

- **Fichier** : `src/lib/components/post/editor/CarouselThumbnailsBar.svelte`
- **Domaine** : Édition & Création
- **Responsabilité(s)** : Barre horizontale affichant les miniatures des diapositives, l'indicateur de slide active, le réordonnancement (déplacement gauche/droite) et les boutons d'ajout de slides (texte ou média).

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `items` | `EditorCarouselItem[]` | Requis | Liste ordonnée de toutes les diapositives du carrousel. |
| `currentIndex` | `number` | `0` | Index de la slide actuellement active (liable via `bind:currentIndex`). |
| `onMove` | `(index: number, direction: 'left' \| 'right') => void` | `undefined` | Callback optionnel pour réordonner une diapositive. |
| `onAddMedia` | `() => void` | `undefined` | Déclenche le sélecteur de fichier pour ajouter une photo ou vidéo. |
| `onAddText` | `() => void` | `undefined` | Ajoute un nouveau panneau de texte stylisé. |

### Dépendances
- **Stores & États globaux** : Aucun état global
- **APIs réseau** : Aucune

---

## 6. `AssetPackPickerModal.svelte`

- **Fichier** : `src/lib/components/post/editor/AssetPackPickerModal.svelte`
- **Domaine** : Publications & Personnalisation
- **Responsabilité(s)** : Modale à onglets permettant à l'auteur d'attacher un de ses packs d'icônes vectorielles ou d'émojis personnalisés à une publication afin de le partager avec la communauté.

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `isOpen` | `boolean` | Requis | État d'ouverture de la modale. |
| `userOwnedIconSets` | `IconSet[]` | `[]` | Liste des packs d'icônes créés par l'utilisateur. |
| `userOwnedEmojiSets` | `EmojiSet[]` | `[]` | Liste des collections d'émojis créées par l'utilisateur. |
| `onSelectIconSet` | `(set: IconSet) => void` | Requis | Callback lors du choix d'un pack d'icônes. |
| `onSelectEmojiSet` | `(set: EmojiSet) => void` | Requis | Callback lors du choix d'un pack d'émojis. |
| `onClose` | `() => void` | Requis | Callback de fermeture de la modale. |

### Dépendances
- **Stores & États globaux** : Aucun état global
- **APIs réseau** : Aucune directe (les listes sont fournies en props par le contrôleur de page).
