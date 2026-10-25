---
title: Tests E2E & Débogage Playwright
description: Procédure complète pour exécuter, cibler et déboguer les tests end-to-end multi-utilisateurs.
---

Les tests end-to-end sont automatisés avec **Playwright** pour valider les parcours complets réels (création de compte avec clé d'invitation, publication, messagerie privée, flux personnalisés).

---

## 1. Architecture des Tests E2E

1. **Phase de Setup (`tests/e2e/admin.setup.ts`)** :
   - Initialise la base de données de test.
   - Crée le compte administrateur initial.
   - Génère automatiquement un lot de **20 clés d'invitation** sauvegardées dans `tests/e2e/.auth/invite-keys.json`.
   - Ces clés sont consommées au fur et à mesure par les utilisateurs créés lors des tests (Alice, Bob, Claire, David).

2. **Suites de Tests Principales** :
   - `admin.setup.ts` : Onboarding et génération des clés.
   - `chat.spec.ts` : Messagerie privée et discussions de groupe.
   - `settings-feeds-groups.spec.ts` : Flux personnalisés, groupes et modération.

---

## 2. Commandes Utiles

### Exécuter toute la suite E2E
```bash
npm run test:e2e
```

### Exécuter un seul fichier de test (Gain de temps majeur)
Pour éviter de réexécuter toute la suite lorsqu'on développe ou débogue un composant spécifique :

```bash
npx playwright test tests/e2e/chat.spec.ts
```

### Exécuter en mode avec interface visuelle (UI Mode)
```bash
npx playwright test --ui
```

### Exécuter avec navigateur visible (Headed)
```bash
npx playwright test tests/e2e/chat.spec.ts --headed
```

---

## 3. Débogage d'un Test en Échec

Lorsqu'un test échoue (par exemple un timeout de 30 secondes sur un sélecteur) :

1. **Consulter le rapport d'erreur** :
   ```bash
   npx playwright show-report
   ```
2. **Inspecter le contexte d'erreur** :
   Playwright génère un dossier `test-results/` contenant les captures d'écran du DOM au moment exact de l'échec et les logs des sélecteurs (`Call log`).
3. **Erreur fréquente : Sélecteurs de toggle** :
   Dans Svelte 5, les toggles peuvent utiliser des inputs natifs masqués. Assurez-vous d'utiliser `label.toggle input[type="checkbox"]` ou de cibler le label cliquable.
