<!--
  @component TextEditOverlay
  @domain media-editor
  @description Overlay modal plein écran style story pour la rédaction et le stylage fin d'un calque de texte.
  @responsibilities
    - Afficher l'éditeur de texte enrichi centré sur la scène
    - Intégrer les contrôles de style via TextStyleControls (police, couleur, alignement)
    - Proposer la bibliothèque d'émojis et de favoris
    - Adapter la hauteur dynamiquement lors de l'ouverture du clavier mobile (VisualViewport API)
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { emojiStore } from '$lib/client/emojiStore.svelte';
	import { EDITOR_FONTS, type EditorFont } from '$lib/constants';
	import Icon from '$lib/components/ui/Icon.svelte';
	import RichTextInput from '$lib/components/ui/RichTextInput.svelte';
	import type { EmojiItem, EmojiSet } from '$lib/types';
	import type { TextItem } from './types';
	import TextStyleControls from './TextStyleControls.svelte';

	/**
	 * Propriétés du composant TextEditOverlay
	 */
	interface Props {
		/** Calque de texte en cours d'édition */
		activeText: TextItem;
		/** Largeur actuelle du rectangle de cadrage */
		cropW: number;
		/** Callback lors de la validation des modifications */
		onDone: () => void;
		/** Callback lors de l'annulation */
		onCancel: () => void;
		/** Callback optionnel pour supprimer ce calque */
		onDelete?: () => void;
	}

	let { activeText, cropW, onDone, onCancel, onDelete }: Props = $props();

	let effectiveCropW = $derived(cropW > 50 ? cropW : 360);
	let boxWidth = $derived(
		Math.min(Math.round(effectiveCropW * 0.75), Math.round(activeText.relWidth * effectiveCropW))
	);
	let boxFontSize = $derived(Math.max(6, Math.round(activeText.relFontSize * effectiveCropW)));

	let richInputRef = $state<RichTextInput | null>(null);
	let showFontPicker = $state(false);
	let showColorPicker = $state(false);
	let showEmojiPicker = $state(false);

	let activeEmojiSets = $state<EmojiSet[]>([]);
	let allEmojis = $state<EmojiItem[]>([]);
	let userFavoriteEmojis = $state<EmojiItem[]>([]);
	let selectedSetId = $state<string>('all');

	let userFavorites = $derived.by<EmojiItem[]>(() => {
		if (userFavoriteEmojis.length > 0) return userFavoriteEmojis;
		const fromPage = (page.data?.userFavoriteEmojis as EmojiItem[]) || [];
		if (fromPage.length > 0) return fromPage;
		return allEmojis.slice(0, 8);
	});

	let displayedEmojis = $derived.by<EmojiItem[]>(() => {
		if (selectedSetId === 'all') return allEmojis;
		const set = activeEmojiSets.find((s) => s.id === selectedSetId);
		return set?.emojis || [];
	});

	function loadEmojis() {
		const setsFromPage = (page.data?.activeEmojiSets as EmojiSet[]) || [];
		const favsFromPage = (page.data?.userFavoriteEmojis as EmojiItem[]) || [];
		const allFromPage = (page.data?.activeEmojis as EmojiItem[]) || [];

		if (setsFromPage.length > 0) {
			activeEmojiSets = setsFromPage;
			userFavoriteEmojis = favsFromPage;
			allEmojis =
				allFromPage.length > 0
					? allFromPage
					: setsFromPage.flatMap((s) => (s.emojis as EmojiItem[]) || []);
			emojiStore.registerEmojis(allEmojis);
			return;
		}

		fetch('/api/emoji-sets/active')
			.then((res) => (res.ok ? res.json() : null))
			.then((data) => {
				if (data) {
					activeEmojiSets = data.activeSets || [];
					allEmojis = data.emojis || [];
					userFavoriteEmojis = data.favoriteEmojis || [];
					emojiStore.registerEmojis(allEmojis);
				}
			})
			.catch(() => {});
	}

	onMount(() => {
		loadEmojis();
	});

	function insertEmoji(emoji: EmojiItem) {
		richInputRef?.insertEmoji(emoji);
	}

	$effect(() => {
		setTimeout(() => {
			richInputRef?.focus();
		}, 60);
	});

	let activeFont = $derived(
		EDITOR_FONTS.find((f) => f.family === activeText.fontFamily) || EDITOR_FONTS[0]
	);

	let activeAlign = $derived(activeText.align || 'center');
	let isDarkText = $derived(activeText.color === '#000000' || activeText.color === '#1e293b');
	let caretColor = $derived(
		!activeText.hasBackground && isDarkText
			? '#38bdf8'
			: activeText.hasBackground && isDarkText
				? '#0f172a'
				: activeText.color || '#38bdf8'
	);

	function selectFont(font: EditorFont) {
		activeText.fontFamily = font.family;
		activeText.fontWeight = font.weight;
	}

	function selectColor(color: string) {
		activeText.color = color;
		if (activeText.hasBackground) {
			activeText.bgColor =
				color === '#000000' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.75)';
		}
	}

	// Suivi de la hauteur visible du viewport sur mobile pour caler l'overlay au-dessus du clavier
	let vvHeight = $state<number | null>(null);
	let vvTop = $state(0);

	$effect(() => {
		if (typeof window === 'undefined') return;
		const vv = window.visualViewport;
		if (!vv) return;

		const onResize = () => {
			vvHeight = vv.height;
			vvTop = vv.offsetTop;
			window.scrollTo(0, 0);
		};

		onResize();
		vv.addEventListener('resize', onResize);
		vv.addEventListener('scroll', onResize);

		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';

		return () => {
			vv.removeEventListener('resize', onResize);
			vv.removeEventListener('scroll', onResize);
			document.body.style.overflow = prevOverflow;
		};
	});
</script>

<div class="insta-text-overlay" style={vvHeight ? `height: ${vvHeight}px; top: ${vvTop}px;` : ''}>
	<!-- Header principal -->
	<header class="insta-header">
		<button type="button" class="btn-nav cancel" onclick={onCancel}> Annuler </button>
		<span class="header-title">Édition du texte</span>
		<button type="button" class="btn-nav done" onclick={onDone}> Terminé </button>
	</header>

	<!-- Barre d'outils tactile en haut -->
	<div class="insta-top-toolbar">
		<div class="toolbar-buttons-row">
			<TextStyleControls
				bind:activeText
				{activeFont}
				{showFontPicker}
				{showColorPicker}
				onToggleFontPicker={() => {
					showFontPicker = !showFontPicker;
					showColorPicker = false;
					showEmojiPicker = false;
				}}
				onToggleColorPicker={() => {
					showColorPicker = !showColorPicker;
					showFontPicker = false;
					showEmojiPicker = false;
				}}
				onSelectFont={selectFont}
				onSelectColor={selectColor}
			/>

			<!-- Bouton Émojis -->
			<button
				type="button"
				class="btn-picker"
				class:active={showEmojiPicker}
				onpointerdown={(e) => e.preventDefault()}
				onclick={() => {
					showEmojiPicker = !showEmojiPicker;
					showFontPicker = false;
					showColorPicker = false;
					if (showEmojiPicker && activeEmojiSets.length === 0) {
						loadEmojis();
					}
				}}
				title="Émojis"
			>
				<span class="btn-icon">
					<svg
						viewBox="0 0 24 24"
						width="16"
						height="16"
						stroke="currentColor"
						stroke-width="2"
						fill="none"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<circle cx="12" cy="12" r="10" />
						<path d="M8 14s1.5 2 4 2 4-2 4-2" />
						<line x1="9" y1="9" x2="9.01" y2="9" />
						<line x1="15" y1="9" x2="15.01" y2="9" />
					</svg>
				</span>
				<span class="btn-label">Émojis</span>
				<span class="caret">{showEmojiPicker ? '▴' : '▾'}</span>
			</button>

			{#if onDelete}
				<div class="spacer"></div>
				<!-- Bouton Supprimer -->
				<button
					type="button"
					class="btn-icon-only danger"
					onpointerdown={(e) => e.preventDefault()}
					onclick={onDelete}
					title="Supprimer ce texte"
				>
					<span><Icon name="action.delete" size={16} /></span>
				</button>
			{/if}
		</div>

		<!-- Déroulé des émojis directement sous les boutons du haut -->
		{#if showEmojiPicker}
			<div class="editor-emoji-panel">
				{#if userFavorites.length > 0}
					<div class="panel-section favorites-section">
						<span class="section-label">Vos favoris</span>
						<div class="favorites-row">
							{#each userFavorites as emoji (emoji.id || emoji.name)}
								<button
									type="button"
									class="emoji-btn favorite"
									title=":{emoji.name || emoji.id}:"
									onpointerdown={(e) => e.preventDefault()}
									onclick={() => {
										insertEmoji(emoji);
										showEmojiPicker = false;
									}}
								>
									<img src={emoji.url} alt=":{emoji.name || emoji.id}:" loading="lazy" />
								</button>
							{/each}
						</div>
					</div>
				{/if}

				{#if activeEmojiSets.length > 1}
					<div class="collections-tabs">
						<button
							type="button"
							class="tab-btn"
							class:active={selectedSetId === 'all'}
							onpointerdown={(e) => e.preventDefault()}
							onclick={() => (selectedSetId = 'all')}
						>
							Tous ({allEmojis.length})
						</button>
						{#each activeEmojiSets as set (set.id)}
							<button
								type="button"
								class="tab-btn"
								class:active={selectedSetId === set.id}
								onpointerdown={(e) => e.preventDefault()}
								onclick={() => (selectedSetId = set.id)}
							>
								{set.name}
							</button>
						{/each}
					</div>
				{/if}

				<div class="emojis-grid-container">
					{#if displayedEmojis.length === 0}
						<div class="empty-emojis-msg">Chargement ou aucun émoji actif...</div>
					{:else}
						<div class="emojis-grid">
							{#each displayedEmojis as emoji (emoji.id || emoji.name)}
								<button
									type="button"
									class="emoji-btn"
									title=":{emoji.name || emoji.id}:"
									onpointerdown={(e) => e.preventDefault()}
									onclick={() => {
										insertEmoji(emoji);
										showEmojiPicker = false;
									}}
								>
									<img src={emoji.url} alt=":{emoji.name || emoji.id}:" loading="lazy" />
								</button>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>

	<!-- Zone de frappe -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="typing-workspace"
		onclick={() => {
			showEmojiPicker = false;
			richInputRef?.focus();
		}}
	>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="available-box"
			class:has-bg={activeText.hasBackground}
			onclick={(e) => {
				e.stopPropagation();
				showEmojiPicker = false;
				richInputRef?.focus();
			}}
			style="
                width: {boxWidth}px;
                max-width: 92vw;
                font-size: {boxFontSize}px;
                font-family: {activeText.fontFamily};
                font-weight: {activeText.fontWeight};
                color: {activeText.color};
                text-align: {activeAlign};
                background: {activeText.hasBackground ? activeText.bgColor : 'transparent'};
                --caret-color: {caretColor};
                {(!activeText.hasBackground && isDarkText) ? 'text-shadow: 0 0 2px #ffffff, 0 0 8px rgba(255, 255, 255, 0.85);' : ''}
            "
		>
			<RichTextInput
				bind:this={richInputRef}
				bind:value={activeText.text}
				align={activeAlign}
				placeholder="Tapez votre texte..."
				class="editor-rich-input"
			/>
		</div>
	</div>
</div>

<style>
	.insta-text-overlay {
		position: fixed;
		inset: 0;
		top: 0;
		left: 0;
		right: 0;
		width: 100vw;
		height: 100dvh;
		background: rgba(0, 0, 0, 0.85);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		z-index: 99999;
		display: flex;
		flex-direction: column;
		touch-action: none;
		overflow: hidden;
		overscroll-behavior: none;
		animation: fadeIn 0.15s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.insta-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 16px;
		flex-shrink: 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
	}

	.header-title {
		font-size: 0.95rem;
		font-weight: 600;
		color: #fff;
	}

	.btn-nav {
		background: none;
		border: none;
		font-size: 0.95rem;
		cursor: pointer;
		padding: 6px 12px;
		border-radius: 8px;
		transition: opacity 0.15s;
	}
	.btn-nav.cancel {
		color: #fff;
	}
	.btn-nav.done {
		background: #0095f6;
		color: #fff;
		font-weight: 600;
		border-radius: 18px;
		padding: 6px 16px;
	}
	.btn-nav:hover {
		opacity: 0.85;
	}

	/* Barre d'outils sous le header */
	.insta-top-toolbar {
		background: #141414;
		border-bottom: 1px solid rgba(255, 255, 255, 0.12);
		padding: 8px 12px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		flex-shrink: 0;
	}

	.toolbar-buttons-row {
		display: flex;
		align-items: center;
		gap: 6px;
		width: 100%;
		overflow-x: auto;
		scrollbar-width: none;
	}
	.toolbar-buttons-row::-webkit-scrollbar {
		display: none;
	}

	.btn-picker {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		background: #252525;
		border: 1px solid #444;
		color: #fff;
		padding: 6px 10px;
		border-radius: 16px;
		font-size: 0.82rem;
		font-weight: 500;
		cursor: pointer;
		height: 36px;
		flex-shrink: 0;
		transition: all 0.15s ease;
	}
	.btn-picker:hover,
	.btn-picker.active {
		background: #333;
		border-color: #0095f6;
	}

	.btn-label {
		font-size: 0.82rem;
	}

	.btn-icon {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.caret {
		font-size: 0.7rem;
		color: #aaa;
	}

	.btn-icon-only {
		width: 36px;
		height: 36px;
		border-radius: 10px;
		background: #252525;
		border: 1px solid #444;
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		font-size: 1rem;
		flex-shrink: 0;
		transition: all 0.15s ease;
	}
	.btn-icon-only.danger {
		color: #ef4444;
	}
	.btn-icon-only.danger:hover {
		background: rgba(239, 68, 68, 0.15);
		border-color: #ef4444;
	}

	.spacer {
		flex: 1;
		min-width: 4px;
	}

	.typing-workspace {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px;
		cursor: text;
		min-height: 120px;
	}

	.available-box {
		padding: 12px 18px;
		border-radius: 12px;
		border: 1px dashed rgba(255, 255, 255, 0.3);
		transition: border-color 0.15s;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.available-box.has-bg {
		border: none;
	}

	.editor-emoji-panel {
		background: #1c1c1e;
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 14px;
		padding: 10px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		max-height: 220px;
		overflow-y: auto;
	}

	.panel-section {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.section-label {
		font-size: 0.75rem;
		color: #8e8e93;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.favorites-row {
		display: flex;
		gap: 8px;
		overflow-x: auto;
		padding-bottom: 4px;
	}

	.emoji-btn {
		background: none;
		border: none;
		cursor: pointer;
		padding: 4px;
		border-radius: 8px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		transition: transform 0.1s;
		flex-shrink: 0;
	}

	.emoji-btn:hover {
		transform: scale(1.15);
		background: rgba(255, 255, 255, 0.1);
	}

	.emoji-btn img {
		width: 32px;
		height: 32px;
		object-fit: contain;
	}

	.collections-tabs {
		display: flex;
		gap: 6px;
		overflow-x: auto;
		padding: 4px 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.tab-btn {
		background: rgba(255, 255, 255, 0.08);
		border: none;
		color: #aeaeb2;
		padding: 4px 10px;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		white-space: nowrap;
	}

	.tab-btn.active {
		background: #0095f6;
		color: #fff;
	}

	.emojis-grid-container {
		max-height: 140px;
		overflow-y: auto;
	}

	.emojis-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(36px, 1fr));
		gap: 6px;
	}

	.empty-emojis-msg {
		padding: 16px;
		text-align: center;
		color: #8e8e93;
		font-size: 0.8rem;
	}
</style>
