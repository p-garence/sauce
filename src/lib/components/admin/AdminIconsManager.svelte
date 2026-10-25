<script lang="ts">
	/**
	 * @component AdminIconsManager
	 * @domain Admin / Appearance
	 * @description Gestion des packs d'icônes de l'instance (packs intégrés et communautaires)
	 * @responsibilities
	 * - Autoriser ou désactiver les styles d'icônes intégrés (Lucide, Original)
	 * - Autoriser ou retirer des packs personnalisés publiés par la communauté
	 * - Définir le pack d'icônes par défaut appliqué à l'ensemble de l'instance
	 * - Enregistrer la configuration vers `/api/admin/appearance/icons`
	 */
	import { untrack } from 'svelte';
	import type { IconSet } from '$lib/types';
	import type { InstanceSettingsData } from '$lib/server/instanceSettings';

	interface Props {
		/** Configuration actuelle des paramètres de l'instance */
		instanceSettings: InstanceSettingsData;
		/** Liste des packs d'icônes publiés par la communauté */
		publishedIconSets?: IconSet[];
	}

	let { instanceSettings, publishedIconSets = [] }: Props = $props();

	// État pour les Icônes
	let allowedBuiltin = $state<string[]>(
		untrack(() => [...(instanceSettings.allowedBuiltinIconPacks || ['lucide', 'original'])])
	);

	let allowedCustomIds = $state<string[]>(
		untrack(() => [
			...(instanceSettings.allowedCustomIconSetIds ||
				(instanceSettings.defaultIconSetId ? [instanceSettings.defaultIconSetId] : []))
		])
	);

	let selectedDefaultKey = $state<string>(
		untrack(() =>
			instanceSettings.defaultIconPack === 'custom' && instanceSettings.defaultIconSetId
				? instanceSettings.defaultIconSetId
				: instanceSettings.defaultIconPack || 'lucide'
		)
	);

	let selectedCustomToAdd = $state<string>('');
	let isSavingIcons = $state(false);
	let iconSaveMessage = $state<string | null>(null);
	let iconSaveError = $state<string | null>(null);

	// Packs personnalisés actuellement autorisés
	let allowedCustomSets = $derived(
		publishedIconSets.filter((s) => allowedCustomIds.includes(s.id))
	);

	// Packs personnalisés publiés restants qui peuvent être ajoutés
	let availableCustomToAdd = $derived(
		publishedIconSets.filter((s) => !allowedCustomIds.includes(s.id))
	);

	function toggleBuiltin(pack: 'lucide' | 'original', checked: boolean) {
		if (checked) {
			if (!allowedBuiltin.includes(pack)) {
				allowedBuiltin = [...allowedBuiltin, pack];
			}
		} else {
			if (allowedBuiltin.length <= 1 && allowedCustomIds.length === 0) {
				alert("Au moins un pack d'icônes doit rester autorisé pour l'instance.");
				return;
			}
			allowedBuiltin = allowedBuiltin.filter((p) => p !== pack);
			// Si le pack par défaut actuel a été décoché, on rebascule sur le premier pack autorisé disponible
			if (selectedDefaultKey === pack) {
				selectedDefaultKey = allowedBuiltin[0] || allowedCustomIds[0] || 'lucide';
			}
		}
	}

	function handleAddCustomPack() {
		if (!selectedCustomToAdd) return;
		if (!allowedCustomIds.includes(selectedCustomToAdd)) {
			allowedCustomIds = [...allowedCustomIds, selectedCustomToAdd];
		}
		selectedCustomToAdd = '';
	}

	function handleRemoveCustomPack(id: string) {
		allowedCustomIds = allowedCustomIds.filter((x) => x !== id);
		// Si le pack retiré était celui par défaut, on rebascule
		if (selectedDefaultKey === id) {
			selectedDefaultKey = allowedBuiltin[0] || allowedCustomIds[0] || 'lucide';
		}
	}

	async function handleSaveIconSettings() {
		isSavingIcons = true;
		iconSaveMessage = null;
		iconSaveError = null;

		const isCustom = selectedDefaultKey !== 'lucide' && selectedDefaultKey !== 'original';

		try {
			const res = await fetch('/api/admin/appearance/icons', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					allowedBuiltinIconPacks: allowedBuiltin,
					allowedCustomIconSetIds: allowedCustomIds,
					defaultIconPack: isCustom ? 'custom' : selectedDefaultKey,
					defaultIconSetId: isCustom ? selectedDefaultKey : null
				})
			});

			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.error || 'Erreur lors de la sauvegarde');
			}

			iconSaveMessage = "Réglages d'icônes de l'instance enregistrés avec succès !";
		} catch (err: unknown) {
			iconSaveError = err instanceof Error ? err.message : 'Erreur inconnue';
		} finally {
			isSavingIcons = false;
		}
	}
</script>

<section class="card-section">
	<div class="section-header">
		<div>
			<h2 class="section-title">Thème des Icônes par défaut</h2>
			<p class="section-subtitle">
				Configurez les packs d'icônes autorisés sur l'instance et sélectionnez celui qui sera
				appliqué par défaut à tous les membres et visiteurs.
			</p>
		</div>
	</div>

	{#if iconSaveMessage}
		<div class="alert-success">{iconSaveMessage}</div>
	{/if}
	{#if iconSaveError}
		<div class="alert-error">{iconSaveError}</div>
	{/if}

	<!-- BLOC 1 : PACKS AUTORISÉS (INTÉGRÉS + COMMUNAUTÉ) -->
	<div class="form-block">
		<h3 class="block-title">Packs intégrés autorisés</h3>
		<p class="block-desc">
			Cochez les styles intégrés autorisés et ajoutez des packs personnalisés créés et publiés par la
			communauté.
		</p>

		<div class="checkbox-group">
			<label class="custom-checkbox">
				<input
					type="checkbox"
					checked={allowedBuiltin.includes('lucide')}
					onchange={(e) => toggleBuiltin('lucide', e.currentTarget.checked)}
				/>
				<span class="box-label">
					<strong>Vectoriel (Lucide)</strong>
					<small>Icônes vectorielles modernes et minimalistes.</small>
				</span>
			</label>

			<label class="custom-checkbox">
				<input
					type="checkbox"
					checked={allowedBuiltin.includes('original')}
					onchange={(e) => toggleBuiltin('original', e.currentTarget.checked)}
				/>
				<span class="box-label">
					<strong>Emojis système</strong>
					<small>Icônes colorées basées sur les emojis natifs du système.</small>
				</span>
			</label>
		</div>

		<!-- Packs communautaires autorisés -->
		{#if allowedCustomSets.length > 0}
			<div class="added-community-section">
				<h4 class="sub-block-title">Packs de la communauté autorisés ({allowedCustomSets.length}) :</h4>
				<div class="community-packs-list">
					{#each allowedCustomSets as set (set.id)}
						<div class="community-pack-item">
							<div class="pack-details">
								<strong class="pack-title">{set.name}</strong>
								<span class="pack-author">par @{set.owner?.username || 'anonyme'}</span>
							</div>
							<button
								type="button"
								class="btn-remove-community"
								onclick={() => handleRemoveCustomPack(set.id)}
							>
								✕ Retirer
							</button>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Ajouter depuis ceux publiés par la commu -->
		<div class="add-community-box">
			<label for="select_add_community" class="add-label">
				Ajouter un pack d'icônes publié par la communauté :
			</label>
			<div class="add-community-controls">
				{#if availableCustomToAdd.length === 0}
					<p class="empty-hint">
						{publishedIconSets.length === 0
							? "Aucun pack d'icônes personnalisé n'a encore été publié sur l'instance."
							: 'Tous les packs personnalisés publiés sont déjà ajoutés aux autorisés.'}
					</p>
				{:else}
					<select
						id="select_add_community"
						class="styled-select"
						bind:value={selectedCustomToAdd}
					>
						<option value="">-- Choisir un pack publié --</option>
						{#each availableCustomToAdd as set (set.id)}
							<option value={set.id}>
								{set.name} (créé par @{set.owner?.username || 'anonyme'})
							</option>
						{/each}
					</select>
					<button
						type="button"
						class="btn-secondary"
						disabled={!selectedCustomToAdd}
						onclick={handleAddCustomPack}
					>
						+ Ajouter
					</button>
				{/if}
			</div>
		</div>
	</div>

	<!-- BLOC 2 : SÉLECTION DU PACK PAR DÉFAUT -->
	<div class="form-block">
		<h3 class="block-title">Pack d'icônes par défaut de l'instance</h3>
		<p class="block-desc">
			Sélectionnez le pack appliqué par défaut aux utilisateurs et visiteurs parmi la liste autorisée
			ci-dessus :
		</p>

		<div class="radio-group">
			{#if allowedBuiltin.includes('lucide')}
				<label class="custom-radio">
					<input
						type="radio"
						name="default_pack"
						value="lucide"
						bind:group={selectedDefaultKey}
					/>
					<span><strong>Vectoriel (Lucide)</strong></span>
				</label>
			{/if}

			{#if allowedBuiltin.includes('original')}
				<label class="custom-radio">
					<input
						type="radio"
						name="default_pack"
						value="original"
						bind:group={selectedDefaultKey}
					/>
					<span><strong>Emojis système</strong></span>
				</label>
			{/if}

			{#each allowedCustomSets as set (set.id)}
				<label class="custom-radio">
					<input
						type="radio"
						name="default_pack"
						value={set.id}
						bind:group={selectedDefaultKey}
					/>
					<span>
						<strong>{set.name}</strong>
						<span class="custom-tag">Pack commu</span>
						<small class="text-muted">(@{set.owner?.username || 'anonyme'})</small>
					</span>
				</label>
			{/each}
		</div>
	</div>

	<div class="action-footer">
		<button
			type="button"
			class="btn-primary"
			disabled={isSavingIcons}
			onclick={handleSaveIconSettings}
		>
			{isSavingIcons ? 'Enregistrement...' : "Enregistrer les réglages d'icônes"}
		</button>
	</div>
</section>

<style>
	.card-section {
		background: #ffffff;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		padding: 24px;
	}

	.section-header {
		margin-bottom: 20px;
		border-bottom: 1px solid #f3f4f6;
		padding-bottom: 12px;
	}

	.section-title {
		margin: 0 0 4px 0;
		font-size: 1.25rem;
		font-weight: 700;
		color: #111827;
	}

	.section-subtitle {
		margin: 0;
		font-size: 0.9rem;
		color: #6b7280;
		line-height: 1.4;
	}

	.form-block {
		margin-bottom: 20px;
		padding-bottom: 20px;
		border-bottom: 1px dashed #e5e7eb;
	}

	.block-title {
		margin: 0 0 4px 0;
		font-size: 1rem;
		font-weight: 600;
		color: #1f2937;
	}

	.sub-block-title {
		margin: 14px 0 8px 0;
		font-size: 0.9rem;
		font-weight: 600;
		color: #374151;
	}

	.block-desc {
		margin: 0 0 12px 0;
		font-size: 0.85rem;
		color: #6b7280;
	}

	.checkbox-group {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.custom-checkbox {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 12px 16px;
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		cursor: pointer;
		transition: background 0.15s;
	}

	.custom-checkbox:hover {
		background: #f3f4f6;
	}

	.custom-checkbox input[type='checkbox'] {
		margin-top: 4px;
		cursor: pointer;
		width: 18px;
		height: 18px;
	}

	.box-label {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.box-label strong {
		font-size: 0.95rem;
		color: #111827;
	}

	.box-label small {
		font-size: 0.82rem;
		color: #6b7280;
	}

	.added-community-section {
		margin-top: 14px;
	}

	.community-packs-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.community-pack-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 10px 14px;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
	}

	.pack-details {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.pack-title {
		font-size: 0.92rem;
		color: #0f172a;
	}

	.pack-author {
		font-size: 0.8rem;
		color: #64748b;
	}

	.btn-remove-community {
		background: none;
		border: 1px solid #fca5a5;
		color: #dc2626;
		padding: 4px 10px;
		border-radius: 6px;
		font-size: 0.78rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s;
	}

	.btn-remove-community:hover {
		background: #fee2e2;
	}

	.add-community-box {
		margin-top: 16px;
		padding: 12px 14px;
		background: #f1f5f9;
		border-radius: 8px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.add-label {
		font-size: 0.85rem;
		font-weight: 600;
		color: #334155;
	}

	.add-community-controls {
		display: flex;
		gap: 8px;
		align-items: center;
		flex-wrap: wrap;
	}

	.styled-select {
		padding: 8px 12px;
		border: 1px solid #cbd5e1;
		border-radius: 6px;
		font-size: 0.9rem;
		background: white;
		color: #1e293b;
		flex: 1;
		min-width: 220px;
	}

	.btn-secondary {
		padding: 8px 16px;
		background: #e2e8f0;
		color: #1e293b;
		border: none;
		border-radius: 6px;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s;
	}

	.btn-secondary:hover:not(:disabled) {
		background: #cbd5e1;
	}

	.btn-secondary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.radio-group {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.custom-radio {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 0.95rem;
		color: #1e293b;
		cursor: pointer;
		padding: 8px 12px;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		transition: all 0.15s;
	}

	.custom-radio:hover {
		background: #f1f5f9;
		border-color: #cbd5e1;
	}

	.custom-radio input[type='radio'] {
		cursor: pointer;
		width: 18px;
		height: 18px;
		accent-color: #2563eb;
	}

	.custom-tag {
		background: #dbeafe;
		color: #1e40af;
		font-size: 0.72rem;
		font-weight: 700;
		padding: 2px 6px;
		border-radius: 4px;
		margin-left: 6px;
	}

	.text-muted {
		color: #64748b;
		font-size: 0.82rem;
		margin-left: 4px;
	}

	.action-footer {
		display: flex;
		justify-content: flex-end;
		margin-top: 20px;
	}

	.btn-primary {
		padding: 10px 20px;
		background: #2563eb;
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s;
	}

	.btn-primary:hover:not(:disabled) {
		background: #1d4ed8;
	}

	.btn-primary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.alert-success {
		background: #dcfce7;
		color: #15803d;
		padding: 10px 14px;
		border-radius: 8px;
		font-size: 0.9rem;
		margin-bottom: 16px;
		font-weight: 500;
	}

	.alert-error {
		background: #fee2e2;
		color: #b91c1c;
		padding: 10px 14px;
		border-radius: 8px;
		font-size: 0.9rem;
		margin-bottom: 16px;
		font-weight: 500;
	}
</style>
