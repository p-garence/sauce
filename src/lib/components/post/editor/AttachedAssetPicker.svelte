<script lang="ts">
	/**
	 * @component AttachedAssetPicker
	 * @domain post
	 * @description Sélecteur et affichage d'un pack d'icônes ou d'émojis joint à une publication.
	 *
	 * @responsibilities
	 * - Afficher la vignette du pack attaché (icônes ou émojis) avec bouton de retrait.
	 * - Proposer un bouton d'ouverture vers la modale de sélection `AssetPackPickerModal`.
	 * - Lier bidirectionnellement l'asset sélectionné vers le formulaire parent.
	 */

	import Icon from '$lib/components/ui/Icon.svelte';
	import AssetPackPickerModal from '$lib/components/post/editor/AssetPackPickerModal.svelte';
	import type { EmojiItem, EmojiSet, IconSet } from '$lib/types';

	interface Props {
		/** Pack d'icônes actuellement joint (bindable) */
		attachedIconSet?: IconSet | null;
		/** Pack d'émojis actuellement joint (bindable) */
		attachedEmojiSet?: EmojiSet | null;
		/** Packs d'icônes possédés par l'utilisateur */
		userOwnedIconSets?: IconSet[];
		/** Packs d'émojis possédés par l'utilisateur */
		userOwnedEmojiSets?: EmojiSet[];
	}

	let {
		attachedIconSet = $bindable<IconSet | null>(null),
		attachedEmojiSet = $bindable<EmojiSet | null>(null),
		userOwnedIconSets = [],
		userOwnedEmojiSets = []
	}: Props = $props();

	let isModalOpen = $state(false);

	function selectIconSet(set: IconSet) {
		attachedIconSet = set;
		attachedEmojiSet = null;
		isModalOpen = false;
	}

	function selectEmojiSet(set: EmojiSet) {
		attachedEmojiSet = set;
		attachedIconSet = null;
		isModalOpen = false;
	}

	function removeAttachedAsset() {
		attachedIconSet = null;
		attachedEmojiSet = null;
	}

	let attachedPreviewItems = $derived.by<{ key: string; url: string; title: string }[]>(() => {
		if (attachedIconSet) {
			const entries = Object.entries(attachedIconSet.icons || {});
			return entries.slice(0, 10).map(([k, u]) => ({ key: k, url: u, title: k }));
		}
		if (attachedEmojiSet) {
			const list = (attachedEmojiSet.emojis as EmojiItem[]) || [];
			return list.slice(0, 10).map((e) => ({
				key: e.id || e.name || e.url,
				url: e.url,
				title: `:${e.name}:`
			}));
		}
		return [];
	});
</script>

<div class="attached-asset-picker-container">
	{#if attachedIconSet || attachedEmojiSet}
		<div
			class="attached-card"
			class:icon-theme={Boolean(attachedIconSet)}
			class:emoji-theme={Boolean(attachedEmojiSet)}
		>
			<div class="attached-header">
				<div class="attached-badge">
					<Icon name={attachedIconSet ? 'status.palette' : 'status.tag'} size={15} />
					<span>{attachedIconSet ? "Pack d'icônes joint" : "Pack d'emojis joint"}</span>
				</div>
				<button
					type="button"
					class="btn-detach"
					onclick={removeAttachedAsset}
					title="Retirer ce pack de la publication"
				>
					<Icon name="action.close" size={14} />
					<span>Retirer</span>
				</button>
			</div>

			<div class="attached-body">
				<strong class="attached-name">
					{attachedIconSet?.name || attachedEmojiSet?.name}
				</strong>
				{#if attachedIconSet?.description || attachedEmojiSet?.description}
					<p class="attached-desc">
						{attachedIconSet?.description || attachedEmojiSet?.description}
					</p>
				{/if}

				{#if attachedPreviewItems.length > 0}
					<div class="attached-preview-grid">
						{#each attachedPreviewItems as item (item.key)}
							<div class="attached-preview-thumb" title={item.title}>
								<img src={item.url} alt={item.title} />
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{:else}
		<div class="attach-bar">
			<button
				type="button"
				class="btn-open-attach-modal"
				onclick={() => {
					isModalOpen = true;
				}}
			>
				<span class="attach-icons-pair">
					<Icon name="status.palette" size={16} />
					<Icon name="status.tag" size={16} />
				</span>
				<span>Joindre un pack d'icônes ou d'emojis</span>
			</button>
		</div>
	{/if}
</div>

<AssetPackPickerModal
	isOpen={isModalOpen}
	{userOwnedIconSets}
	{userOwnedEmojiSets}
	onSelectIconSet={selectIconSet}
	onSelectEmojiSet={selectEmojiSet}
	onClose={() => (isModalOpen = false)}
/>

<style>
	.attached-asset-picker-container {
		padding: 12px 16px;
	}

	.attach-bar {
		display: flex;
		align-items: center;
	}

	.btn-open-attach-modal {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		background: #f8fafc;
		border: 1px dashed #cbd5e1;
		color: #475569;
		padding: 10px 14px;
		border-radius: 10px;
		font-size: 0.88rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s ease;
		width: 100%;
		justify-content: center;
	}

	.btn-open-attach-modal:hover {
		background: #f1f5f9;
		border-color: #94a3b8;
		color: #0f172a;
	}

	.attach-icons-pair {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		color: #0284c7;
	}

	.attached-card {
		padding: 14px;
		border-radius: 12px;
		border: 1px solid #e2e8f0;
		background: #ffffff;
		display: flex;
		flex-direction: column;
		gap: 8px;
		position: relative;
	}

	.attached-card.icon-theme {
		background: #faf5ff;
		border-color: #e9d5ff;
	}

	.attached-card.emoji-theme {
		background: #fffbeb;
		border-color: #fde68a;
	}

	.attached-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.attached-badge {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 0.76rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		padding: 3px 8px;
		border-radius: 6px;
	}

	.attached-card.icon-theme .attached-badge {
		background: #f3e8ff;
		color: #7e22ce;
	}

	.attached-card.emoji-theme .attached-badge {
		background: #fef3c7;
		color: #b45309;
	}

	.btn-detach {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		background: #ffffff;
		border: 1px solid #cbd5e1;
		color: #dc2626;
		font-size: 0.78rem;
		font-weight: 600;
		padding: 3px 8px;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-detach:hover {
		background: #fee2e2;
		border-color: #fca5a5;
	}

	.attached-body {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.attached-name {
		font-size: 1rem;
		font-weight: 700;
		color: #0f172a;
	}

	.attached-desc {
		margin: 0;
		font-size: 0.82rem;
		color: #64748b;
	}

	.attached-preview-grid {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
		margin-top: 4px;
	}

	.attached-preview-thumb {
		width: 32px;
		height: 32px;
		border-radius: 6px;
		background: #ffffff;
		border: 1px solid #e2e8f0;
		padding: 3px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.attached-preview-thumb img {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}
</style>
