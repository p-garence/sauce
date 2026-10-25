---
title: Démarrage Rapide
description: Guide pour installer, configurer et lancer l'application en environnement de développement.
---

Ce guide détaille l'installation, la configuration des environnements (local vs Docker) et le lancement de l'application et de sa documentation.

## Prérequis

- **Node.js** v22+
- **Docker** et **Docker Compose**
- **Git**

## 1. Installation des dépendances

```bash
# Dépendances de l'application principale
npm install

# Dépendances du wiki de développement (Astro Starlight)
npm --prefix docs install
```

## 2. Configuration locale (.env)

Le fichier `.env` est configuré par défaut pour le développement direct sur l'hôte :

```ini
ORIGIN="http://localhost:5173"
BETTER_AUTH_SECRET="votre_secret_au_hasard_min_32_caracteres"
HOST_DATA_PATH="./data_prod"

POSTGRES_USER="root"
POSTGRES_PASSWORD="mysecretpassword"
POSTGRES_DB="social"

# Base de données PostgreSQL locale (npm run dev)
DATABASE_URL="postgres://root:mysecretpassword@localhost:5432/social"

# Clés Web Push (VAPID)
PUBLIC_VAPID_KEY="..."
VAPID_PRIVATE_KEY="..."
VAPID_SUBJECT="mailto:admin@example.local"
```

## 3. Lancement des Services

### Option 1 : Développement local sur machine hôte (Recommandé)

1. Démarrez le service PostgreSQL :
   ```bash
   npm run db:start
   ```
2. Appliquez le schéma à chaud en local :
   ```bash
   npm run db:push
   ```
3. Lancez le serveur SvelteKit :
   ```bash
   npm run dev
   ```
- Application : [http://localhost:5173](http://localhost:5173)
- Documentation Dev intégrée : [http://localhost:5173/wikidev](http://localhost:5173/wikidev)

### Option 2 : Exécution conteneurisée complète (Docker Compose)

Pour exécuter à la fois PostgreSQL et l'application SvelteKit dans Docker :

```bash
docker compose up --build
```

`docker-compose.yaml` surcharge automatiquement `ORIGIN` (`http://localhost:4539`) et `DATABASE_URL` interne (`postgres://root:...@db:5432/social`). Aucune modification manuelle du fichier `.env` n'est requise.

- Application : [http://localhost:4539](http://localhost:4539)
- Documentation Dev : [http://localhost:4539/wikidev](http://localhost:4539/wikidev)

## 4. Documentation & Wiki Dev

- **Serveur de développement live (Astro avec HMR)** :
  ```bash
  npm run docs:dev
  ```
- **Génération statique de la documentation** :
  ```bash
  npm run docs:build
  ```
  La documentation est générée dans `static/wikidev/` et automatiquement servie par SvelteKit sous le chemin `/wikidev/`.

## 5. Tests & Qualité

- **Tests unitaires ciblés** :
  ```bash
  npx vitest run <fichier_test>
  # Exemple :
  npx vitest run src/lib/server/customPacks/packs.spec.ts
  ```
- **Tests unitaires complets** :
  ```bash
  npm run test:unit -- --run
  ```
- **Vérifications de type & linter** :
  ```bash
  npm run check
  npm run lint
  ```
- **Tests End-to-End (Playwright)** :
  ```bash
  npm run test:e2e
  ```

