<!--
  @component AssetPostCard
  @domain post
  @description Carte interactive de publication partageant un pack d'icônes ou une collection d'émojis.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { iconTheme } from '$lib/client/iconTheme.svelte';
	import { emojiStore } from '$lib/client/emojiStore.svelte';
	import type { EmojiItem, EmojiSet, IconSet } from '$lib/types';

	let {
		type,
		asset,
		authorUsername,
		postAuthorId
	}: {
		type: 'icon_set' | 'emoji_set';
		asset: (IconSet | EmojiSet) & {
			isSaved?: boolean;
			isActive?: boolean;
			isDeletedByOwner?: boolean;
			icons?: Record<string, string>;
			emojis?: EmojiItem[];
		};
		authorUsername?: string;
		postAuthorId?: string;
	} = $props();

	let isSaving = $state(false);
	let isActivating = $state(false);
	let savedOverride = $state<boolean | null>(null);
	let activeOverride = $state<boolean | null>(null);

	let isSaved = $derived(savedOverride ?? Boolean(asset.isSaved));

	// Réactivité en temps réel pour le set d'icônes actif
	let isRealtimeActiveIcon = $derived(type === 'icon_set' && iconTheme.activeIconSetId === asset.id);
	let isActive = $derived(
		activeOverride ?? (type === 'icon_set' ? isRealtimeActiveIcon : Boolean(asset.isActive))
	);

	let currentUserId = $derived(page.data.sessionUser?.id);
	let isOwn = $derived(
		Boolean(
			currentUserId &&
				(asset.ownerId === currentUserId || postAuthorId === currentUserId) &&
				!asset.isDeletedByOwner
		)
	);

	let creatorUsername = $derived(asset.owner?.username || authorUsername || '');

	// Détermine la liste d'aperçus à afficher
	let previewItems = $derived.by<{ key: string; url: string; title: string }[]>(() => {
		if (type === 'icon_set') {
			const entries = Object.entries(asset.icons || {});
			return entries.slice(0, 16).map(([k, u]) => ({ key: k, url: u, title: k }));
		} else {
			const list = asset.emojis || [];
			return list.slice(0, 16).map((e) => ({
				key: e.id || e.name || e.url,
				url: e.url,
				title: `:${e.name}:`
			}));
		}
	});

	async function handleToggleSave() {
		if (!asset.id) return;
		if (!page.data.sessionUser) {
			goto(resolve('/login'));
			return;
		}
		isSaving = true;
		const endpoint =
			type === 'icon_set'
				? `/api/icon-sets/${asset.id}/toggle-save`
				: `/api/emoji-sets/${asset.id}/toggle-save`;

		try {
			const res = await fetch(endpoint, { method: 'POST' });
			if (res.ok) {
				const data = await res.json();
				const saved = Boolean(data.saved);
				savedOverride = saved;
				asset.isSaved = saved;

				if (saved && data.isActive) {
					activeOverride = true;
					asset.isActive = true;
					if (type === 'icon_set') {
						iconTheme.applyServerIconSet(asset as unknown as IconSet);
					} else {
						emojiStore.loadActiveEmojis();
					}
				} else if (!saved) {
					activeOverride = false;
					asset.isActive = false;
					if (type === 'icon_set' && iconTheme.activeIconSetId === asset.id) {
						iconTheme.revertToDefault();
					} else if (type === 'emoji_set') {
						emojiStore.loadActiveEmojis();
					}
				}
			} else {
				const data = await res.json().catch(() => ({}));
				alert(data.error || "Erreur lors de l'enregistrement.");
			}
		} catch (err) {
			console.error('Erreur sauvegarde asset:', err);
			alert("Erreur réseau lors de l'enregistrement.");
		} finally {
			isSaving = false;
		}
	}

	async function handleToggleActivate() {
		if (!asset.id) return;
		if (!page.data.sessionUser) {
			goto(resolve('/login'));
			return;
		}
		isActivating = true;
		const willActivate = !isActive;
		const endpoint =
			type === 'icon_set'
				? `/api/icon-sets/${asset.id}/activate`
				: `/api/emoji-sets/${asset.id}/activate`;

		try {
			const res = await fetch(endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ activate: willActivate })
			});
			if (res.ok) {
				activeOverride = willActivate;
				asset.isActive = willActivate;

				if (type === 'icon_set') {
					if (willActivate) {
						iconTheme.applyServerIconSet(asset as unknown as IconSet);
					} else {
						iconTheme.revertToDefault();
					}
				} else {
					emojiStore.loadActiveEmojis();
				}
			} else {
				const data = await res.json().catch(() => ({}));
				alert(data.error || "Erreur lors de l'activation.");
			}
		} catch (err) {
			console.error('Erreur activation asset:', err);
			alert("Erreur réseau lors de l'activation.");
		} finally {
			isActivating = false;
		}
	}
</script>

<div class="asset-post-card">
	<div class="asset-post-header">
		<div class="asset-badge-row">
			<span class="asset-type-badge {type}">
				<Icon name={type === 'icon_set' ? 'status.palette' : 'status.tag'} size={15} />
				<span>{type === 'icon_set' ? "Pack d'icônes" : "Pack d'emojis"}</span>
			</span>
			{#if creatorUsername}
				<a
					href={resolve(`/profil/${encodeURIComponent(creatorUsername)}`)}
					class="asset-post-creator"
				>
					par @{creatorUsername}
				</a>
			{/if}
		</div>

		<div class="asset-post-title-row">
			<h4 class="asset-post-title">{asset.name}</h4>
		</div>

		{#if asset.description}
			<p class="asset-post-desc">{asset.description}</p>
		{/if}
	</div>

	<div class="asset-preview-grid">
		{#each previewItems as item (item.key)}
			<div class="asset-preview-item" title={item.title}>
				<img src={item.url} alt={item.title} class="asset-preview-img" />
			</div>
		{/each}
	</div>

	<div class="asset-post-actions">
		{#if asset.isDeletedByOwner && !isSaved}
			<span class="btn-asset-deleted">Collection supprimée par l'auteur</span>
		{:else}
			{#if !isOwn}
				<button
					type="button"
					class="btn-asset-save"
					class:saved={isSaved}
					disabled={isSaving}
					onclick={handleToggleSave}
				>
					{#if isSaved}
						Dans la bibliothèque
					{:else}
						Ajouter à la bibliothèque
					{/if}
				</button>
			{/if}

			{#if isActive}
				<button
					type="button"
					class="btn-asset-deactivate"
					disabled={isActivating}
					onclick={handleToggleActivate}
				>
					Désactiver
				</button>
			{:else}
				<button
					type="button"
					class="btn-asset-activate"
					disabled={isActivating}
					onclick={handleToggleActivate}
				>
					Activer
				</button>
			{/if}
		{/if}
	</div>
</div>

<style>
	.asset-post-card {
		margin: 0 16px 12px;
		padding: 16px;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.asset-post-header {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.asset-badge-row {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 8px;
	}

	.asset-type-badge {
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

	.asset-type-badge.icon_set {
		background: #e0e7ff;
		color: #4338ca;
		border: 1px solid #c7d2fe;
	}

	.asset-type-badge.emoji_set {
		background: #fef3c7;
		color: #b45309;
		border: 1px solid #fde68a;
	}

	.asset-post-creator {
		font-size: 0.78rem;
		font-weight: 600;
		color: #0284c7;
		background: #e0f2fe;
		padding: 2px 8px;
		border-radius: 999px;
		text-decoration: none;
		transition: background 0.15s ease;
	}

	.asset-post-creator:hover {
		background: #bae6fd;
	}

	.asset-post-title-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.asset-post-title {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 700;
		color: #0f172a;
	}

	.asset-post-desc {
		margin: 0;
		font-size: 0.85rem;
		color: #64748b;
	}

	.asset-preview-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		padding: 4px 0;
	}

	.asset-preview-item {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.asset-preview-img {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.asset-post-actions {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
		margin-top: 4px;
	}

	.btn-asset-activate {
		padding: 8px 14px;
		background: #0ea5e9;
		color: #ffffff;
		border: none;
		border-radius: 8px;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s;
	}

	.btn-asset-activate:hover:not(:disabled) {
		background: #0284c7;
	}

	.btn-asset-deactivate {
		padding: 8px 14px;
		background: #fee2e2;
		color: #dc2626;
		border: 1px solid #fca5a5;
		border-radius: 8px;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s;
	}

	.btn-asset-deactivate:hover:not(:disabled) {
		background: #fecaca;
	}

	.btn-asset-deleted {
		padding: 8px 14px;
		background: #f1f5f9;
		color: #94a3b8;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: not-allowed;
	}

	.btn-asset-save {
		padding: 8px 14px;
		background: #ffffff;
		color: #475569;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s;
	}

	.btn-asset-save:hover:not(:disabled) {
		background: #f8fafc;
		border-color: #94a3b8;
		color: #1e293b;
	}

	.btn-asset-save.saved {
		background: #f0fdf4;
		color: #166534;
		border-color: #bbf7d0;
	}

	.btn-asset-save.saved:hover:not(:disabled) {
		background: #dcfce7;
	}
</style>
