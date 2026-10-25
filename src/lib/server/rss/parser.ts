export type ParsedRssItem = {
	guid: string;
	title: string;
	link: string;
	publishedAt: Date;
	summary: string;
	imageUrl: string | null;
	author: string | null;
};

export type ParsedRssFeed = {
	title: string;
	siteUrl: string;
	description: string;
	items: ParsedRssItem[];
};

/**
 * Décode les entités XML/HTML standards.
 */
export function decodeXmlEntities(str: string): string {
	if (!str) return '';
	return str
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&#39;/g, "'")
		.replace(/&#x27;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&amp;/g, '&')
		.replace(/&#(\d+);/g, (_, dec) => {
			try {
				return String.fromCharCode(parseInt(dec, 10));
			} catch {
				return '';
			}
		})
		.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
			try {
				return String.fromCharCode(parseInt(hex, 16));
			} catch {
				return '';
			}
		});
}

/**
 * Extrait le contenu textuel d'une balise XML (première occurrence), en gérant le CDATA et les entités.
 */
function extractTagContent(xml: string, tagName: string): string | null {
	const regex = new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, 'i');
	const match = xml.match(regex);
	if (!match) return null;

	const raw = match[1].trim();
	const cdataMatch = raw.match(/<!\[CDATA\[([\s\S]*?)\]\]>/i);
	if (cdataMatch) {
		return cdataMatch[1].trim();
	}

	return decodeXmlEntities(raw);
}

/**
 * Extrait un attribut spécifique d'une balise XML auto-fermante ou non.
 */
function extractAttribute(xml: string, tagName: string, attrName: string): string | null {
	const regex = new RegExp(`<${tagName}[^>]*\\b${attrName}=["']([^"']+)["'][^>]*>`, 'i');
	const match = xml.match(regex);
	return match ? decodeXmlEntities(match[1].trim()) : null;
}

/**
 * Valide et normalise une URL pour ne conserver strictement que les protocoles http: et https:.
 */
export function sanitizeHttpUrl(rawUrl: string | null | undefined, baseUrl = ''): string {
	if (!rawUrl) return '';
	const trimmed = rawUrl.trim();
	if (!trimmed) return '';
	try {
		const resolved = baseUrl ? new URL(trimmed, baseUrl) : new URL(trimmed);
		if (resolved.protocol === 'http:' || resolved.protocol === 'https:') {
			if (
				resolved.pathname === '/' &&
				!resolved.search &&
				!resolved.hash &&
				!trimmed.endsWith('/')
			) {
				return resolved.origin;
			}
			return resolved.toString();
		}
		return '';
	} catch {
		return '';
	}
}

/**
 * Nettoie une chaîne HTML pour en extraire un résumé texte lisible et sécurisé (sans balises).
 */
export function sanitizeToPlainText(html: string, maxLength = 280): string {
	if (!html) return '';

	const firstPass = html
		// Supprimer scripts et styles bruts
		.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
		.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
		// Remplacer les sauts de ligne / paragraphes par un espace
		.replace(/<(?:br|\/p|\/div)\s*\/?>/gi, ' ')
		// Supprimer toutes les autres balises HTML
		.replace(/<[^>]+>/g, '')
		.replace(/&nbsp;/gi, ' ');

	// Décoder les entités XML/HTML puis supprimer toute balise ou chevron reconstitué après décodage
	const decoded = decodeXmlEntities(firstPass)
		.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
		.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
		.replace(/<[^>]+>/g, '')
		.replace(/[<>]/g, '')
		.replace(/\s+/g, ' ')
		.trim();

	if (decoded.length <= maxLength) {
		return decoded;
	}

	return decoded.slice(0, maxLength - 1).trim() + '…';
}

/**
 * Tente d'extraire une URL d'image depuis les balises multimédias ou une balise <img> dans le HTML.
 */
function extractImageUrl(blockXml: string, baseUrl = ''): string | null {
	let candidate: string | null = null;

	// 1. <enclosure ... type="image/..." url="..." />
	const enclosureMatch =
		blockXml.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]*type=["']image\/[^"']+["']/i) ||
		blockXml.match(/<enclosure[^>]+type=["']image\/[^"']+["'][^>]+url=["']([^"']+)["']/i);
	if (enclosureMatch) {
		candidate = enclosureMatch[1].trim();
	}

	// 2. <media:content ... url="..." (medium="image" ou type="image/...") />
	if (!candidate) {
		const mediaContentMatch = blockXml.match(/<media:content[^>]+url=["']([^"']+)["'][^>]*>/i);
		if (mediaContentMatch && mediaContentMatch[1].trim()) {
			candidate = mediaContentMatch[1].trim();
		}
	}

	// 3. <media:thumbnail ... url="..." />
	if (!candidate) {
		const thumbnailMatch = blockXml.match(/<media:thumbnail[^>]+url=["']([^"']+)["'][^>]*>/i);
		if (thumbnailMatch) {
			candidate = thumbnailMatch[1].trim();
		}
	}

	// 4. Balise <img> dans description / content
	if (!candidate) {
		const imgMatch = blockXml.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["'][^>]*>/i);
		if (imgMatch) {
			const src = imgMatch[1].trim();
			// Éliminer les pixels de tracking (1x1) ou images minuscules
			if (!src.includes('tracker') && !src.includes('pixel') && !src.includes('1x1')) {
				candidate = src;
			}
		}
	}

	if (!candidate) return null;
	const safeUrl = sanitizeHttpUrl(decodeXmlEntities(candidate), baseUrl);
	return safeUrl || null;
}

/**
 * Analyse un flux XML complet (RSS 2.0 ou Atom 1.0) et extrait les métadonnées et articles.
 */
export function parseRssOrAtomXml(xml: string, defaultSiteUrl = ''): ParsedRssFeed {
	const isAtom = xml.includes('<feed') && xml.includes('xmlns="http://www.w3.org/2005/Atom"');

	if (isAtom) {
		return parseAtom(xml, defaultSiteUrl);
	}
	return parseRss2(xml, defaultSiteUrl);
}

/**
 * Parseur dédié pour les flux RSS 2.0.
 */
function parseRss2(xml: string, fallbackUrl: string): ParsedRssFeed {
	// En-tête du canal
	const channelMatch = xml.match(/<channel[\s\S]*?>([\s\S]*?)<\/channel>/i);
	const channelXml = channelMatch ? channelMatch[1] : xml;

	const safeFallback = sanitizeHttpUrl(fallbackUrl);
	const title = extractTagContent(channelXml, 'title') || 'Flux RSS';
	const rawSiteUrl = extractTagContent(channelXml, 'link');
	const siteUrl = sanitizeHttpUrl(rawSiteUrl, safeFallback) || safeFallback;

	const description = extractTagContent(channelXml, 'description') || '';

	// Extraction des <item>
	const items: ParsedRssItem[] = [];
	const itemRegex = /<item[\s\S]*?>([\s\S]*?)<\/item>/gi;
	let match: RegExpExecArray | null;

	while ((match = itemRegex.exec(xml)) !== null) {
		const itemXml = match[1];

		const itemTitle = extractTagContent(itemXml, 'title') || 'Sans titre';
		let rawItemLink =
			extractTagContent(itemXml, 'link') ||
			extractAttribute(itemXml, 'link', 'href') ||
			'';

		if (!rawItemLink) {
			const guid = extractTagContent(itemXml, 'guid');
			if (guid && (guid.startsWith('http://') || guid.startsWith('https://'))) {
				rawItemLink = guid;
			}
		}

		const itemLink = sanitizeHttpUrl(rawItemLink, siteUrl || safeFallback) || safeFallback;

		const guid = extractTagContent(itemXml, 'guid') || itemLink || `${itemTitle}_${items.length}`;

		const dateStr = extractTagContent(itemXml, 'pubDate') || extractTagContent(itemXml, 'dc:date');
		let publishedAt = new Date();
		if (dateStr) {
			const parsed = new Date(dateStr);
			if (!Number.isNaN(parsed.getTime())) {
				publishedAt = parsed;
			}
		}

		// Description / Contenu
		const rawContent =
			extractTagContent(itemXml, 'content:encoded') ||
			extractTagContent(itemXml, 'description') ||
			'';
		const summary = sanitizeToPlainText(rawContent);

		const imageUrl = extractImageUrl(itemXml, siteUrl || safeFallback);
		const author = extractTagContent(itemXml, 'dc:creator') || extractTagContent(itemXml, 'author') || null;

		items.push({
			guid,
			title: itemTitle,
			link: itemLink,
			publishedAt,
			summary,
			imageUrl,
			author
		});
	}

	return {
		title,
		siteUrl,
		description,
		items
	};
}

/**
 * Parseur dédié pour les flux Atom 1.0.
 */
function parseAtom(xml: string, fallbackUrl: string): ParsedRssFeed {
	const safeFallback = sanitizeHttpUrl(fallbackUrl);
	const feedTitle = extractTagContent(xml, 'title') || 'Flux Atom';
	const rawFeedLink = extractAttribute(xml, 'link', 'href');
	const feedLink = sanitizeHttpUrl(rawFeedLink, safeFallback) || safeFallback;
	const feedSubtitle = extractTagContent(xml, 'subtitle') || '';

	const items: ParsedRssItem[] = [];
	const entryRegex = /<entry[\s\S]*?>([\s\S]*?)<\/entry>/gi;
	let match: RegExpExecArray | null;

	while ((match = entryRegex.exec(xml)) !== null) {
		const entryXml = match[1];

		const itemTitle = extractTagContent(entryXml, 'title') || 'Sans titre';
		let rawItemLink =
			extractAttribute(entryXml, 'link', 'href') ||
			extractTagContent(entryXml, 'link') ||
			'';

		if (!rawItemLink) {
			const id = extractTagContent(entryXml, 'id');
			if (id && (id.startsWith('http://') || id.startsWith('https://'))) {
				rawItemLink = id;
			}
		}

		const itemLink = sanitizeHttpUrl(rawItemLink, feedLink || safeFallback) || safeFallback;

		const id = extractTagContent(entryXml, 'id') || itemLink || `${itemTitle}_${items.length}`;

		const dateStr = extractTagContent(entryXml, 'published') || extractTagContent(entryXml, 'updated');
		let publishedAt = new Date();
		if (dateStr) {
			const parsed = new Date(dateStr);
			if (!Number.isNaN(parsed.getTime())) {
				publishedAt = parsed;
			}
		}

		const rawContent =
			extractTagContent(entryXml, 'summary') ||
			extractTagContent(entryXml, 'content') ||
			'';
		const summary = sanitizeToPlainText(rawContent);

		const imageUrl = extractImageUrl(entryXml, feedLink || safeFallback);
		const author = extractTagContent(entryXml, 'name') || null;

		items.push({
			guid: id,
			title: itemTitle,
			link: itemLink,
			publishedAt,
			summary,
			imageUrl,
			author
		});
	}

	return {
		title: feedTitle,
		siteUrl: feedLink,
		description: feedSubtitle,
		items
	};
}
