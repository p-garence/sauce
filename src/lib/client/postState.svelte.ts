import { SvelteMap } from 'svelte/reactivity';
import type { PostData } from '$lib/types';

// Un Map réactif : si on ajoute un statut ici, Svelte met à jour tous les composants qui le lisent !
export const globalPostState = {
	hiddenStatus: new SvelteMap<string, boolean>()
};

/**
 * Renvoie le statut "masqué" effectif d'un post : priorité à l'état global
 * (mis à jour de façon optimiste par togglePostHide), sinon la valeur venant de la BDD.
 * Centralise la logique dupliquée entre Post.svelte et PostGrid.svelte.
 */
export function getEffectiveHidden(post: PostData): boolean {
	return globalPostState.hiddenStatus.has(post.id)
		? (globalPostState.hiddenStatus.get(post.id) ?? false)
		: post.isHidden;
}
