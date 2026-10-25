import { apiRecordPostViews } from './api';

// 1. Mémoire de session globale (empêche de re-tracker un post même si Svelte redessine le composant)
const viewedInSession = new Set<string>();

// 2. Panier d'envoi et Singleton Observer
const pendingViews: Set<string> = new Set();
let observer: IntersectionObserver | null = null;
let timeoutId: ReturnType<typeof setTimeout> | null = null;

// Envoie les posts accumulés au serveur
function flushViews() {
	if (pendingViews.size === 0) return;

	const postIds = Array.from(pendingViews);
	pendingViews.clear(); // On vide le panier

	// Requête "Fire-and-forget"
	apiRecordPostViews(postIds)?.catch((e) => {
		console.error("Erreur d'envoi des vues:", e);
		// En cas de coupure internet, on retire les IDs de la mémoire pour permettre un nouvel essai plus tard
		postIds.forEach((id) => viewedInSession.delete(id));
	});
}

export function trackView(node: HTMLElement, postId: string) {
	if (!postId) return;
	// Si on l'a déjà vu pendant cette session (ex: on remonte le flux), on ne fait rien !
	if (viewedInSession.has(postId)) return;

	if (!observer && typeof window !== 'undefined') {
		observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						const id = entry.target.getAttribute('data-post-id');

						// Double sécurité : on vérifie que l'ID existe ET qu'il n'a pas déjà été vu
						if (id && !viewedInSession.has(id)) {
							// 1. On le marque comme vu définitivement dans la session
							viewedInSession.add(id);

							// 2. On l'ajoute au panier d'envoi
							pendingViews.add(id);

							// 3. Le post est validé, on arrête de l'observer pour économiser le processeur
							observer!.unobserve(entry.target);

							// 4. Si aucun chrono n'est en cours, on lance le minuteur de 2 secondes
							if (!timeoutId) {
								timeoutId = setTimeout(() => {
									flushViews();
									timeoutId = null;
								}, 2000);
							}
						}
					}
				});
			},
			{ threshold: 0.6 }
		); // Le post doit être visible à 60%
	}

	// On attache l'ID au nœud HTML et on l'observe
	node.setAttribute('data-post-id', postId);
	observer?.observe(node);

	return {
		destroy() {
			// Nettoyage propre quand le composant est détruit
			if (observer) observer.unobserve(node);
		}
	};
}
