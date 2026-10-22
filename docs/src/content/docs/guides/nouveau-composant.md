---
title: "Procédure : Créer un Composant UI (Svelte 5 Runes)"
description: "Guide pratique pour concevoir un composant Svelte 5 performant, sans avertissements et avec UI optimiste."
---

Ce guide décrit la démarche standard pour ajouter ou refactoriser un composant réutilisable dans l'application.

---

## 1. Emplacement du Fichier par Domaine

Tous les composants sont obligatoirement classés par domaine métier sous `src/lib/components/` :

- **`src/lib/components/ui/`** : Primitives et éléments transversaux purs (`Modal.svelte`, `SearchInput.svelte`, `Icon.svelte`, `EmojiButton.svelte`).
- **`src/lib/components/post/`** (et `post/editor/`) : Publications, cartes de carrousel, barres d'actions et éditeur de slides.
- **`src/lib/components/comments/`** : Volet dépliable, compositeur et rendu unifié des commentaires.
- **`src/lib/components/chat/`** : En-têtes, bulles de messages, saisie riche et enregistreur vocal.
- **`src/lib/components/stories/`** : Lecteur plein écran, barre de progression et compositeur de story.
- **`src/lib/components/media-editor/`** : Retouche photo, filtres, dessin canvas et styles typographiques.
- **`src/lib/components/settings/`** : Panneaux de réglages (stockage, flux, émojis, icônes, confidentialité).
- **`src/lib/components/admin/`** : Onglets et outils d'administration et modération.
- **`src/lib/components/navigation/`** : Barres de menu et popover de notifications.
- **`src/lib/components/profile/`** : En-tête de profil, onglets et bouton d'abonnement.

---

## 2. Structure Standard & En-tête JSDoc

Chaque composant doit comporter un en-tête documentaire décrivant sa responsabilité unique et une interface `Props` explicite :

```svelte
<script lang="ts">
  /**
   * @component MonComposant
   * @domain ui
   * @description Description claire et concise de l'utilité du composant.
   * @responsibilities
   * - Responsabilité 1
   * - Responsabilité 2
   */

  interface Props {
    /** Intitulé principal du bouton */
    label: string;
    /** Variante de couleur */
    variant?: 'primary' | 'secondary' | 'danger';
    /** Valeur bidirectionnelle */
    value?: string;
    /** État désactivé */
    disabled?: boolean;
    /** Callback lors du clic */
    onclick?: () => void;
  }

  let {
    label,
    variant = 'primary',
    value = $bindable(''),
    disabled = false,
    onclick
  }: Props = $props();
</script>
```

---

## 3. Gestion de l'UI Optimiste (Pattern de Fusion Dérivée)

Si votre composant modifie une donnée serveur (un toggle, un switch, un compteur de like) :

```typescript
// 1. Dérivez la vérité serveur issue des props
let serverValue = $derived(initialValue);

// 2. Créez une dérogation locale (null par défaut)
let localOverride = $state<boolean | null>(null);

// 3. Fusionnez les deux : l'override local prime s'il n'est pas null
let value = $derived(localOverride !== null ? localOverride : serverValue);

// 4. Dans le gestionnaire d'événement :
async function handleToggle() {
  const target = !value;
  localOverride = target; // Mise à jour instantanée de l'interface

  try {
    await apiCall(target);
  } catch (err) {
    localOverride = null; // Rollback automatique sur la vérité serveur
  }
}
```

---

## 4. Règles de Qualité & Vérification

- **Règle Svelte 5** : Ne jamais utiliser `export let` (obsolète) ni de cascades de `$effect` pour synchroniser des props.
- **Boucles `{#each}`** : Toujours fournir une clé unique explicite `{#each items as item (item.id)}`.
- **Navigation interne** : Toujours utiliser `resolve()` de `$app/paths` sur les balises `<a href={resolve(...)}>`.
- **Validation** : Vérifier la compilation Svelte sans warning avant de valider votre composant.
