import { browser } from '$app/environment';
import type { EmojiItem } from '$lib/types';

class EmojiStoreState {
	emojiMap = $state<Record<string, string>>({});
	emojiNameMap = $state<Record<string, string>>({});
	missingKeys = $state<Record<string, boolean>>({});
	private pendingNames = new Set<string>();
	private resolveTimeout: ReturnType<typeof setTimeout> | null = null;

	constructor() {
		if (browser) {
			this.loadActiveEmojis();
		}
	}

	async loadActiveEmojis() {
		try {
			const res = await fetch('/api/emoji-sets/active');
			if (res.ok) {
				const data = await res.json();
				if (data.emojis && Array.isArray(data.emojis)) {
					const next: Record<string, string> = {};
					const nextNames: Record<string, string> = {};
					for (const em of data.emojis as EmojiItem[]) {
						if (!em.url) continue;
						if (em.id) {
							const idKey = em.id.toLowerCase();
							next[idKey] = em.url;
							if (em.name) nextNames[idKey] = em.name;
						}
						if (em.name) {
							const nameKey = em.name.toLowerCase();
							if (!next[nameKey]) {
								next[nameKey] = em.url;
							}
							nextNames[nameKey] = em.name;
						}
					}
					this.emojiMap = next;
					this.emojiNameMap = nextNames;
				}
			}
		} catch (err) {
			console.error('Erreur chargement emojis actifs:', err);
		}
	}

	invalidate() {
		this.emojiMap = {};
		this.emojiNameMap = {};
		this.missingKeys = {};
		this.pendingNames.clear();
		return this.loadActiveEmojis();
	}

	registerEmojis(emojis: EmojiItem[]) {
		const next = { ...this.emojiMap };
		const nextNames = { ...this.emojiNameMap };
		let changed = false;
		for (const em of emojis) {
			if (!em.url) continue;
			if (em.id) {
				const idKey = em.id.toLowerCase();
				if (next[idKey] !== em.url) {
					next[idKey] = em.url;
					changed = true;
				}
				if (em.name) nextNames[idKey] = em.name;
			}
			if (em.name) {
				const nameKey = em.name.toLowerCase();
				if (!next[nameKey]) {
					next[nameKey] = em.url;
					changed = true;
				}
				nextNames[nameKey] = em.name;
			}
		}
		if (changed) {
			this.emojiMap = next;
			this.emojiNameMap = nextNames;
		}
	}

	getEmojiUrl(key: string): string | null {
		const clean = key.toLowerCase().replace(/^:+|:+$/g, '');
		if (this.emojiMap[clean]) {
			return this.emojiMap[clean];
		}

		if (this.missingKeys[clean]) {
			return null;
		}

		if (browser && !this.pendingNames.has(clean)) {
			this.pendingNames.add(clean);
			this.scheduleResolve();
		}

		return null;
	}

	getEmojiDisplayName(key: string): string {
		const clean = key.toLowerCase().replace(/^:+|:+$/g, '');
		return this.emojiNameMap[clean] || clean;
	}

	private scheduleResolve() {
		if (this.resolveTimeout) return;
		this.resolveTimeout = setTimeout(async () => {
			this.resolveTimeout = null;
			if (this.pendingNames.size === 0) return;

			const namesToFetch = Array.from(this.pendingNames);
			this.pendingNames.clear();

			try {
				const res = await fetch(
					`/api/emojis/resolve?names=${encodeURIComponent(namesToFetch.join(','))}`
				);
				if (res.ok) {
					const data = await res.json();
					const resolvedEmojis: Record<string, string> = data.emojis || {};
					const resolvedNames: Record<string, string> = data.names || {};

					this.emojiMap = { ...this.emojiMap, ...resolvedEmojis };
					this.emojiNameMap = { ...this.emojiNameMap, ...resolvedNames };

					const nextMissing = { ...this.missingKeys };
					let missingChanged = false;
					for (const requested of namesToFetch) {
						if (!resolvedEmojis[requested] && !this.emojiMap[requested]) {
							nextMissing[requested] = true;
							missingChanged = true;
						}
					}
					if (missingChanged) {
						this.missingKeys = nextMissing;
					}
				}
			} catch (err) {
				console.error('Erreur résolution emojis:', err);
			}
		}, 60);
	}
}

export const emojiStore = new EmojiStoreState();
