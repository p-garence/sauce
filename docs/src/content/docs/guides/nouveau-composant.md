---
title: "Procédure : Créer un Composant UI (Svelte 5 Runes)"
description: "Guide pratique pour concevoir un composant Svelte 5 performant, sans avertissements et avec UI optimiste."
---

Ce guide décrit la démarche standard pour ajouter un nouveau composant réutilisable dans l'application.

---

## 1. Emplacement du Fichier

Placez les composants réutilisables dans `src/lib/components/` :
- S'il s'agit d'une primitive transversale (ex: bouton, champ, boîte de dialogue) : directement dans `src/lib/components/`.
- S'il s'agit d'une section spécifique (ex: réglages) : dans un sous-dossier comme `src/lib/components/settings/`.

---

## 2. Définition des Props avec Runes

Dans Svelte 5, utilisez `$props()` avec typage TypeScript explicite. N'utilisez plus la syntaxe `export let`.

```svelte
<script lang="ts">
  let {
    label,
    variant = 'primary',
    disabled = false,
    onclick
  }: {
    label: string;
    variant?: 'primary' | 'secondary' | 'danger';
    disabled?: boolean;
    onclick?: () => void;
  } = $props();
</script>
```

Pour les props à liaison bidirectionnelle, utilisez `$bindable()` :
```svelte
let { value = $bindable('') } = $props<{ value?: string }>();
```

---

## 3. Gestion de l'UI Optimiste (Pattern de Fusion Dérivée)

Si votre composant modifie une donnée serveur (un switch, une case à cocher, un compteur) :

1. Dérivez la valeur serveur :
   ```typescript
   let serverValue = $derived(initialValue);
   ```
2. Créez une dérogation locale :
   ```typescript
   let localOverride = $state<boolean | null>(null);
   ```
3. Fusionnez les deux :
   ```typescript
   let value = $derived(localOverride !== null ? localOverride : serverValue);
   ```
4. Dans le gestionnaire d'événement :
   - Mettez à jour immédiatement `localOverride`.
   - Effectuez le `fetch()` asynchrone.
   - En cas d'erreur dans le bloc `catch`, réinitialisez simplement : `localOverride = null;`.

---

## 4. Vérification Stricte

Avant de soumettre votre travail, vérifiez l'absence totale d'avertissements de réactivité et d'erreurs TypeScript :

```bash
npm run check
```
