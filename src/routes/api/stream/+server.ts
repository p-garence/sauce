import { requireApiSession } from '$lib/server/auth';
import { client } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request }) => {
	const session = await requireApiSession(request);

	// Canal unique pour TOUT ce qui concerne cet utilisateur
	const channelName = `events_user_${session.user.id.replace(/-/g, '_')}`;

	let listenConnection: { unlisten: () => Promise<void> } | undefined;
	let keepAliveInterval: NodeJS.Timeout;
	let isClosed = false; // Sécurité pour éviter d'écrire dans un flux fermé

	const stream = new ReadableStream({
		async start(controller) {
			// 1. Abonnement à Postgres
			try {
				listenConnection = await client.listen(channelName, (payload) => {
					if (!isClosed) {
						controller.enqueue(`data: ${payload}\n\n`);
					}
				});
				if (isClosed && listenConnection) {
					await listenConnection.unlisten().catch(() => {});
					return;
				}
			} catch (err) {
				console.error('Erreur SSE (Postgres Listen):', err);
				controller.error(err);
				return;
			}

			// 2. NOUVEAU : Heartbeat (Ping) toutes les 25 secondes
			// Un commentaire SSE (qui commence par ":" sans "data:") est ignoré par
			// le navigateur (EventSource), mais maintient la connexion réseau ouverte !
			keepAliveInterval = setInterval(() => {
				if (!isClosed) {
					controller.enqueue(`: ping\n\n`);
				}
			}, 25000);

			// 3. CORRECTION : Gestion propre de la déconnexion
			request.signal.addEventListener('abort', async () => {
				isClosed = true;
				clearInterval(keepAliveInterval);

				if (listenConnection) {
					try {
						await listenConnection.unlisten();
					} catch (err) {
						console.error('Erreur lors du unlisten:', err);
					}
				}
			});
		},

		// 4. NOUVEAU : Le runtime peut aussi demander une annulation "douce"
		cancel() {
			isClosed = true;
			clearInterval(keepAliveInterval);
			if (listenConnection) {
				listenConnection.unlisten().catch(() => {});
			}
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
};
