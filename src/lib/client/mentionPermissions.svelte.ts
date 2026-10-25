import { browser } from '$app/environment';

class MentionPermissionStore {
	private cache = $state<Record<string, boolean>>({});
	private pendingUsernames = new Set<string>();
	private debounceTimer: ReturnType<typeof setTimeout> | null = null;

	/**
	 * Détermine si le lien vers le profil d'un pseudo mentionné est cliquable.
	 * Retourne true si l'utilisateur autorise les mentions, false sinon.
	 */
	isClickable(username: string): boolean {
		const lower = username.toLowerCase();
		if (lower in this.cache) {
			return this.cache[lower];
		}

		this.queueCheck(lower);
		// Par défaut pendant le premier chargement rapide
		return true;
	}

	/**
	 * Pré-remplit le cache pour éviter un appel réseau si l'info est déjà connue localement.
	 */
	seed(username: string, allowMentions: boolean) {
		this.cache[username.toLowerCase()] = allowMentions;
	}

	private queueCheck(username: string) {
		if (!browser) return;
		this.pendingUsernames.add(username);

		if (this.debounceTimer) clearTimeout(this.debounceTimer);
		this.debounceTimer = setTimeout(() => {
			this.fetchPending();
		}, 40);
	}

	private async fetchPending() {
		if (this.pendingUsernames.size === 0) return;
		const toFetch = Array.from(this.pendingUsernames);
		this.pendingUsernames.clear();

		try {
			const res = await fetch(
				`/api/mention-status?usernames=${encodeURIComponent(toFetch.join(','))}`
			);
			if (res.ok) {
				const data = await res.json();
				if (data.statuses) {
					for (const [uname, status] of Object.entries(data.statuses)) {
						this.cache[uname.toLowerCase()] = Boolean(status);
					}
				}
			}
		} catch (e) {
			console.error('Erreur lors de la vérification des permissions de mention:', e);
		}
	}
}

export const mentionPermissions = new MentionPermissionStore();
