import dns from 'node:dns/promises';

/**
 * Vérifie si une adresse IP (IPv4 ou IPv6) appartient à une plage privée, réservée ou loopback (SSRF).
 */
export function isPrivateIp(ip: string): boolean {
	// IPv4 Loopback (127.0.0.0/8) et Any (0.0.0.0/8)
	if (ip.startsWith('127.') || ip.startsWith('0.')) return true;

	// IPv4 Link-local (169.254.0.0/16)
	if (ip.startsWith('169.254.')) return true;

	// IPv4 Private Class A (10.0.0.0/8)
	if (ip.startsWith('10.')) return true;

	// IPv4 Private Class B (172.16.0.0/12: 172.16.x.x - 172.31.x.x)
	const match172 = ip.match(/^172\.(\d+)\./);
	if (match172) {
		const second = parseInt(match172[1], 10);
		if (second >= 16 && second <= 31) return true;
	}

	// IPv4 Private Class C (192.168.0.0/16)
	if (ip.startsWith('192.168.')) return true;

	// IPv4 CGNAT (100.64.0.0/10: 100.64.0.0 - 100.127.255.255)
	const match100 = ip.match(/^100\.(\d+)\./);
	if (match100) {
		const second = parseInt(match100[1], 10);
		if (second >= 64 && second <= 127) return true;
	}

	// IPv6 Loopback (::1, 0:0:0:0:0:0:0:1)
	if (ip === '::1' || ip === '0:0:0:0:0:0:0:1') return true;

	// IPv6 Unique Local (fc00::/7 -> fc00... ou fd00...)
	const lower = ip.toLowerCase();
	if (lower.startsWith('fc') || lower.startsWith('fd')) return true;

	// IPv6 Link-local (fe80::/10)
	if (
		lower.startsWith('fe8') ||
		lower.startsWith('fe9') ||
		lower.startsWith('fea') ||
		lower.startsWith('feb')
	)
		return true;

	// IPv4-mapped IPv6 (ex: ::ffff:127.0.0.1)
	if (lower.startsWith('::ffff:')) {
		const mappedIpv4 = lower.slice(7);
		return isPrivateIp(mappedIpv4);
	}

	return false;
}

/**
 * Valide qu'un nom d'hôte ne résout pas vers une IP privée ou réservée.
 */
export async function validateHostForSsrf(hostname: string): Promise<void> {
	const lower = hostname.toLowerCase().trim();

	// Hôtes locaux évidents
	if (
		lower === 'localhost' ||
		lower.endsWith('.localhost') ||
		lower.endsWith('.local') ||
		lower.endsWith('.internal') ||
		lower.endsWith('.lan') ||
		lower === 'metadata.google.internal' ||
		lower === '169.254.169.254'
	) {
		throw new Error(`Accès à l'hôte local interdit : ${hostname}`);
	}

	// Si c'est directement une IP littérale
	if (isPrivateIp(lower)) {
		throw new Error(`Accès à l'adresse IP privée interdit : ${hostname}`);
	}

	try {
		// Résolution DNS des adresses IPv4 et IPv6
		const records = await dns.lookup(lower, { all: true });
		for (const record of records) {
			if (isPrivateIp(record.address)) {
				throw new Error(
					`L'hôte ${hostname} résout vers une adresse IP privée interdite (${record.address})`
				);
			}
		}
	} catch (err: unknown) {
		if ((err as Error).message?.includes('interdit')) {
			throw err;
		}
		// Si la résolution DNS échoue (nom introuvable)
		throw new Error(`Impossible de résoudre l'hôte DNS : ${hostname}`, { cause: err });
	}
}

/**
 * Télécharge le contenu XML d'une URL RSS/Atom avec protection SSRF, timeout et limite de taille.
 */
export async function fetchRssXml(
	urlStr: string,
	options: { etag?: string; lastModified?: string; timeoutMs?: number } = {}
): Promise<{ xml: string; status: number; etag?: string; lastModified?: string }> {
	let currentUrl: URL;
	try {
		currentUrl = new URL(urlStr);
	} catch {
		throw new Error('URL de flux RSS invalide');
	}

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 8000);

	const headers: Record<string, string> = {
		'User-Agent': 'SocialApp-RSS-Bot/1.0 (+https://social.local; syndication reader)',
		Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*'
	};

	if (options.etag) {
		headers['If-None-Match'] = options.etag;
	}
	if (options.lastModified) {
		headers['If-Modified-Since'] = options.lastModified;
	}

	const MAX_REDIRECTS = 5;
	const MAX_BYTES = 5 * 1024 * 1024;

	try {
		let response: Response | null = null;

		for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
			if (currentUrl.protocol !== 'http:' && currentUrl.protocol !== 'https:') {
				throw new Error(`Protocole non supporté : ${currentUrl.protocol}. Utilisez http ou https.`);
			}

			// Vérification de sécurité SSRF à chaque saut (initial + redirections)
			await validateHostForSsrf(currentUrl.hostname);

			response = await fetch(currentUrl.toString(), {
				method: 'GET',
				headers,
				signal: controller.signal,
				redirect: 'manual'
			});

			if ([301, 302, 303, 307, 308].includes(response.status)) {
				if (hop === MAX_REDIRECTS) {
					throw new Error('Trop de redirections HTTP lors de la récupération du flux RSS');
				}
				const location = response.headers.get('location');
				if (!location) {
					throw new Error('Redirection HTTP sans en-tête Location');
				}
				try {
					currentUrl = new URL(location, currentUrl);
				} catch {
					throw new Error('URL de redirection RSS invalide');
				}
				continue;
			}

			break;
		}

		if (!response) {
			throw new Error('Aucune réponse reçue du serveur RSS');
		}

		if (response.status === 304) {
			return {
				xml: '',
				status: 304,
				etag: options.etag,
				lastModified: options.lastModified
			};
		}

		if (!response.ok) {
			throw new Error(`Erreur HTTP ${response.status} lors de la récupération du flux RSS`);
		}

		// Vérification de la taille maximale (5 Mo)
		const contentLength = response.headers.get('content-length');
		if (contentLength && parseInt(contentLength, 10) > MAX_BYTES) {
			throw new Error('Le flux RSS dépasse la taille maximale autorisée (5 Mo)');
		}

		let xml = '';
		if (response.body && typeof response.body.getReader === 'function') {
			const reader = response.body.getReader();
			const chunks: Uint8Array[] = [];
			let receivedBytes = 0;

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				if (value) {
					receivedBytes += value.byteLength;
					if (receivedBytes > MAX_BYTES) {
						await reader.cancel().catch(() => {});
						throw new Error('Le flux RSS téléchargé dépasse 5 Mo');
					}
					chunks.push(value);
				}
			}

			const merged = new Uint8Array(receivedBytes);
			let offset = 0;
			for (const chunk of chunks) {
				merged.set(chunk, offset);
				offset += chunk.byteLength;
			}
			xml = new TextDecoder('utf-8').decode(merged);
		} else {
			xml = await response.text();
			if (xml.length > MAX_BYTES) {
				throw new Error('Le flux RSS téléchargé dépasse 5 Mo');
			}
		}

		return {
			xml,
			status: response.status,
			etag: response.headers.get('etag') || undefined,
			lastModified: response.headers.get('last-modified') || undefined
		};
	} finally {
		clearTimeout(timeout);
	}
}
