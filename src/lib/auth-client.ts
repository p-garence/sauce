import { createAuthClient } from 'better-auth/svelte';

// Pas de baseURL : le serveur d'auth tourne sur le même domaine que le client,
// better-auth utilise donc automatiquement l'origine courante (dev ou prod).
export const authClient = createAuthClient();
