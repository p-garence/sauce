---
title: Stories & Édition Média
description: Fiches de référence du lecteur plein écran de stories éphémères et de l'éditeur de retouche photo.
---

## 1. `StoryViewerModal.svelte`

- **Fichier** : `src/lib/components/stories/StoryViewerModal.svelte`
- **Domaine** : Stories
- **Responsabilité(s)** : Modalité d'immersion plein écran pour la visualisation des stories (avance automatique, pause au maintien tactile, navigation précédent/suivant par tapotement, raccourcis clavier et tiroirs de commentaires/likes).

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `bundles` | `StoryBundle[]` | `[]` | Liste des groupes de stories regroupées par utilisateur. |
| `initialAuthorIndex` | `number` | `0` | Index du paquet d'auteur à ouvrir en premier. |
| `initialStoryIndex` | `number` | `0` | Index de la slide de story à afficher au démarrage. |
| `currentUserId` | `string` | `""` | Identifiant de l'utilisateur connecté. |
| `userGroups` | `UserGroup[]` | `[]` | Groupes de visibilité pour les filtres d'audience. |
| `isOpen` | `boolean` | `false` | Contrôle d'affichage plein écran. |
| `onClose` | `() => void` | Requis | Notification de fermeture du lecteur. |
| `onStoryViewed` | `(storyId: string) => void` | `undefined` | Callback lors du marquage d'une story comme vue. |
| `onStoryDeleted` | `(storyId: string) => void` | `undefined` | Callback notifié à la suppression d'une story par son auteur. |
| `onStoryUpdated` | `(updated: StoryItem) => void` | `undefined` | Callback lors de la modification des réglages d'une story. |
| `onStoryLiked` | `(id: string, liked: boolean, count: number) => void` | `undefined` | Callback lors du basculement d'un like sur la story. |

### Dépendances
- **Stores & États globaux** : `page.state.sessionUser`.
- **APIs réseau** : `POST /api/stories/[id]/view` et `POST /api/stories/[id]/like`.

---

## 2. `StoryProgressBar.svelte`

- **Fichier** : `src/lib/components/stories/StoryProgressBar.svelte`
- **Domaine** : Stories
- **Responsabilité(s)** : Barres de progression segmentées en haut du lecteur indiquant visuellement les stories déjà lues et celle en cours de lecture dans le bundle actif.

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `stories` | `Array<{ id: string }>` | `[]` | Liste des stories constituant le bundle actif. |
| `currentIndex` | `number` | `0` | Index de la story active en cours de visualisation. |

### Dépendances
- **Stores & États globaux** : Aucun état global
- **APIs réseau** : Aucune

---

## 3. `StoryCreator.svelte`

- **Fichier** : `src/lib/components/stories/StoryCreator.svelte`
- **Domaine** : Stories & Création
- **Responsabilité(s)** : Interface de capture ou sélection de média (galerie ou caméra en direct), intégration avec l'éditeur graphique, configuration de visibilité (`VisibilitySelect`), durée d'expiration (24h, 48h, personnalisée, permanente) et publication.

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `onPublished` | `() => void` | `undefined` | Callback notifié après publication réussie d'une nouvelle story. |

### Dépendances
- **Stores & États globaux** : `mediaEditor` (`mediaEditorState.svelte.ts`) pour la retouche avant envoi.
- **APIs réseau** : `POST /api/upload` (médias) et `POST /api/stories` (création).

---

## 4. `MediaEditorModal.svelte`

- **Fichier** : `src/lib/components/media-editor/MediaEditorModal.svelte`
- **Domaine** : Édition Graphique
- **Responsabilité(s)** : Modale principale de retouche photo pilotée par l'état global `mediaEditor` : recadrage libre ou verrouillé par ratio, rotation, zoom/pan interactif, dessin à main levée SVG (`MediaDrawingLayer`), superposition de textes typographiques et export canvas aplati.

### Props
Composant modulaire piloté réactivement par l'état global partagé `$lib/client/mediaEditorState.svelte.ts` (`mediaEditor.isOpen`, `mediaEditor.currentFile`, `mediaEditor.onSave`, `mediaEditor.close()`). Ne requiert aucune prop obligatoire.

### Dépendances
- **Stores & États globaux** : `mediaEditorState.svelte.ts`.
- **APIs réseau** : Aucune (rendu et fusion 100% Canvas HTML5 local).

---

## 5. `TextStyleControls.svelte`

- **Fichier** : `src/lib/components/media-editor/TextStyleControls.svelte`
- **Domaine** : Édition Graphique
- **Responsabilité(s)** : Barre d'outils typographiques pour les éléments textuels incrustés sur l'image : sélection de polices de caractères, palette de couleurs horizontales et bascule de volets d'édition.

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `activeText` | `TextItem` | Requis | Élément textuel sélectionné (liable via `bind:activeText`). |
| `activeFont` | `EditorFont` | Requis | Police actuellement active. |
| `showFontPicker` | `boolean` | Requis | État de déroulement du volet de polices. |
| `showColorPicker` | `boolean` | Requis | État de déroulement de la palette de couleurs. |
| `onToggleFontPicker` | `() => void` | Requis | Bascule l'affichage du sélecteur de polices. |
| `onToggleColorPicker` | `() => void` | Requis | Bascule l'affichage du sélecteur de couleurs. |
| `onSelectFont` | `(font: EditorFont) => void` | Requis | Callback lors du choix d'une police. |
| `onSelectColor` | `(color: string) => void` | Requis | Callback lors du choix d'une couleur. |

### Dépendances
- **Stores & États globaux** : Constantes typographiques `EDITOR_FONTS` et `EDITOR_COLORS`.
- **APIs réseau** : Aucune
