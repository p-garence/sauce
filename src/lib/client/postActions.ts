import { globalPostState } from './postState.svelte';
import type { PostData } from '$lib/types';
import { apiToggleHidePost } from './api';

export async function togglePostHide(post: PostData, hide: boolean) {
	// 1. Mise à jour de l'objet local
	post.isHidden = hide;

	// 2. Mise à jour de l'état GLOBAL (synchronise le Flux, la Grille, etc.)
	globalPostState.hiddenStatus.set(post.id, hide);

	// Pour les posts RSS (éphémères sans persistance DB), on gère uniquement l'état local
	if (post.id.startsWith('rss-')) {
		return;
	}

	try {
		await apiToggleHidePost(post.id, hide ? 'hide' : 'unhide');
	} catch (error) {
		// En cas d'erreur, on annule partout
		post.isHidden = !hide;
		globalPostState.hiddenStatus.set(post.id, !hide);
		console.error('Erreur togglePostHide:', error);
	}
}
