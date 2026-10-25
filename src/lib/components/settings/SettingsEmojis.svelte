<!--
  @component SettingsEmojis
  @domain settings/emojis
  @description Panneau de gestion des collections d'émojis personnalisés et des favoris de l'utilisateur.
  @responsibilities
    - Afficher les collections actives
    - Piloter la gestion des 6 émojis favoris rapides
    - Piloter la création et l'édition de collections d'émojis
    - Présenter la bibliothèque (créations personnelles et collections sauvegardées)
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import SettingsCard from '$lib/components/settings/ui/SettingsCard.svelte';
	import type { EmojiItem, EmojiSet } from '$lib/types';
	import { emojiStore } from '$lib/client/emojiStore.svelte';
	import AssetLibraryTabs from './assets/AssetLibraryTabs.svelte';
	import AssetPackCard from './assets/AssetPackCard.svelte';
	import EmojiFavoritesCard from './emojis/EmojiFavoritesCard.svelte';
	import EmojiSetEditorModal from './emojis/EmojiSetEditorModal.svelte';

	let instanceDefaultSets = $state<EmojiSet[]>([]);
	let disabledEmojiSetIds = $state<string[]>([]);
	let ownedSets = $state<EmojiSet[]>([]);
	let savedSets = $state<EmojiSet[]>([]);
	let activeServerSetIds = $state<string[]>([]);
	let userFavoriteEmojiIds = $state<string[]>([]);
	let activeEmojisList = $state<EmojiItem[]>([]);
	let isLoadingLibrary = $state(true);

	// Onglet actif dans la bibliothèque
	let libraryTab = $state<'owned' | 'saved'>('owned');

	// Set en cours d'édition
	let editingSet = $state<EmojiSet | null>(null);

	const allLibraryEmojis = $derived.by<EmojiItem[]>(() => {
		const map = new SvelteMap<string, EmojiItem>();
		for (const set of instanceDefaultSets) {
			for (const em of (set.emojis as EmojiItem[]) || []) {
				if (!map.has(em.id)) map.set(em.id, em);
			}
		}
		for (const set of ownedSets) {
			for (const em of (set.emojis as EmojiItem[]) || []) {
				if (!map.has(em.id)) map.set(em.id, em);
			}
		}
		for (const set of savedSets) {
			for (const em of (set.emojis as EmojiItem[]) || []) {
				if (!map.has(em.id)) map.set(em.id, em);
			}
		}
		for (const em of activeEmojisList) {
			if (!map.has(em.id)) map.set(em.id, em);
		}
		return Array.from(map.values());
	});

	const pickerCollections = $derived.by(() => {
		const result: {
			id: string;
			name: string;
			isOwned: boolean;
			emojis: EmojiItem[];
		}[] = [];

		for (const s of instanceDefaultSets) {
			const ems = (s.emojis as EmojiItem[]) || [];
			if (ems.length > 0) {
				result.push({ id: s.id, name: `${s.name} (Instance)`, isOwned: false, emojis: ems });
			}
		}
		for (const s of ownedSets) {
			const ems = (s.emojis as EmojiItem[]) || [];
			if (ems.length > 0) {
				result.push({ id: s.id, name: s.name, isOwned: true, emojis: ems });
			}
		}
		for (const s of savedSets) {
			const ems = (s.emojis as EmojiItem[]) || [];
			if (ems.length > 0) {
				result.push({ id: s.id, name: s.name, isOwned: false, emojis: ems });
			}
		}
		return result;
	});

	async function loadLibrary() {
		isLoadingLibrary = true;
		try {
			const res = await fetch('/api/emoji-sets');
			if (res.ok) {
				const data = await res.json();
				instanceDefaultSets = data.instanceDefaultSets || [];
				disabledEmojiSetIds = data.disabledEmojiSetIds || [];
				ownedSets = data.owned || data.ownedSets || [];
				savedSets = data.saved || data.savedSets || [];
				activeServerSetIds = data.activeEmojiSetIds || [];
				userFavoriteEmojiIds = data.favoriteEmojiIds || [];
				activeEmojisList = data.activeEmojis || [];
			}
		} catch (err) {
			console.error('Erreur chargement bibliothèque emojis:', err);
		} finally {
			isLoadingLibrary = false;
		}
	}

	onMount(() => {
		loadLibrary();
	});

	async function handleSaveSet(payload: {
		id?: string;
		name: string;
		description?: string;
		emojis: EmojiItem[];
	}) {
		const body = {
			name: payload.name,
			description: payload.description,
			emojis: payload.emojis
		};

		let res: Response;
		if (payload.id) {
			res = await fetch(`/api/emoji-sets/${payload.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
		} else {
			res = await fetch('/api/emoji-sets', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
		}

		const data = await res.json();
		if (!res.ok) {
			throw new Error(data.error || 'Erreur lors de la sauvegarde');
		}

		editingSet = null;
		libraryTab = 'owned';
		await loadLibrary();
		emojiStore.loadActiveEmojis();
	}

	async function handleToggleActivateSet(set: EmojiSet) {
		const isCurrentlyActive = activeServerSetIds.includes(set.id);
		try {
			const res = await fetch(`/api/emoji-sets/${set.id}/activate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ activate: !isCurrentlyActive })
			});
			if (res.ok) {
				const data = await res.json();
				activeServerSetIds = data.activeEmojiSetIds || [];
				await loadLibrary();
				emojiStore.loadActiveEmojis();
			}
		} catch (err) {
			console.error('Erreur toggle activation collection emojis', err);
		}
	}

	async function handleDeleteSet(set: EmojiSet) {
		if (!confirm(`Supprimer la collection "${set.name}" ?`)) return;

		try {
			const res = await fetch(`/api/emoji-sets/${set.id}`, { method: 'DELETE' });
			if (res.ok) {
				activeServerSetIds = activeServerSetIds.filter((id) => id !== set.id);
				if (editingSet?.id === set.id) {
					editingSet = null;
				}
				await loadLibrary();
				emojiStore.loadActiveEmojis();
			}
		} catch (err) {
			console.error('Erreur suppression set emojis', err);
		}
	}

	async function handleRemoveSaved(set: EmojiSet) {
		try {
			const res = await fetch(`/api/emoji-sets/${set.id}/toggle-save`, { method: 'POST' });
			if (res.ok) {
				activeServerSetIds = activeServerSetIds.filter((id) => id !== set.id);
				await loadLibrary();
				emojiStore.loadActiveEmojis();
			}
		} catch (err) {
			console.error('Erreur retrait set sauvegardé', err);
		}
	}

	async function handleToggleInstanceDefaultActive(set: EmojiSet) {
		try {
			const res = await fetch(`/api/emoji-sets/${set.id}/toggle-default-active`, {
				method: 'POST'
			});
			if (res.ok) {
				const data = await res.json();
				disabledEmojiSetIds = data.disabledEmojiSetIds || [];
				await loadLibrary();
				emojiStore.loadActiveEmojis();
			}
		} catch (err) {
			console.error('Erreur toggle instance default emoji set', err);
		}
	}

	async function handleFavoriteSelected(targetId: string | null, newEmojiId: string) {
		try {
			const payload: { emojiId: string; replaceEmojiId?: string } = {
				emojiId: newEmojiId
			};
			if (targetId) {
				payload.replaceEmojiId = targetId;
			}
			const res = await fetch('/api/emojis/favorite', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (res.ok) {
				const data = await res.json();
				userFavoriteEmojiIds = data.favoriteEmojiIds || [];
				await loadLibrary();
				emojiStore.loadActiveEmojis();
			} else {
				const d = await res.json().catch(() => ({}));
				alert(d.error || 'Erreur lors de la sélection du favori.');
			}
		} catch (err) {
			console.error('Erreur sélection favori:', err);
		}
	}

	async function handleFavoriteRemoved(emojiId: string) {
		try {
			const res = await fetch('/api/emojis/favorite', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ emojiId, action: 'remove' })
			});
			if (res.ok) {
				const data = await res.json();
				userFavoriteEmojiIds = data.favoriteEmojiIds || [];
				await loadLibrary();
				emojiStore.loadActiveEmojis();
			} else {
				const d = await res.json().catch(() => ({}));
				alert(d.error || 'Erreur lors de la suppression du favori.');
			}
		} catch (err) {
			console.error('Erreur suppression favori:', err);
		}
	}
</script>

<div class="settings-emojis-container">
	<!-- Bannière active -->
	{#if activeServerSetIds.length > 0}
		<div class="active-pack-banner">
			<div class="banner-info">
				<span class="banner-badge">Collections d'emojis actives ({activeServerSetIds.length})</span>
				<strong>
					{[...ownedSets, ...savedSets]
						.filter((s) => activeServerSetIds.includes(s.id))
						.map((s) => s.name)
						.join(', ') || 'Collections sélectionnées'}
				</strong>
			</div>
		</div>
	{/if}

	<!-- Mes 6 favoris personnels -->
	<EmojiFavoritesCard
		{userFavoriteEmojiIds}
		{allLibraryEmojis}
		{pickerCollections}
		onFavoriteSelected={handleFavoriteSelected}
		onFavoriteRemoved={handleFavoriteRemoved}
	/>

	<!-- Éditeur de Collection -->
	<EmojiSetEditorModal {editingSet} onSave={handleSaveSet} onCancel={() => (editingSet = null)} />

	<!-- Collections de l'Instance (par défaut) -->
	{#if instanceDefaultSets.length > 0}
		<SettingsCard title="Collections d'emojis de l'instance">
			<p class="instance-desc">
				Ces collections sont activées par défaut pour toute l'instance. Vous pouvez décocher celles
				que vous ne souhaitez pas utiliser dans vos messages et commentaires.
			</p>

			<div class="instance-sets-list">
				{#each instanceDefaultSets as set (set.id)}
					{@const emList = (set.emojis as EmojiItem[]) || []}
					{@const isEnabled = !disabledEmojiSetIds.includes(set.id)}
					<div class="instance-set-card" class:is-enabled={isEnabled}>
						<div class="instance-set-header">
							<label class="instance-toggle-label">
								<input
									type="checkbox"
									checked={isEnabled}
									onchange={() => handleToggleInstanceDefaultActive(set)}
								/>
								<div class="instance-set-titles">
									<div class="title-with-badge">
										<strong class="set-title">{set.name}</strong>
										<span class="instance-badge">⭐ Instance</span>
									</div>
									<span class="set-owner">par @{set.owner?.username || 'anonyme'}</span>
								</div>
							</label>
							<span class="instance-status-indicator" class:active={isEnabled}>
								{isEnabled ? 'Activée' : 'Désactivée'}
							</span>
						</div>

						{#if set.description}
							<p class="set-description-text">{set.description}</p>
						{/if}

						<div class="set-mini-preview">
							{#each emList.slice(0, 10) as em (em.id || em.name || em.url)}
								<img src={em.url} alt={em.name} class="mini-emoji-img" title=":{em.name}:" />
							{/each}
							{#if emList.length > 10}
								<span class="more-indicator">+{emList.length - 10}</span>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</SettingsCard>
	{/if}

	<!-- Bibliothèque de collections -->
	<SettingsCard title="Bibliothèque de collections d'emojis">
		{#if isLoadingLibrary}
			<p class="loading-hint">Chargement de votre bibliothèque...</p>
		{:else}
			<AssetLibraryTabs
				activeTab={libraryTab}
				ownedCount={ownedSets.length}
				savedCount={savedSets.length}
				itemLabel="Collections"
				onTabChange={(tab) => (libraryTab = tab)}
			/>

			{#if libraryTab === 'owned'}
				{#if ownedSets.length === 0}
					<p class="empty-hint">Vous n'avez pas encore créé de collection d'emojis.</p>
				{:else}
					<div class="sets-list">
						{#each ownedSets as set (set.id)}
							{@const emList = (set.emojis as EmojiItem[]) || []}
							<AssetPackCard
								id={set.id}
								name={set.name}
								description={set.description}
								itemCount={emList.length}
								itemLabel="émoji"
								previews={emList.map((e) => e.url)}
								isActive={activeServerSetIds.includes(set.id)}
								isEditing={editingSet?.id === set.id}
								isPublished={set.isPublished}
								isOwned={true}
								onActivate={() => handleToggleActivateSet(set)}
								onDeactivate={() => handleToggleActivateSet(set)}
								onEdit={() => (editingSet = set)}
								onPublish={() => goto(resolve(`/publier?emojiSetId=${set.id}`))}
								onDelete={() => handleDeleteSet(set)}
							/>
						{/each}
					</div>
				{/if}
			{:else if savedSets.length === 0}
				<p class="empty-hint">
					Aucune collection d'autres utilisateurs sauvegardée dans votre bibliothèque.
				</p>
			{:else}
				<div class="sets-list">
					{#each savedSets as set (set.id)}
						{@const emList = (set.emojis as EmojiItem[]) || []}
						<AssetPackCard
							id={set.id}
							name={set.name}
							description={set.description}
							itemCount={emList.length}
							itemLabel="émoji"
							previews={emList.map((e) => e.url)}
							isActive={activeServerSetIds.includes(set.id)}
							isOwned={false}
							onActivate={() => handleToggleActivateSet(set)}
							onDeactivate={() => handleToggleActivateSet(set)}
							onPublish={!set.isDeletedByOwner
								? () => goto(resolve(`/publier?emojiSetId=${set.id}`))
								: undefined}
							onRemoveSaved={() => handleRemoveSaved(set)}
						/>
					{/each}
				</div>
			{/if}
		{/if}
	</SettingsCard>
</div>

<style>
	.settings-emojis-container {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.active-pack-banner {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 16px;
		background: #f0fdf4;
		border: 1px solid #bbf7d0;
		border-radius: 12px;
		gap: 12px;
	}

	.banner-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.banner-badge {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-weight: 700;
		color: #16a34a;
	}

	.instance-desc {
		margin: 0 0 16px 0;
		font-size: 0.88rem;
		color: #475569;
		line-height: 1.4;
	}

	.instance-sets-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.instance-set-card {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		padding: 14px 16px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		transition: all 0.2s ease;
	}

	.instance-set-card.is-enabled {
		background: #ffffff;
		border-color: #cbd5e1;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
	}

	.instance-set-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.instance-toggle-label {
		display: flex;
		align-items: center;
		gap: 12px;
		cursor: pointer;
	}

	.instance-set-titles {
		display: flex;
		flex-direction: column;
	}

	.title-with-badge {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.set-title {
		font-size: 0.95rem;
		font-weight: 700;
		color: #1e293b;
	}

	.instance-badge {
		font-size: 0.7rem;
		font-weight: 700;
		background: #fef08a;
		color: #854d0e;
		padding: 2px 6px;
		border-radius: 6px;
	}

	.set-owner {
		font-size: 0.75rem;
		color: #64748b;
	}

	.instance-status-indicator {
		font-size: 0.75rem;
		font-weight: 700;
		color: #94a3b8;
		padding: 4px 8px;
		border-radius: 6px;
		background: #f1f5f9;
	}

	.instance-status-indicator.active {
		color: #16a34a;
		background: #dcfce7;
	}

	.set-description-text {
		margin: 0;
		font-size: 0.85rem;
		color: #64748b;
	}

	.set-mini-preview {
		display: flex;
		gap: 8px;
		align-items: center;
		overflow-x: auto;
		padding: 4px 0;
	}

	.mini-emoji-img {
		width: 28px;
		height: 28px;
		object-fit: contain;
	}

	.more-indicator {
		font-size: 0.75rem;
		font-weight: 600;
		color: #64748b;
		background: #f1f5f9;
		padding: 4px 8px;
		border-radius: 10px;
	}

	.loading-hint {
		font-size: 0.88rem;
		color: #64748b;
	}

	.empty-hint {
		font-size: 0.88rem;
		color: #94a3b8;
		font-style: italic;
		padding: 12px 0;
	}

	.sets-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
</style>
