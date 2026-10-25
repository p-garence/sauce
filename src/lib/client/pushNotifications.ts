import { browser } from '$app/environment';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
	const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
	const rawData = window.atob(base64);
	const outputArray = new Uint8Array(rawData.length);
	for (let i = 0; i < rawData.length; ++i) {
		outputArray[i] = rawData.charCodeAt(i);
	}
	return outputArray;
}

export function isPushSupported(): boolean {
	if (!browser) return false;
	return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function isIosNeedsInstall(): boolean {
	if (!browser) return false;
	const isIos =
		/iPad|iPhone|iPod/.test(navigator.userAgent) ||
		(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
	// Sur iOS, window.navigator.standalone indique si l'app est lancée depuis l'écran d'accueil (PWA)
	const isStandalone =
		('standalone' in window.navigator &&
			(window.navigator as unknown as { standalone: boolean }).standalone) ||
		window.matchMedia('(display-mode: standalone)').matches;

	return isIos && !isStandalone;
}

export async function getPushSubscriptionState(): Promise<{
	isSupported: boolean;
	isIosNeedsInstall: boolean;
	permission: NotificationPermission;
	isSubscribed: boolean;
}> {
	if (!isPushSupported()) {
		return {
			isSupported: false,
			isIosNeedsInstall: isIosNeedsInstall(),
			permission: 'denied',
			isSubscribed: false
		};
	}

	const permission = Notification.permission;
	try {
		const reg = await navigator.serviceWorker.ready;
		const sub = await reg.pushManager.getSubscription();
		return {
			isSupported: true,
			isIosNeedsInstall: false,
			permission,
			isSubscribed: sub !== null
		};
	} catch (err) {
		console.error('[WebPush] Erreur vérification souscription:', err);
		return {
			isSupported: true,
			isIosNeedsInstall: false,
			permission,
			isSubscribed: false
		};
	}
}

export async function subscribeToPush(): Promise<{ success: boolean; message?: string }> {
	if (!isPushSupported()) {
		if (isIosNeedsInstall()) {
			return {
				success: false,
				message:
					'Sur iPhone, ajoutez d’abord l’application à votre écran d’accueil (Partager > Sur l’écran d’accueil) pour activer les notifications.'
			};
		}
		return {
			success: false,
			message: 'Les notifications Push ne sont pas supportées par votre navigateur.'
		};
	}

	// 1. Demande de permission
	const permission = await Notification.requestPermission();
	if (permission !== 'granted') {
		return {
			success: false,
			message: 'Permission de notification refusée dans le navigateur.'
		};
	}

	try {
		// 2. Récupération de la clé VAPID
		const resKey = await fetch('/api/push/vapid-key');
		if (!resKey.ok) throw new Error('Impossible de récupérer la clé VAPID');
		const { publicKey } = await resKey.json();
		if (!publicKey) throw new Error('Clé VAPID publique manquante');

		// 3. Souscription auprès du Service Worker
		const reg = await navigator.serviceWorker.ready;
		let subscription = await reg.pushManager.getSubscription();
		if (!subscription) {
			subscription = await reg.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource
			});
		}

		// 4. Enregistrement en base de données
		const subJson = subscription.toJSON();
		const resSave = await fetch('/api/push/subscribe', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				subscription: {
					endpoint: subJson.endpoint,
					keys: subJson.keys
				},
				userAgent: navigator.userAgent
			})
		});

		if (!resSave.ok) {
			const errData = await resSave.json().catch(() => ({}));
			throw new Error(errData.message || 'Erreur enregistrement serveur');
		}

		return { success: true, message: 'Notifications activées avec succès sur cet appareil !' };
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Erreur inconnue';
		console.error('[WebPush] Échec abonnement:', err);
		return { success: false, message };
	}
}

export async function unsubscribeFromPush(): Promise<{ success: boolean; message?: string }> {
	if (!isPushSupported()) {
		return { success: false, message: 'Non supporté' };
	}

	try {
		const reg = await navigator.serviceWorker.ready;
		const subscription = await reg.pushManager.getSubscription();

		if (subscription) {
			// Prévenir le serveur
			await fetch('/api/push/unsubscribe', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ endpoint: subscription.endpoint })
			}).catch(console.error);

			// Se désabonner du pushManager
			await subscription.unsubscribe();
		}

		return { success: true, message: 'Notifications désactivées sur cet appareil.' };
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Erreur lors de la désactivation';
		console.error('[WebPush] Échec désabonnement:', err);
		return { success: false, message };
	}
}

export async function sendTestPush(): Promise<{ success: boolean; message?: string }> {
	try {
		const res = await fetch('/api/push/test', { method: 'POST' });
		if (!res.ok) throw new Error('Erreur lors du test');
		const data = await res.json();
		return { success: true, message: data.message };
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Échec de l’envoi de la notification test';
		return { success: false, message };
	}
}
