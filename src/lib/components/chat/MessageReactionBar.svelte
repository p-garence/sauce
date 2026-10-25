<script lang="ts">
	/**
	 * @component MessageReactionBar
	 * @domain chat
	 * @description Barre flottante d'emojis favoris pour réagir rapidement à un message de chat.
	 *
	 * @responsibilities
	 * - Afficher la liste des emojis favoris de l'utilisateur sous forme de boutons animés.
	 * - Proposer un bouton de redirection vers les paramètres d'emojis si aucun favori n'est configuré ou pour en ajouter.
	 * - Fermer la barre lors de la sélection ou d'un clic extérieur.
	 */

	import { resolve } from '$app/paths';
	import type { EmojiItem } from '$lib/types';
	import Icon from '$lib/components/ui/Icon.svelte';

	interface Props {
		/** Liste des emojis favoris de l'utilisateur */
		favoriteEmojis?: EmojiItem[];
		/** Alignement de la barre : côté gauche ou droite */
		align?: 'left' | 'right';
		/** Callback quand un emoji est sélectionné */
		onSelect: (emoji: EmojiItem) => void;
		/** Callback pour fermer la barre */
		onClose: () => void;
	}

	let { favoriteEmojis = [], align = 'left', onSelect, onClose }: Props = $props();

	function handleBackdropClick(e: MouseEvent) {
		e.stopPropagation();
		onClose();
	}
</script>

<div class="reaction-bar-backdrop" onclick={handleBackdropClick} role="presentation"></div>

<div class="reaction-bar {align}" role="toolbar" aria-label="Réactions rapides">
	{#if favoriteEmojis.length > 0}
		<div class="emojis-list">
			{#each favoriteEmojis as emoji (emoji.id)}
				<button
					type="button"
					class="emoji-btn"
					onclick={(e) => {
						e.stopPropagation();
						onSelect(emoji);
						onClose();
					}}
					title={emoji.name}
				>
					<img src={emoji.url} alt={emoji.name} class="emoji-img" />
				</button>
			{/each}
		</div>

		<a
			href={resolve('/parametres?tab=emojis')}
			class="add-favorites-btn"
			title="Gérer mes émojis favoris"
			onclick={(e) => e.stopPropagation()}
		>
			<Icon name="action.plus" size={14} />
		</a>
	{:else}
		<a
			href={resolve('/parametres?tab=emojis')}
			class="configure-link"
			onclick={(e) => e.stopPropagation()}
			title="Ajouter des emojis favoris dans les paramètres"
		>
			<Icon name="status.tag" size={16} />
			<span>Configurer mes favoris</span>
		</a>
	{/if}
</div>

<style>
	.reaction-bar-backdrop {
		position: fixed;
		inset: 0;
		z-index: 40;
		background: transparent;
	}

	.reaction-bar {
		position: absolute;
		top: -46px;
		z-index: 50;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 8px;
		background: rgba(255, 255, 255, 0.96);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid rgba(0, 0, 0, 0.1);
		border-radius: 9999px;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12), 0 1px 4px rgba(0, 0, 0, 0.06);
		animation: popIn 0.18s cubic-bezier(0.175, 0.885, 0.32, 1.275);
		user-select: none;
	}

	.reaction-bar.left {
		left: 0;
	}

	.reaction-bar.right {
		right: 0;
	}

	@keyframes popIn {
		from {
			opacity: 0;
			transform: scale(0.8) translateY(6px);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}

	.emojis-list {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.emoji-btn {
		background: none;
		border: none;
		padding: 4px;
		border-radius: 50%;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275);
	}

	.emoji-btn:hover,
	.emoji-btn:focus-visible {
		transform: scale(1.35) translateY(-3px);
	}

	.emoji-btn:active {
		transform: scale(1.1);
	}

	.emoji-img {
		width: 26px;
		height: 26px;
		object-fit: contain;
		pointer-events: none;
	}

	.add-favorites-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		border-radius: 50%;
		background: #f3f4f6;
		color: #4b5563;
		text-decoration: none;
		transition: all 0.15s ease;
		margin-left: 2px;
	}

	.add-favorites-btn:hover {
		background: #e5e7eb;
		color: #111827;
		transform: scale(1.1);
	}

	.configure-link {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		font-size: 0.82rem;
		font-weight: 500;
		color: #0284c7;
		text-decoration: none;
		border-radius: 9999px;
		transition: background 0.15s ease;
		white-space: nowrap;
	}

	.configure-link:hover {
		background: rgba(2, 132, 199, 0.08);
	}
</style>
