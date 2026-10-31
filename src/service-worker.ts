/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

const sw = self as unknown as ServiceWorkerGlobalScope;

// 1. Installation immédiate
sw.addEventListener('install', () => {
	sw.skipWaiting();
});

// 2. Activation immédiate et prise de contrôle des clients
sw.addEventListener('activate', (event) => {
	event.waitUntil(sw.clients.claim());
});

// NOTE IMPORTANTE SUR LE CACHE :
// Nous n'interceptons délibérément PAS l'événement 'fetch'.
// Cela évite tout problème de cache bloquant ou de version obsolète lors des déploiements.
// L'application tourne ainsi toujours avec le code serveur et client le plus récent.

// 3. Réception de notifications Web Push
sw.addEventListener('push', (event) => {
	if (!event.data) return;

	event.waitUntil(
		(async () => {
			const clientList = await sw.clients.matchAll({ type: 'window', includeUncontrolled: true });
			// Détection : l'application est-elle ouverte et au premier plan (active) ?
			const isAppFocused = clientList.some((client) => client.focused);

			// Mise à jour de la pastille rouge sur l'icône de l'écran d'accueil (App Badging)
			if ('setAppBadge' in sw.navigator) {
				try {
					await (sw.navigator as unknown as { setAppBadge: () => Promise<void> }).setAppBadge();
				} catch {
					// Ignorer si non supporté sur ce navigateur/OS
				}
			}

			// RÈGLE : Pas de bannière push OS si l'utilisateur est déjà actif sur l'application !
			// L'interface in-app (BottomBar, pastille cloche, chat) prend le relais en direct.
			if (isAppFocused) {
				return;
			}

			let payload: {
				title?: string;
				body?: string;
				icon?: string;
				badge?: string;
				url?: string;
				tag?: string;
				data?: Record<string, unknown>;
			};

			try {
				payload = event.data.json();
			} catch {
				payload = { body: event.data.text() };
			}

			const title = payload.title || 'Sauce et Ail';
			const options: NotificationOptions = {
				body: payload.body || '',
				icon: payload.icon || '/icon-192.png',
				badge: payload.badge || '/icon-192.png',
				tag: payload.tag || undefined,
				data: {
					url: payload.url || '/',
					notificationId: payload.data?.notificationId,
					entityId: payload.data?.entityId,
					type: payload.data?.type
				}
			};

			await sw.registration.showNotification(title, options);
		})()
	);
});

// 4. Clic sur la notification
sw.addEventListener('notificationclick', (event) => {
	event.notification.close();

	// Réinitialisation de la pastille rouge lors du clic
	if ('clearAppBadge' in sw.navigator) {
		(sw.navigator as unknown as { clearAppBadge: () => Promise<void> })
			.clearAppBadge()
			.catch(() => {});
	}

	const notifData = (event.notification.data || {}) as {
		url?: string;
		notificationId?: string;
		entityId?: string;
		type?: string;
	};
	const rawUrl = notifData.url || '/';
	const targetUrl = new URL(rawUrl, sw.location.origin).href;
	const notificationId = notifData.notificationId;

	event.waitUntil(
		(async () => {
			// Marquer immédiatement la notification comme vue/lue côté serveur
			if (notificationId) {
				try {
					await fetch(`/api/notifications/read?id=${encodeURIComponent(notificationId)}`, {
						method: 'POST'
					});
				} catch {
					// Ignorer en mode hors ligne
				}
			}

			const clientList = await sw.clients.matchAll({ type: 'window', includeUncontrolled: true });
			const messagePayload = {
				type: 'NOTIFICATION_CLICK',
				url: targetUrl,
				rawUrl,
				notificationId,
				entityId: notifData.entityId
			};

			// Normalisation d'URL pour comparaison robuste (sans trailing slash ni hash)
			const normalize = (u: string) => u.split('#')[0].replace(/\/+$/, '');
			const targetNorm = normalize(targetUrl);

			// 1. Si une fenêtre est déjà exactement sur l'URL cible, on lui donne le focus et on lui signale le clic
			for (const client of clientList) {
				if (normalize(client.url) === targetNorm && 'focus' in client) {
					client.postMessage(messagePayload);
					return client.focus();
				}
			}

			// 2. Si une fenêtre de l'appli (ex: PWA installée ou onglet) est ouverte,
			// on lui transmet l'événement pour naviguer en interne via SvelteKit (goto) et on lui donne le focus.
			// Cela évite un client.navigate() brutal qui détruit le contexte PWA sous Firefox Mobile.
			for (const client of clientList) {
				if (client.url.startsWith(sw.location.origin) && 'focus' in client) {
					client.postMessage(messagePayload);
					return client.focus();
				}
			}

			// 3. Sinon, aucune fenêtre n'est ouverte, on en ouvre une avec l'URL absolue
			if (sw.clients.openWindow) {
				return sw.clients.openWindow(targetUrl);
			}
		})()
	);
});
