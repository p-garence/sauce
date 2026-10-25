---
title: Base de Données & Migrations Drizzle
description: Gestion du schéma PostgreSQL, commandes Drizzle ORM, relations et administration.
---

La persistance des données repose sur **PostgreSQL** typé par **Drizzle ORM**.

---

## 1. Structure Modulaire des Schémas

Les schémas sont organisés par domaine dans `src/lib/server/db/schema/` et ré-exportés dans `src/lib/server/db/schema/index.ts` :

| Fichier de schéma | Entités gérées |
| :--- | :--- |
| `posts.ts` | Publications, carrousels de diapositives, visibilité, compteurs de vues et likes |
| `stories.ts` | Stories éphémères (24h), vues horodatées, likes |
| `comments.ts` | Commentaires et réponses imbriquées, likes de commentaires |
| `chat.ts` | Conversations directes et de groupe, participants, messages texte/médias/vocaux |
| `groups.ts` | Groupes d'amis personnalisés et adhésions |
| `follows.ts` | Abonnements, demandes d'abonnements, blocages d'utilisateurs |
| `notifications.ts` | Notifications in-app, statuts de lecture, type d'événement |
| `emojis.ts` | Packs d'émojis personnalisés, favoris, bibliothèques partagées |
| `icons.ts` | Packs d'icônes vectorielles personnalisées, sélections d'interface |
| `flux.ts` | Flux personnalisés (blended feeds), sources et abonnements RSS |
| `instanceSettings.ts` | Configuration globale de l'instance (inscriptions, quotas, visibilité) |
| `auth.schema.ts` | Tables gérées par Better-Auth (`user`, `session`, `account`, `verification`) |

---

## 2. Procédure de Modification du Schéma (Checklist)

Pour faire évoluer la structure de la base de données, suivez strictement cette checklist étape par étape :

1. **Modifier les schémas TypeScript** :
   Éditez les tables cibles dans `src/lib/server/db/schema/*.ts` en utilisant les types Drizzle appropriés (`text`, `uuid`, `boolean`, `integer`, `timestamp`, `jsonb`, etc.).
2. **Adapter le code applicatif** :
   Mettez à jour les fonctions de lecture/écriture dans `src/lib/server/**` ainsi que les composants ou routes impactés.
3. **Tester en environnement local de développement** :
   Synchronisez la base dev soit avec :
   ```bash
   npm run db:push
   ```
   soit en exécutant des instructions SQL directes (`ALTER TABLE ...`) sur `social_db` dans votre client PostgreSQL.
4. **Validation et génération officielle de la migration** :
   Seul l'administrateur ou le responsable du projet exécute la commande de génération de migration :
   ```bash
   npm run db:generate
   ```

> [!CAUTION]
> **Règles d'intégrité strictes :**
> - **Ne jamais créer manuellement** de fichier SQL dans `drizzle/` (ex: `0018_...sql`).
> - **Ne jamais modifier manuellement** `drizzle/meta/_journal.json`.
> - La génération automatique Drizzle Kit calcule seule les snapshots différentiels.

---

## 3. Commandes Drizzle Utiles

| Commande | Action | Usage |
| :--- | :--- | :--- |
| `npm run db:push` | Synchronise immédiatement le schéma avec la base dev locale | Prototypage & tests locaux |
| `npm run db:studio` | Ouvre l'interface web Drizzle Studio | Inspection visuelle des données |
| `npm run db:generate` | Génère la migration SQL officielle dans `drizzle/` | Réservé à l'administrateur |
| `npm run db:migrate` | Exécute les migrations SQL pendant le déploiement | Automatisé au boot Docker (`migrate.js`) |

