# Sauce et Ail

> **Statut** : Le projet est actuellement en phase **BETA**.

Réseau social moderne et décentralisé mettant l'accent sur le contrôle de ses flux de publications, la transparence des algorithmes.

---

## Prérequis

Avant de commencer, assurez-vous d'avoir installé sur votre machine :

- [Node.js](https://nodejs.org/) (version **20+**)
- [Docker](https://docs.docker.com/get-docker/) et [Docker Compose](https://docs.docker.com/compose/install/linux/#install-using-the-repository)

---

## Démarrage Rapide pour Développement Local

### Étape 1 : Configurer les variables d'environnement

Copiez le fichier d'exemple pour créer votre fichier `.env` local :

```bash
cp .env.example .env
```

**Optionel** :

Éditez le fichier `.env` pour ajuster les valeurs selon vos besoins :

1. **Clés Web Push (VAPID)** : indispensables pour les notifications du navigateur.
   Générez une paire de clés avec la commande :

   ```bash
   npx web-push generate-vapid-keys
   ```

   Copiez ensuite la clé publique (`PUBLIC_VAPID_KEY`), la clé privée (`VAPID_PRIVATE_KEY`) et votre adresse de contact (`VAPID_SUBJECT="mailto:admin@ton-domaine.com"`).

2. **Serveur SMTP** :
   Si aucun serveur SMTP n'est configuré, les liens de réinitialisation de mot de passe et de validation s'affichent directement dans les logs console du terminal.

---

### Étape 2 : Lancer la base de données et initialiser les dossiers

Démarrez les conteneurs PostgreSQL et l'initialisation des dossiers de données :

```bash
docker compose up -d init-folders db
```

---

### Étape 3 : Installer les dépendances et initialiser le schéma de données

Installez les dépendances du projet :

```bash
npm install
```

Appliquez le schéma de la base de données PostgreSQL :

```bash
npm run db:push
```

---

### Étape 4 : Lancer le serveur de développement

Démarrez l'application en mode développement :

```bash
npm run dev
```

L'application est accessible sur : **[http://localhost:5173](http://localhost:5173)**.

---

## Scripts

| Commande                   | Description                                                                    |
| :------------------------- | :----------------------------------------------------------------------------- |
| `npm run dev`              | Lance le serveur de développement Vite (`localhost:5173`)                      |
| `npm run check`            | Check les erreurs svelte                                                       |
| `npm run lint`             | Check pour problemes de lint                                                   |
| `npm run audit:bundle`     | Genere fichiers d'audit                                                        |
| `npm run audit:lighthouse` | Genere fichiers d'audit                                                        |
| `npm run db:push`          | Pousse les changements de schema das la bdd configuré. A utiliser en dev local |
| `npm run db:studio`        | Ouvre l'interface visuelle Drizzle Studio pour explorer la base de données     |
| `npm run test:unit`        | Exécute les tests unitaires avec Vitest                                        |
| `npm run test:e2e`         | Exécute les tests de bout en bout avec Playwright                              |

---

## Déploiement complet local avec Docker

Pour lancer en mode docker

```bash
docker compose up -d --build
```

L'application sera accessible sur le port **4539** : **[http://localhost:4539](http://localhost:4539)**

---

## Contribuer

Envie de participer à l'aventure et de contribuer au projet ? Contactez **@p-garence**.
