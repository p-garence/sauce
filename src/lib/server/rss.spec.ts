import { describe, it, expect } from 'vitest';
import { isPrivateIp, validateHostForSsrf } from './rss/fetcher';
import { parseRssOrAtomXml, decodeXmlEntities, sanitizeToPlainText } from './rss/parser';

describe('RSS SSRF Security', () => {
	it('detects private and loopback IPv4 addresses', () => {
		expect(isPrivateIp('127.0.0.1')).toBe(true);
		expect(isPrivateIp('127.1.2.3')).toBe(true);
		expect(isPrivateIp('10.0.0.1')).toBe(true);
		expect(isPrivateIp('172.16.0.1')).toBe(true);
		expect(isPrivateIp('172.31.255.255')).toBe(true);
		expect(isPrivateIp('172.32.0.1')).toBe(false); // Public
		expect(isPrivateIp('192.168.1.1')).toBe(true);
		expect(isPrivateIp('169.254.169.254')).toBe(true); // Cloud metadata
		expect(isPrivateIp('8.8.8.8')).toBe(false); // Google DNS (public)
		expect(isPrivateIp('1.1.1.1')).toBe(false); // Cloudflare DNS (public)
	});

	it('detects private and loopback IPv6 addresses', () => {
		expect(isPrivateIp('::1')).toBe(true);
		expect(isPrivateIp('fc00::1')).toBe(true);
		expect(isPrivateIp('fe80::1')).toBe(true);
		expect(isPrivateIp('2001:4860:4860::8888')).toBe(false); // Google IPv6
	});

	it('blocks localhost and internal domains', async () => {
		await expect(validateHostForSsrf('localhost')).rejects.toThrow('interdit');
		await expect(validateHostForSsrf('service.local')).rejects.toThrow('interdit');
		await expect(validateHostForSsrf('internal.lan')).rejects.toThrow('interdit');
		await expect(validateHostForSsrf('127.0.0.1')).rejects.toThrow('interdit');
		await expect(validateHostForSsrf('192.168.1.50')).rejects.toThrow('interdit');
	});
});

describe('RSS & Atom Parser', () => {
	it('decodes XML entities properly', () => {
		expect(decodeXmlEntities('&amp; &lt;tag&gt; &quot;quote&quot; &#39;test&#39;')).toBe(
			'& <tag> "quote" \'test\''
		);
	});

	it('sanitizes HTML to plain text without tags or scripts', () => {
		const html =
			'<p>Bienvenue sur <strong>notre site</strong> !</p><script>alert("hack")</script><br/>Suite du texte.';
		expect(sanitizeToPlainText(html)).toBe('Bienvenue sur notre site ! Suite du texte.');
	});

	it('parses RSS 2.0 XML with enclosures and CDATA', () => {
		const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
	<channel>
		<title>Mon Blog Tech</title>
		<link>https://monblog.tech</link>
		<description>Actualités technologiques</description>
		<item>
			<title><![CDATA[Nouveau processeur ultra rapide]]></title>
			<link>https://monblog.tech/article-1</link>
			<guid>art-12345</guid>
			<pubDate>Mon, 20 Oct 2026 14:30:00 GMT</pubDate>
			<dc:creator>Alice Dev</dc:creator>
			<description><![CDATA[<p>Découvrez les performances exceptionnelles du nouveau composant.</p>]]></description>
			<enclosure url="https://monblog.tech/images/cpu.jpg" type="image/jpeg" length="12345" />
		</item>
	</channel>
</rss>`;

		const feed = parseRssOrAtomXml(xml, 'https://monblog.tech/feed.xml');
		expect(feed.title).toBe('Mon Blog Tech');
		expect(feed.siteUrl).toBe('https://monblog.tech');
		expect(feed.items).toHaveLength(1);

		const item = feed.items[0];
		expect(item.guid).toBe('art-12345');
		expect(item.title).toBe('Nouveau processeur ultra rapide');
		expect(item.link).toBe('https://monblog.tech/article-1');
		expect(item.author).toBe('Alice Dev');
		expect(item.imageUrl).toBe('https://monblog.tech/images/cpu.jpg');
		expect(item.summary).toContain('Découvrez les performances exceptionnelles');
		expect(item.publishedAt.toISOString()).toBe('2026-10-20T14:30:00.000Z');
	});

	it('parses Atom 1.0 XML with entries and links', () => {
		const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
	<title>Nouvelles du Web</title>
	<link href="https://webnews.org" rel="alternate" />
	<entry>
		<title>Mise à jour majeure du standard</title>
		<link href="https://webnews.org/update-2026" />
		<id>urn:uuid:1225c695-cfb8-4ebb-aaaa-80da344efa6a</id>
		<published>2026-10-21T10:00:00Z</published>
		<summary>Une mise à jour importante a été publiée ce matin.</summary>
		<content type="html"><![CDATA[<p><img src="https://webnews.org/banner.png" />Détails complets de la spécification.</p>]]></content>
	</entry>
</feed>`;

		const feed = parseRssOrAtomXml(xml, 'https://webnews.org/atom.xml');
		expect(feed.title).toBe('Nouvelles du Web');
		expect(feed.siteUrl).toBe('https://webnews.org');
		expect(feed.items).toHaveLength(1);

		const entry = feed.items[0];
		expect(entry.title).toBe('Mise à jour majeure du standard');
		expect(entry.link).toBe('https://webnews.org/update-2026');
		expect(entry.imageUrl).toBe('https://webnews.org/banner.png');
		expect(entry.publishedAt.toISOString()).toBe('2026-10-21T10:00:00.000Z');
	});
});
