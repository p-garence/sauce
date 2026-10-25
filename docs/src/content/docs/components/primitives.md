---
title: Primitives & Composants Partagés
description: Fiches de référence des composants d'interface génériques et réutilisables.
---

## 1. `Modal.svelte`

- **Domaine** : UI Générique
- **Responsabilité(s)** : Boîte de dialogue accessible avec fond obscurci, fermeture au clic extérieur et touche Échap.

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `isOpen` | `boolean` | `false` | État d'ouverture (bidirectionnel via `bind:isOpen`). |
| `title` | `string` | `undefined` | Titre facultatif de l'en-tête. |
| `onclose` | `() => void` | `undefined` | Callback déclenché à la fermeture. |
| `children` | `Snippet` | `undefined` | Contenu principal de la boîte de dialogue. |
| `footer` | `Snippet` | `undefined` | Barre de boutons d'action en pied de modale. |

### Dépendances
- **Stores & États globaux** : Aucun état global
- **APIs réseau** : Aucune

### Exemple d'utilisation

```svelte
<script lang="ts">
  import Modal from '$lib/components/Modal.svelte';

  let showModal = $state(false);
</script>

<button onclick={() => (showModal = true)}>Ouvrir</button>

<Modal bind:isOpen={showModal} title="Confirmation">
  <p>Voulez-vous enregistrer les modifications ?</p>
  {#snippet footer()}
    <button onclick={() => (showModal = false)}>Fermer</button>
  {/snippet}
</Modal>
```

---

## 2. `SearchInput.svelte`

- **Domaine** : Navigation & Recherche
- **Responsabilité(s)** : Saisie de recherche avec délai d'attente (debounce), bouton de réinitialisation et indicateur d'activité.

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `value` | `string` | `""` | Valeur du texte de recherche (liable via `bind:value`). |
| `placeholder` | `string` | `"Rechercher..."` | Texte indicatif du champ. |
| `loading` | `boolean` | `false` | Affiche un indicateur de chargement rotatif. |
| `debounceMs` | `number` | `300` | Délai en ms avant l'émission de l'événement `onsearch`. |
| `onsearch` | `(val: string) => void` | `undefined` | Callback notifié après expiration du délai de debounce. |

### Dépendances
- **Stores & États globaux** : Aucun état global
- **APIs réseau** : Aucune

### Exemple d'utilisation

```svelte
<script lang="ts">
  import SearchInput from '$lib/components/SearchInput.svelte';

  let query = $state('');
  let isSearching = $state(false);

  function handleSearch(q: string) {
    // Déclenche l'appel réseau
  }
</script>

<SearchInput bind:value={query} loading={isSearching} onsearch={handleSearch} />
```

---

## 3. `Icon.svelte`

- **Domaine** : Affichage Graphique
- **Responsabilité(s)** : Rendu d'icônes vectorielles natives Lucide ou personnalisées issues de packs SVG.

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | Requis | Identifiant de l'icône (ex: `"heart"`, `"custom:mon-pack:star"`). |
| `size` | `number` | `20` | Taille en pixels de l'icône (largeur et hauteur). |
| `class` | `string` | `""` | Classes CSS personnalisées à injecter sur le conteneur SVG. |

### Dépendances
- **Stores & États globaux** : Aucun état global
- **APIs réseau** : Aucune

---

## 4. `EmojiButton.svelte` & `EmojiPickerPopover.svelte`

- **Domaine** : Édition & Saisie
- **Responsabilité(s)** : Déclencheur et panneau flottant pour la sélection d'émojis Unicode ou personnalisés.

### Props (`EmojiButton.svelte`)

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `onselect` | `(emoji: string) => void` | Requis | Callback invoqué lors du clic sur un émoji. |
| `disabled` | `boolean` | `false` | Désactive le bouton sélecteur. |

### Dépendances
- **Stores & États globaux** : Lit les packs d'émojis actifs via `emojiStore.svelte.ts`.
- **APIs réseau** : Aucune lors de la sélection (mise en cache mémoire locale).

---

## 5. `VoiceMessagePlayer.svelte`

- **Domaine** : Médias & Audio
- **Responsabilité(s)** : Lecture de messages audio avec visualisation de la forme d'onde, durée et contrôle de lecture.

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `src` | `string` | Requis | URL du fichier audio (`/media/...`). |
| `duration` | `number` | `undefined` | Durée totale en secondes si connue. |

### Dépendances
- **Stores & États globaux** : Aucun état global
- **APIs réseau** : Streaming HTTP du fichier audio via `src`.

---

## 6. `VisibilitySelect.svelte`

- **Domaine** : Publication & Confidentialité
- **Responsabilité(s)** : Sélecteur d'audience pour les publications et stories (`public`, `followers`, `group`, `private`).

### Props

| Nom | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `value` | `string` | `"public"` | Audience choisie (liable via `bind:value`). |
| `groupId` | `string \| null` | `null` | Identifiant du groupe ciblé si `value === 'group'`. |
| `groups` | `Array<{ id: string; name: string }>` | `[]` | Liste des groupes d'amis de l'utilisateur. |

### Dépendances
- **Stores & États globaux** : Aucun état global
- **APIs réseau** : Aucune
