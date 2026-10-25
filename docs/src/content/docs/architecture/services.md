---
title: Services Backend & Base de Données
description: Organisation de la logique métier serveur, transactions strictes et abstraction SQL via Drizzle ORM.
---

Toute la logique métier et les requêtes SQL du backend sont regroupées dans le répertoire `src/lib/server/`. Les routes API (`+server.ts`) et les chargeurs de pages (`+page.server.ts`) ne contiennent aucun SQL inline : ils orchestrent les appels aux services.

---

## Vue d'Ensemble des Services

| Service | Emplacement | Responsabilités Principales |
| :--- | :--- | :--- |
| **`follows.ts`** | `src/lib/server/follows.ts` | Relations d'abonnements, validation de demandes, compteurs atomiques, amis en commun |
| **`comments.ts`** | `src/lib/server/comments.ts` | Commentaires de publications, réponses hiérarchiques, pagination et likes |
| **`posts.ts`** | `src/lib/server/posts.ts` | Requêtes de flux, visibilité fine (`canSeePost`), curseurs de pagination, publication |
| **`chat.ts`** | `src/lib/server/chat.ts` | Discussions directes et de groupe, dédoublonnage strict, participants, messages |
| **`notifications.ts`** | `src/lib/server/notifications.ts` | Envoi d'alertes temps réel et persistance des notifications |
| **`media.ts`** | `src/lib/server/media.ts` | Traitement Sharp, compression, formats WebP et stockage sur disque |
| **`auth.ts`** | `src/lib/server/auth.ts` | Validation de sessions Better-Auth et guards d'API (`requireApiSession`) |

---

## Exemple : Transactions Atomiques dans `follows.ts`

Lorsqu'un utilisateur s'abonne à un profil, plusieurs opérations critiques doivent réussir conjointement :
1. Vérification de la politique de confidentialité de la cible (`requireFollowRequest`).
2. Insertion de la relation (`pending` ou `accepted`).
3. Incrémentation des compteurs `followersCount` et `followingCount` UNIQUEMENT si l'abonnement est immédiat.
4. Création de la notification système.

```typescript
// Extrait de src/lib/server/follows.ts
export async function toggleFollow(
  currentUserId: string,
  targetId: string,
  action: 'follow' | 'unfollow' | 'cancel'
) {
  return await db.transaction(async (tx) => {
    if (action === 'follow') {
      // 1. Consultation des préférences de visibilité
      const [targetUser] = await tx
        .select({ profileVisibility: userTable.profileVisibility })
        .from(userTable)
        .where(eq(userTable.id, targetId));

      const requiresRequest = targetUser?.profileVisibility?.requireFollowRequest;
      const newStatus = requiresRequest ? 'pending' : 'accepted';

      // 2. Insertion sécurisée sans doublon
      const inserted = await tx
        .insert(follows)
        .values({ followerId: currentUserId, followingId: targetId, status: newStatus })
        .onConflictDoNothing()
        .returning();

      if (inserted.length > 0 && newStatus === 'accepted') {
        // 3. Compteurs atomiques
        await tx.update(userTable)
          .set({ followingCount: sql`${userTable.followingCount} + 1` })
          .where(eq(userTable.id, currentUserId));

        await tx.update(userTable)
          .set({ followersCount: sql`${userTable.followersCount} + 1` })
          .where(eq(userTable.id, targetId));
      }
    }
  });
}
```

---

## Sécurité des Posts : `canSeePost(viewerId)`

Le filtrage de confidentialité des posts est centralisé dans `src/lib/server/posts.ts` et réutilisé par toutes les requêtes (flux, recherche, détail d'un post, profil) :

```typescript
export function canSeePost(viewerId: string): SQL {
  return or(
    eq(posts.authorId, viewerId), // L'auteur voit toujours ses propres posts
    eq(posts.visibility, 'public'), // Visible par tout le monde
    eq(posts.visibility, 'network'), // Visible par les utilisateurs connectés
    and(
      eq(posts.visibility, 'followers'), // Visible uniquement par les abonnés acceptés
      exists(
        db.select()
          .from(follows)
          .where(and(
            eq(follows.followerId, viewerId),
            eq(follows.followingId, posts.authorId),
            eq(follows.status, 'accepted')
          ))
      )
    ),
    and(
      eq(posts.visibility, 'group'), // Visible uniquement par les membres du groupe ciblé
      exists(
        db.select()
          .from(userGroupMembers)
          .where(and(
            eq(userGroupMembers.userId, viewerId),
            eq(userGroupMembers.groupId, posts.groupId)
          ))
      )
    )
  );
}
```
