/**
 * @module client/actions/clickOutside
 * @description Action Svelte déclenchant un callback lorsqu'un clic se produit en dehors de l'élément.
 */

/**
 * Action Svelte `use:clickOutside={handler}` détectant les clics en dehors du noeud DOM cible.
 *
 * @param node Élément HTML surveillé
 * @param callback Fonction appelée lors d'un clic extérieur
 */
export function clickOutside(node: HTMLElement, callback: (event: MouseEvent) => void) {
	let currentCallback = callback;

	function handleClick(event: MouseEvent) {
		const target = event.target as Node | null;
		if (node && target && !node.contains(target) && !event.defaultPrevented) {
			currentCallback(event);
		}
	}

	document.addEventListener('click', handleClick, true);

	return {
		update(newCallback: (event: MouseEvent) => void) {
			currentCallback = newCallback;
		},
		destroy() {
			document.removeEventListener('click', handleClick, true);
		}
	};
}
