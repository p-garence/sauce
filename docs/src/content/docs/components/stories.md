---
title: Stories & Édition Média
description: Fiches de référence du lecteur plein écran de stories éphémères et de l'éditeur de retouche photo.
---

## 1. `StoryViewerModal.svelte`

- **Domaine** : Stories
- **Responsabilité(s)** : Modalité d'immersion plein écran pour la visualisation des stories (avance automatique, pause au maintien tactile, navigation précédent/suivant par tapotement).

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `isOpen` | `boolean` | `false` | Contrôle d'affichage plein écran. |
| `storyBundles` | `StoryBundle[]` | `[]` | Liste des groupes de stories regroupées par utilisateur. |
| `initialBundleIndex` | `number` | `0` | Index du paquet d'histoires à ouvrir en premier. |
| `onclose` | `() => void` | Requis | Notification de fermeture du lecteur. |

### Dépendances
- **Stores & États globaux** : Aucun état global
- **APIs réseau** : `POST /api/stories/[id]/view` (marquage de vue) et `POST /api/stories/[id]/like`.

---

## 2. `StoryProgressBar.svelte`

- **Domaine** : Stories
- **Responsabilité(s)** : Segments de progression horizontaux en haut de l'écran indiquant la story courante et le temps restant avant la suivante.

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `count` | `number` | Requis | Nombre total de stories dans le paquet actuel. |
| `currentIndex` | `number` | Requis | Index de la story active en cours de lecture. |
| `progress` | `number` | `0` | Pourcentage de progression (0 à 1) de la slide courante. |

### Dépendances
- **Stores & États globaux** : Aucun état global
- **APIs réseau** : Aucune

---

## 3. `StoryCreator.svelte`

- **Domaine** : Stories & Création
- **Responsabilité(s)** : Interface de capture ou sélection de média, ajout de texte ou dessin, sélection de visibilité et publication d'une nouvelle story expirant sous 24h.

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `onpublished` | `() => void` | Requis | Invoqué lorsque la story a été créée avec succès. |
| `oncancel` | `() => void` | `undefined` | Callback d'annulation. |

### Dépendances
- **Stores & États globaux** : Aucun état global
- **APIs réseau** : `POST /api/upload` et `POST /api/stories`.

---

## 4. `MediaEditorModal.svelte`

- **Domaine** : Édition Graphique
- **Responsabilité(s)** : Modale de retouche photo avec recadrage (zoom/pan), filtres CSS en direct, calque de dessin à main levée (canvas) et ajout d'autocollants/textes déplaçables.

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `isOpen` | `boolean` | `false` | État d'ouverture de l'éditeur graphique. |
| `imageSrc` | `string` | Requis | URL ou data URL de l'image brute à éditer. |
| `onsave` | `(editedBlob: Blob) => void` | Requis | Callback retournant l'image exportée aplatie. |
| `oncancel` | `() => void` | Requis | Annulation de l'édition. |

### Dépendances
- **Stores & États globaux** : Aucun état global
- **APIs réseau** : Aucune (rendu 100% Canvas HTML5 local).

---

## 5. `TextStyleControls.svelte`

- **Domaine** : Édition Graphique
- **Responsabilité(s)** : Barre d'outils de formatage pour les calques texte d'une image (polices typographiques, mode fond contrasté, couleur et sélecteur d'alignement).

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `font` | `string` | `"system"` | Police active. |
| `color` | `string` | `"#ffffff"` | Couleur du texte. |
| `textAlign` | `'left' \| 'center' \| 'right'` | `'center'` | Alignement horizontal du texte. |
| `hasContrastBg` | `boolean` | `false` | Active le fond semi-opaque contrasté sous les lettres. |
| `onchange` | `(style: TextStyle) => void` | Requis | Callback lors de la modification d'une propriété. |

### Dépendances
- **Stores & États globaux** : Aucun état global
- **APIs réseau** : Aucune
