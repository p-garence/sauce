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
| `posts.ts` | Publications (`posts`), commentaires (`comments`), likes (`postLikes`, `commentLikes`), masquages (`hiddenPosts`), vues (`postViews`) |
| `stories.ts` | Stories éphémères (`stories`), vues horodatées (`storyViews`), likes (`storyLikes`) |
| `chats.ts` | Conversations (`chats`), participants et permissions (`chatParticipants`), messages (`messages`) |
| `social.ts` | Abonnements (`follows`), blocages (`userBlocks`), alertes in-app (`notifications`), fédération (`instances`, `userInstanceConsents`) |
| `groups.ts` | Groupes d'amis personnalisés (`userGroups`), adhésions (`userGroupMembers`), visibilité ciblée (`postGroupVisibility`) |
| `feeds.ts` | Flux personnalisés (`userFeeds`), algorithmes et mixage blend (`algorithms`, `userAlgorithms`) |
| `emojis.ts` | Packs d'émojis personnalisés (`emojiSets`), packs enregistrés (`userSavedEmojiSets`) |
| `icons.ts` | Packs d'icônes vectorielles SVG (`iconSets`), packs enregistrés (`userSavedIconSets`) |
| `tags.ts` | Répertoire des hashtags (`tags`), liaison aux publications (`postTags`) |
| `push.ts` | Abonnements Web Push VAPID (`pushSubscriptions`) |
| `instanceSettings.ts` | Configuration globale de l'instance (`instanceSettings`) |
| `auth.ts` | Tables Better-Auth (`user`, `session`, `account`, `verification`) et clés d'invitation (`inviteKeys`) |

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

