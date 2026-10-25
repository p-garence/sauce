<!--
  @component SettingsIcons
  @domain settings/icons
  @description Panneau de gestion des thèmes d'icônes du système et des packs personnalisés.
  @responsibilities
    - Sélectionner le pack actif (vectoriel Lucide, emojis originaux, packs commu, thème personnalisé)
    - Configurer le repli (fallback)
    - Éditer et composer un pack d'icônes personnalisé (mosaïque, téléversement de SVG/images)
    - Présenter la bibliothèque des packs créés et sauvegardés
-->
<script lang="ts">
	import { onMount, tick, untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import SettingsCard from '$lib/components/settings/ui/SettingsCard.svelte';
	import { iconTheme } from '$lib/client/iconTheme.svelte';
	import { page } from '$app/state';
	import type { IconId } from '$lib/icons/types';
	import type { IconSet } from '$lib/types';
	import AssetLibraryTabs from './assets/AssetLibraryTabs.svelte';
	import AssetPackCard from './assets/AssetPackCard.svelte';
	import IconItemEditModal from './icons/IconItemEditModal.svelte';
	import IconSetEditorModal from './icons/IconSetEditorModal.svelte';

	let instanceSettings = $derived(page.data.instanceSettings);
	let allowedBuiltinPacks = $derived(
		(instanceSettings?.allowedBuiltinIconPacks as string[]) || ['lucide', 'original']
	);

	interface IconEntry {
		id: IconId;
		label: string;
	}

	const icons: IconEntry[] = [
		// 1. Navigation
		{ id: 'nav.feed', label: 'Flux' },
		{ id: 'nav.publish', label: 'Publier' },
		{ id: 'nav.chat', label: 'Messages' },
		{ id: 'nav.explore', label: 'Explorer' },
		{ id: 'nav.notifications', label: 'Notifications' },
		{ id: 'nav.settings', label: 'Paramètres' },

		// 2. Actions
		{ id: 'action.like', label: 'J’aime' },
		{ id: 'action.like_outline', label: 'J’aime (contour)' },
		{ id: 'action.comment', label: 'Commentaires' },
		{ id: 'action.menu', label: 'Menu' },
		{ id: 'action.edit', label: 'Modifier' },
		{ id: 'action.delete', label: 'Supprimer' },
		{ id: 'action.close', label: 'Fermer' },
		{ id: 'action.back', label: 'Retour' },
		{ id: 'action.search', label: 'Recherche' },
		{ id: 'action.add', label: 'Ajouter' },
		{ id: 'action.check', label: 'Valider' },
		{ id: 'action.copy_link', label: 'Lien' },
		{ id: 'action.message', label: 'Contact' },
		{ id: 'action.up', label: 'Haut' },
		{ id: 'action.mic', label: 'Micro / Vocal' },

		// 3. Médias
		{ id: 'media.camera', label: 'Caméra' },
		{ id: 'media.image', label: 'Image' },
		{ id: 'media.video', label: 'Vidéo' },
		{ id: 'media.carousel', label: 'Carrousel' },
		{ id: 'media.text', label: 'Texte' },
		{ id: 'media.prev', label: 'Précédent' },
		{ id: 'media.next', label: 'Suivant' },

		// 4. Statuts
		{ id: 'status.mute', label: 'Sourdine' },
		{ id: 'status.visibility', label: 'Visibilité' },
		{ id: 'status.lock', label: 'Privé' },
		{ id: 'status.tag', label: 'Tag' },
		{ id: 'status.palette', label: 'Icônes' },
		{ id: 'status.users', label: 'Membres' },
		{ id: 'status.time', label: 'Durée' }
	];

	let activeModalIcon = $state<IconEntry | null>(null);

	// Bibliothèque
	let ownedSets = $state<IconSet[]>([]);
	let savedSets = $state<IconSet[]>([]);
	let allowedCommunitySets = $state<IconSet[]>(
		untrack(() => (instanceSettings?.allowedCustomIconSets as IconSet[]) || [])
	);
	let activeServerSetId = $state<string | null>(null);
	let isLoadingLibrary = $state(true);
	let libraryTab = $state<'owned' | 'saved'>('owned');

	// États actifs
	let isCustomActive = $derived(iconTheme.pack === 'sauce' && !iconTheme.activeIconSetId);
	let isLucideActive = $derived(iconTheme.pack === 'lucide' && !iconTheme.activeIconSetId);
	let isOriginalActive = $derived(iconTheme.pack === 'original' && !iconTheme.activeIconSetId);
	let hasModifiedCustomIcons = $derived(Object.keys(iconTheme.customIcons || {}).length > 0);

	// Formulaire de sauvegarde / création / édition
	let editingSetId = $state<string | null>(null);
	let newSetName = $state('');
	let newSetDescription = $state('');

	function resetForm() {
		editingSetId = null;
		newSetName = '';
		newSetDescription = '';
	}

	async function selectLucide() {
		resetForm();
		if (activeServerSetId || iconTheme.activeIconSetId) {
			await handleDeactivateActiveSet();
		}
		iconTheme.setPack('lucide');
	}

	async function selectOriginal() {
		resetForm();
		if (activeServerSetId || iconTheme.activeIconSetId) {
			await handleDeactivateActiveSet();
		}
		iconTheme.setPack('original');
	}

	async function selectCustom() {
		resetForm();
		if (activeServerSetId || iconTheme.activeIconSetId) {
			await handleDeactivateActiveSet();
		}
		iconTheme.setPack('sauce');
	}

	async function handleSelectCommunitySet(set: IconSet) {
		resetForm();
		if (activeServerSetId === set.id || iconTheme.activeIconSetId === set.id) {
			await handleDeactivateActiveSet();
		} else {
			await handleActivateSet(set);
		}
	}

	async function loadLibrary() {
		isLoadingLibrary = true;
		try {
			const res = await fetch('/api/icon-sets');
			if (res.ok) {
				const data = await res.json();
				ownedSets = data.owned || data.ownedSets || [];
				savedSets = data.saved || data.savedSets || [];
				if (data.allowedCustomIconSets) {
					allowedCommunitySets = data.allowedCustomIconSets;
				}
				activeServerSetId = data.activeIconSetId ?? data.activeServerSetId ?? null;

				if (activeServerSetId) {
					const activeSet =
						data.activeSet ||
						[...ownedSets, ...savedSets, ...allowedCommunitySets].find(
							(s) => s.id === activeServerSetId
						);
					if (activeSet) {
						iconTheme.applyServerIconSet({
							id: activeSet.id,
							name: activeSet.name,
							icons: activeSet.icons,
							fallback: activeSet.fallback
						});
					}
				}
			}
		} catch (err) {
			console.error('Erreur chargement bibliothèque', err);
		} finally {
			isLoadingLibrary = false;
		}
	}

	onMount(() => {
		loadLibrary();
	});

	async function handleActivateSet(set: IconSet) {
		resetForm();
		try {
			const res = await fetch(`/api/icon-sets/${set.id}/activate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ activate: true })
			});
			if (res.ok) {
				activeServerSetId = set.id;
				iconTheme.applyServerIconSet({
					id: set.id,
					name: set.name,
					icons: set.icons,
					fallback: set.fallback
				});
				await loadLibrary();
			}
		} catch (err) {
			console.error('Erreur activation set', err);
		}
	}

	async function handleDeactivateActiveSet() {
		const targetId = activeServerSetId || iconTheme.activeIconSetId || ownedSets[0]?.id || 'none';
		resetForm();
		try {
			const res = await fetch(`/api/icon-sets/${targetId}/activate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ activate: false })
			});
			if (res.ok) {
				activeServerSetId = null;
				iconTheme.revertToDefault();
				await loadLibrary();
			}
		} catch (err) {
			console.error('Erreur désactivation set', err);
		}
	}

	async function handleSaveSet(payload: { name: string; description?: string }) {
		const currentCustomMap = iconTheme.customIcons || {};
		if (Object.keys(currentCustomMap).length === 0) {
			throw new Error('Veuillez personnaliser au moins une icône avant de sauvegarder le pack.');
		}

		const body = {
			name: payload.name,
			description: payload.description,
			icons: currentCustomMap,
			fallback: iconTheme.fallback
		};

		let res: Response;
		if (editingSetId) {
			res = await fetch(`/api/icon-sets/${editingSetId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
		} else {
			res = await fetch('/api/icon-sets', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
		}

		const data = await res.json();
		if (!res.ok) {
			throw new Error(data.error || 'Erreur lors de la sauvegarde du pack.');
		}

		// Basculer immédiatement sur l'onglet "Mes packs" pour voir le pack créé
		libraryTab = 'owned';
		resetForm();

		// Activer immédiatement le pack sauvegardé pour l'utilisateur
		if (data && data.id) {
			activeServerSetId = data.id;
			iconTheme.applyServerIconSet({
				id: data.id,
				name: data.name,
				icons: data.icons || currentCustomMap,
				fallback: data.fallback
			});
		}

		await loadLibrary();
	}

	async function handleLoadIntoEditor(set: IconSet) {
		editingSetId = set.id;
		newSetName = set.name;
		newSetDescription = set.description || '';

		iconTheme.setPack('sauce');
		iconTheme.customIcons = { ...(set.icons || {}) };
		await tick();
	}

	async function handleDeleteSet(set: IconSet) {
		if (!confirm(`Supprimer définitivement le pack "${set.name}" ?`)) return;

		try {
			const res = await fetch(`/api/icon-sets/${set.id}`, { method: 'DELETE' });
			if (res.ok) {
				if (activeServerSetId === set.id) {
					activeServerSetId = null;
					iconTheme.revertToDefault();
				}
				if (editingSetId === set.id) {
					resetForm();
				}
				await loadLibrary();
			}
		} catch (err) {
			console.error('Erreur suppression set', err);
		}
	}

	async function handleRemoveSaved(set: IconSet) {
		try {
			const res = await fetch(`/api/icon-sets/${set.id}/toggle-save`, { method: 'POST' });
			if (res.ok) {
				if (activeServerSetId === set.id) {
					activeServerSetId = null;
					iconTheme.revertToDefault();
				}
				await loadLibrary();
			}
		} catch (err) {
			console.error('Erreur retrait set sauvegardé', err);
		}
	}

	async function handleFileSelected(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file || !activeModalIcon) return;

		try {
			const formData = new FormData();
			formData.append('file', file);

			const res = await fetch('/api/upload', { method: 'POST', body: formData });
			const data = await res.json();

			if (!res.ok || !data.success || !data.media?.[0]?.url) {
				throw new Error(data.message || 'Échec du téléversement.');
			}

			const uploadedUrl = data.media[0].url;
			iconTheme.setCustomIcon(activeModalIcon.id, uploadedUrl);

			if (iconTheme.pack !== 'sauce') {
				iconTheme.setPack('sauce');
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Erreur lors de l'envoi de l'image.";
			alert(msg);
		} finally {
			target.value = '';
			activeModalIcon = null;
		}
	}

	function handleReset(iconId: IconId) {
		iconTheme.removeCustomIcon(iconId);
		activeModalIcon = null;
	}
</script>

<div class="settings-icons-container">
	<!-- Bannière de pack actif -->
	{#if activeServerSetId || iconTheme.activeIconSetName}
		<div class="active-pack-banner">
			<div class="banner-info">
				<span class="banner-badge">Pack d'icônes actif</span>
				<strong>{iconTheme.activeIconSetName || 'Pack personnalisé'}</strong>
			</div>
			<button type="button" class="btn-deactivate-banner" onclick={handleDeactivateActiveSet}>
				Désactiver (revenir par défaut)
			</button>
		</div>
	{/if}

	<SettingsCard title="Thème des Icônes">
		<div class="theme-options-column">
			{#if allowedBuiltinPacks.includes('lucide')}
				<button
					type="button"
					class="theme-option"
					class:active={isLucideActive}
					onclick={selectLucide}
				>
					<span class="radio-indicator" class:checked={isLucideActive}></span>
					<span class="theme-name">vectoriel</span>
				</button>
			{/if}

			{#if allowedBuiltinPacks.includes('original')}
				<button
					type="button"
					class="theme-option"
					class:active={isOriginalActive}
					onclick={selectOriginal}
				>
					<span class="radio-indicator" class:checked={isOriginalActive}></span>
					<span class="theme-name">emojis</span>
				</button>
			{/if}

			<!-- Packs de la communauté autorisés par l'instance -->
			{#each allowedCommunitySets as set (set.id)}
				{@const isSetSelected =
					activeServerSetId === set.id || iconTheme.activeIconSetId === set.id}
				<button
					type="button"
					class="theme-option"
					class:active={isSetSelected}
					onclick={() => handleSelectCommunitySet(set)}
				>
					<span class="radio-indicator" class:checked={isSetSelected}></span>
					<span class="theme-name">
						<span>{set.name}</span>
						<span class="community-pill">Pack commu</span>
						{#if set.owner?.username}
							<small class="community-author">par @{set.owner.username}</small>
						{/if}
					</span>
				</button>
			{/each}

			<button
				type="button"
				class="theme-option"
				class:active={isCustomActive}
				onclick={selectCustom}
			>
				<span class="radio-indicator" class:checked={isCustomActive}></span>
				<span class="theme-name">custom</span>
			</button>
		</div>

		{#if isCustomActive || editingSetId}
			<div class="fallback-section">
				<span class="fallback-title">Repli si non personnalisé :</span>
				<div class="fallback-options">
					{#if allowedBuiltinPacks.includes('lucide')}
						<button
							type="button"
							class="fallback-btn"
							class:active={iconTheme.fallback === 'lucide'}
							onclick={() => iconTheme.setFallback('lucide')}
						>
							vectoriel
						</button>
					{/if}
					{#if allowedBuiltinPacks.includes('original')}
						<button
							type="button"
							class="fallback-btn"
							class:active={iconTheme.fallback === 'original'}
							onclick={() => iconTheme.setFallback('original')}
						>
							emojis
						</button>
					{/if}
				</div>
			</div>
		{/if}
	</SettingsCard>

	<!-- Prévisualisation & Édition : affiché uniquement en mode Custom ou lors de l'édition d'un pack -->
	{#if isCustomActive || editingSetId}
		<IconSetEditorModal
			{icons}
			{editingSetId}
			initialName={newSetName}
			initialDescription={newSetDescription}
			{hasModifiedCustomIcons}
			onSelectIcon={(item) => (activeModalIcon = item)}
			onSave={handleSaveSet}
			onCancel={resetForm}
		/>
	{/if}

	<!-- Bibliothèque de packs -->
	<SettingsCard title="Bibliothèque de Sets d'icônes">
		{#if isLoadingLibrary}
			<p class="loading-hint">Chargement de votre bibliothèque...</p>
		{:else}
			<AssetLibraryTabs
				activeTab={libraryTab}
				ownedCount={ownedSets.length}
				savedCount={savedSets.length}
				itemLabel="Packs"
				onTabChange={(tab) => (libraryTab = tab)}
			/>

			{#if libraryTab === 'owned'}
				{#if ownedSets.length === 0}
					<p class="empty-hint">Vous n'avez pas encore créé de pack d'icônes.</p>
				{:else}
					<div class="packs-list">
						{#each ownedSets as set (set.id)}
							{@const iconCount = Object.keys(set.icons || {}).length}
							<AssetPackCard
								id={set.id}
								name={set.name}
								description={set.description}
								itemCount={iconCount}
								itemLabel="icône"
								previews={Object.values(set.icons || {})}
								isActive={activeServerSetId === set.id}
								isEditing={editingSetId === set.id}
								isPublished={set.isPublished}
								isOwned={true}
								onActivate={() => handleActivateSet(set)}
								onDeactivate={handleDeactivateActiveSet}
								onEdit={() => handleLoadIntoEditor(set)}
								onPublish={() => goto(resolve(`/publier?iconSetId=${set.id}`))}
								onDelete={() => handleDeleteSet(set)}
							/>
						{/each}
					</div>
				{/if}
			{:else if savedSets.length === 0}
				<p class="empty-hint">
					Aucun pack d'autres utilisateurs sauvegardé dans votre bibliothèque.
				</p>
			{:else}
				<div class="packs-list">
					{#each savedSets as set (set.id)}
						{@const iconCount = Object.keys(set.icons || {}).length}
						<AssetPackCard
							id={set.id}
							name={set.name}
							description={set.description}
							itemCount={iconCount}
							itemLabel="icône"
							previews={Object.values(set.icons || {})}
							isActive={activeServerSetId === set.id}
							isOwned={false}
							onActivate={() => handleActivateSet(set)}
							onDeactivate={handleDeactivateActiveSet}
							onRemoveSaved={() => handleRemoveSaved(set)}
						/>
					{/each}
				</div>
			{/if}
		{/if}
	</SettingsCard>
</div>

<!-- Modal d'édition d'une icône -->
{#if activeModalIcon}
	<IconItemEditModal
		icon={activeModalIcon}
		onClose={() => (activeModalIcon = null)}
		onFileSelected={handleFileSelected}
		onReset={handleReset}
	/>
{/if}

<style>
	.settings-icons-container {
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

	.btn-deactivate-banner {
		padding: 6px 12px;
		background: #ffffff;
		border: 1px solid #cbd5e1;
		border-radius: 6px;
		color: #475569;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		white-space: nowrap;
	}

	.btn-deactivate-banner:hover {
		background: #fee2e2;
		color: #dc2626;
		border-color: #fca5a5;
	}

	.theme-options-column {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.theme-option {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 14px;
		border-radius: 10px;
		border: 1px solid #e2e8f0;
		background: #ffffff;
		cursor: pointer;
		text-align: left;
		transition: all 0.15s ease;
	}

	.theme-option:hover {
		border-color: #cbd5e1;
		background: #f8fafc;
	}

	.theme-option.active {
		border-color: #0ea5e9;
		background: #f0f9ff;
	}

	.radio-indicator {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		border: 2px solid #cbd5e1;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.radio-indicator.checked {
		border-color: #0ea5e9;
	}

	.radio-indicator.checked::after {
		content: '';
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: #0ea5e9;
	}

	.theme-name {
		font-size: 0.95rem;
		font-weight: 600;
		color: #1e293b;
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.community-pill {
		font-size: 0.68rem;
		padding: 2px 6px;
		border-radius: 6px;
		background: #e0f2fe;
		color: #0369a1;
		font-weight: 700;
	}

	.community-author {
		font-size: 0.75rem;
		color: #64748b;
		font-weight: normal;
	}

	.fallback-section {
		margin-top: 14px;
		padding-top: 14px;
		border-top: 1px solid #f1f5f9;
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 10px;
	}

	.fallback-title {
		font-size: 0.85rem;
		color: #64748b;
		font-weight: 500;
	}

	.fallback-options {
		display: flex;
		gap: 6px;
	}

	.fallback-btn {
		padding: 4px 10px;
		border-radius: 6px;
		border: 1px solid #e2e8f0;
		background: #ffffff;
		color: #475569;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
	}

	.fallback-btn.active {
		border-color: #0ea5e9;
		background: #0ea5e9;
		color: #ffffff;
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

	.packs-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
</style>
