---
title: "Procédure : Ajouter un Service Backend & Endpoint API"
description: "Guide pratique pour centraliser la logique métier SQL et l'exposer via un endpoint SvelteKit."
---

Ce guide détaille les étapes pour implémenter une nouvelle fonctionnalité côté serveur dans le respect des règles d'architecture.

---

## Règle d'Or : Aucun SQL dans les routes

Ne placez jamais de requêtes `db.select()`, `db.insert()` ou `db.transaction()` directement dans les fichiers `+page.server.ts` ou `+server.ts`. 

Toute la persistance doit être encapsulée dans un service du dossier `src/lib/server/`.

---

## 1. Créer ou enrichir le Service (`src/lib/server/`)

Créez une fonction typée et isolez les modifications dépendantes dans une transaction Drizzle :

```typescript
// src/lib/server/bookmarks.ts
import { db } from '$lib/server/db';
import { bookmarks } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export async function toggleBookmark(userId: string, postId: string) {
  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(bookmarks)
      .where(and(eq(bookmarks.userId, userId), eq(bookmarks.postId, postId)));

    if (existing) {
      await tx
        .delete(bookmarks)
        .where(and(eq(bookmarks.userId, userId), eq(bookmarks.postId, postId)));
      return { bookmarked: false };
    } else {
      await tx.insert(bookmarks).values({ userId, postId });
      return { bookmarked: true };
    }
  });
}
```

---

## 2. Exposer l'Endpoint REST (`src/routes/api/`)

Créez le contrôleur HTTP correspondant :

```typescript
// src/routes/api/bookmarks/+server.ts
import { json } from '@sveltejs/kit';
import { requireApiSession } from '$lib/server/auth';
import { toggleBookmark } from '$lib/server/bookmarks';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  const session = await requireApiSession(request);
  const { postId } = await request.json();

  if (!postId) {
    return json({ error: 'Post ID manquant' }, { status: 400 });
  }

  try {
    const result = await toggleBookmark(session.user.id, postId);
    return json(result);
  } catch (err) {
    console.error('Erreur bookmark:', err);
    return json({ error: 'Erreur interne' }, { status: 500 });
  }
};
```

---

## 3. Utiliser le Service dans les Chargeurs de Page (`+page.server.ts`)

Pour l'affichage SSR d'une page, importez directement le service sans passer par une requête HTTP locale :

```typescript
// src/routes/(app)/mes-signets/+page.server.ts
import { getBookmarksForUser } from '$lib/server/bookmarks';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
  const { sessionUser } = await parent();
  const userBookmarks = await getBookmarksForUser(sessionUser.id);

  return {
    bookmarks: userBookmarks
  };
};
```
