// src/lib/client/followState.svelte.ts
import { SvelteMap } from 'svelte/reactivity';

export type FollowStatus = 'following' | 'pending' | 'none';

// Map réactive globale partagée par tous les composants de l'application
const followStatusMap = new SvelteMap<string, FollowStatus>();

export const globalFollowState = {
	/**
	 * Récupère le statut réactif d'un utilisateur cible
	 */
	get(targetId: string, fallback?: FollowStatus): FollowStatus | undefined {
		if (!targetId) return fallback;
		return followStatusMap.get(targetId) ?? fallback;
	},

	/**
	 * Met à jour le statut et synchronise instantanément tous les composants
	 */
	set(targetId: string, status: FollowStatus) {
		if (!targetId) return;
		followStatusMap.set(targetId, status);
	},

	/**
	 * Vérifie si le statut est déjà présent dans le cache réactif
	 */
	has(targetId: string): boolean {
		if (!targetId) return false;
		return followStatusMap.has(targetId);
	},

	/**
	 * Initialise le statut si non présent
	 */
	init(targetId: string, initialStatus?: FollowStatus | boolean | null) {
		if (!targetId || followStatusMap.has(targetId)) return;
		if (initialStatus !== undefined && initialStatus !== null) {
			const status: FollowStatus =
				typeof initialStatus === 'boolean' ? (initialStatus ? 'following' : 'none') : initialStatus;
			followStatusMap.set(targetId, status);
		}
	},

	/**
	 * Efface l'état d'un utilisateur ou tout l'état
	 */
	clear(targetId?: string) {
		if (targetId) {
			followStatusMap.delete(targetId);
		} else {
			followStatusMap.clear();
		}
	}
};
