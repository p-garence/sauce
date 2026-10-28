<!--
  @component AdminDefaultsSettings
  @domain admin
  @description Configuration des contenus et préférences créés par défaut lors de l'inscription des utilisateurs (groupes initiaux, flux initiaux, clés d'invitations).
  @responsibilities
    - Définir la liste des groupes intimes créés à l'onboarding pour chaque membre.
    - Définir la liste des flux créés automatiquement à l'inscription (le 1er étant le flux d'accueil actif).
    - Définir le quota initial de clés d'invitation attribuées par compte.
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type {
		InstanceContentDefaults,
		DefaultGroupConfig,
		DefaultFeedConfig,
		FeedSource,
		FeedSortMode,
		FeedTimeWindow
	} from '$lib/types';

	interface Props {
		/** Paramètres par défaut actuels de l'instance */
		contentDefaults: InstanceContentDefaults;
	}

	let { contentDefaults }: Props = $props();
	let isSaving = $state(false);

	// svelte-ignore state_referenced_locally
	let maxInvites = $state(contentDefaults.defaultMaxInvites || 10);

	// svelte-ignore state_referenced_locally
	let groups = $state<DefaultGroupConfig[]>(
		contentDefaults.defaultGroups && contentDefaults.defaultGroups.length > 0
			? JSON.parse(JSON.stringify(contentDefaults.defaultGroups))
			: [
					{
						name: contentDefaults.defaultGroupName || 'Amis proches',
						color: contentDefaults.defaultGroupColor || '#10b981'
					}
				]
	);

	// svelte-ignore state_referenced_locally
	let feeds = $state<DefaultFeedConfig[]>(
		contentDefaults.defaultFeeds && contentDefaults.defaultFeeds.length > 0
			? JSON.parse(JSON.stringify(contentDefaults.defaultFeeds))
			: [
					{
						name: (contentDefaults.defaultFeedConfig as { name?: string })?.name || 'Chronologique',
						source:
							(contentDefaults.defaultFeedConfig as { source?: FeedSource })?.source || 'public',
						sortMode:
							(contentDefaults.defaultFeedConfig as { sortMode?: FeedSortMode })?.sortMode ||
							'chrono',
						timeWindow:
							(contentDefaults.defaultFeedConfig as { timeWindow?: FeedTimeWindow })?.timeWindow ||
							'7d'
					}
				]
	);

	$effect(() => {
		maxInvites = contentDefaults.defaultMaxInvites || 10;
		if (contentDefaults.defaultGroups && contentDefaults.defaultGroups.length > 0) {
			groups = JSON.parse(JSON.stringify(contentDefaults.defaultGroups));
		}
		if (contentDefaults.defaultFeeds && contentDefaults.defaultFeeds.length > 0) {
			feeds = JSON.parse(JSON.stringify(contentDefaults.defaultFeeds));
		}
	});

	// Formulaire d'ajout rapide de groupe
	let newGroupName = $state('');
	let newGroupColor = $state('#3b82f6');

	function addGroup() {
		const trimmed = newGroupName.trim();
		if (!trimmed) return;
		groups = [...groups, { name: trimmed, color: newGroupColor }];
		newGroupName = '';
		newGroupColor = '#3b82f6';
	}

	function removeGroup(index: number) {
		if (groups.length <= 1) return;
		groups = groups.filter((_, i) => i !== index);
	}

	// Formulaire d'ajout rapide de flux
	let newFeedName = $state('');
	let newFeedSource = $state<FeedSource>('public');
	let newFeedSortMode = $state<FeedSortMode>('chrono');
	let newFeedTimeWindow = $state<FeedTimeWindow>('7d');

	function addFeed() {
		const trimmed = newFeedName.trim();
		if (!trimmed) return;
		feeds = [
			...feeds,
			{
				name: trimmed,
				source: newFeedSource,
				sortMode: newFeedSortMode,
				timeWindow: newFeedTimeWindow
			}
		];
		newFeedName = '';
		newFeedSource = 'public';
		newFeedSortMode = 'chrono';
		newFeedTimeWindow = '7d';
	}

	function removeFeed(index: number) {
		if (feeds.length <= 1) return;
		feeds = feeds.filter((_, i) => i !== index);
	}

	function getSourceLabel(source: string) {
		switch (source) {
			case 'following':
				return 'Abonnements';
			case 'blend':
				return 'Mélange';
			default:
				return 'Public';
		}
	}

	function getSortLabel(sort: string) {
		switch (sort) {
			case 'trending':
				return 'Tendance';
			case 'discussed':
				return 'Plus discutés';
			case 'oldest':
				return 'Plus anciens';
			case 'random':
				return 'Aléatoire';
			default:
				return 'Chronologique';
		}
	}
</script>

<div class="settings-card">
	<div class="card-header">
		<h2 class="card-title">Parrainage et invitations initiales</h2>
		<p class="card-description">
			Définit le capital d'invitations attribué à chaque nouvel arrivant pour parrainer d'autres
			membres.
		</p>
	</div>

	<form
		method="POST"
		action="?/saveDefaults"
		use:enhance={() => {
			isSaving = true;
			return async ({ update }) => {
				await update({ reset: false });
				isSaving = false;
			};
		}}
		class="settings-form"
	>
		<input type="hidden" name="groupsJson" value={JSON.stringify(groups)} />
		<input type="hidden" name="feedsJson" value={JSON.stringify(feeds)} />

		<div class="form-grid">
			<div class="form-group">
				<label for="defaultMaxInvites" class="form-label">
					Nombre maximal d'invitations par compte
				</label>
				<input
					type="number"
					id="defaultMaxInvites"
					name="defaultMaxInvites"
					class="form-input"
					min="0"
					max="500"
					bind:value={maxInvites}
					required
				/>
				<span class="field-hint">
					Nombre de clés d'invitation que chaque membre a le droit de générer à son inscription.
				</span>
			</div>
		</div>

		<div class="sub-section">
			<h3 class="sub-section-title">Groupes créés par défaut à l'inscription</h3>
			<p class="sub-section-desc">
				Chaque nouvel utilisateur bénéficiera automatiquement de ces groupes dans son carnet pour y
				partager du contenu ciblé.
			</p>

			<div class="items-list">
				{#each groups as group, index (group.name + index)}
					<div class="item-row">
						<div class="item-preview">
							<span class="color-badge" style="background-color: {group.color};"></span>
							<span class="item-name">{group.name}</span>
							<span class="color-code">{group.color}</span>
						</div>
						<div class="item-actions">
							{#if groups.length > 1}
								<button
									type="button"
									class="btn-delete"
									onclick={() => removeGroup(index)}
									title="Supprimer ce groupe"
								>
									Supprimer
								</button>
							{/if}
						</div>
					</div>
				{/each}
			</div>

			<div class="add-box">
				<h4 class="add-box-title">Ajouter un groupe par défaut</h4>
				<div class="add-row">
					<input
						type="text"
						class="form-input"
						placeholder="Ex: Famille, Amis..."
						bind:value={newGroupName}
					/>
					<input type="color" class="color-input" bind:value={newGroupColor} />
					<button
						type="button"
						class="btn-secondary"
						onclick={addGroup}
						disabled={!newGroupName.trim()}
					>
						Ajouter
					</button>
				</div>
			</div>
		</div>

		<div class="sub-section">
			<h3 class="sub-section-title">Flux créés par défaut à l'inscription</h3>
			<p class="sub-section-desc">
				Flux configurés automatiquement dans l'application pour chaque nouveau membre. Le premier
				flux de la liste constituera son flux d'accueil actif.
			</p>

			<div class="items-list">
				{#each feeds as feed, index (feed.name + index)}
					<div class="item-row">
						<div class="item-preview">
							{#if index === 0}
								<span class="active-badge">Actif par défaut</span>
							{/if}
							<strong class="item-name">{feed.name}</strong>
							<span class="feed-meta">
								Source : {getSourceLabel(feed.source)} | Tri : {getSortLabel(feed.sortMode)} | {feed.timeWindow}
							</span>
						</div>
						<div class="item-actions">
							{#if feeds.length > 1}
								<button
									type="button"
									class="btn-delete"
									onclick={() => removeFeed(index)}
									title="Supprimer ce flux"
								>
									Supprimer
								</button>
							{/if}
						</div>
					</div>
				{/each}
			</div>

			<div class="add-box">
				<h4 class="add-box-title">Ajouter un flux par défaut</h4>
				<div class="add-feed-grid">
					<div class="form-group">
						<label for="newFeedNameInput" class="form-label-sm">Nom du flux</label>
						<input
							type="text"
							id="newFeedNameInput"
							class="form-input"
							placeholder="Ex: Abonnements, Découverte..."
							bind:value={newFeedName}
						/>
					</div>

					<div class="form-group">
						<label for="newFeedSourceInput" class="form-label-sm">Source</label>
						<select id="newFeedSourceInput" class="form-select" bind:value={newFeedSource}>
							<option value="public">Publications publiques</option>
							<option value="following">Abonnements uniquement</option>
							<option value="blend">Mélange personnalisé</option>
						</select>
					</div>

					<div class="form-group">
						<label for="newFeedSortInput" class="form-label-sm">Tri</label>
						<select id="newFeedSortInput" class="form-select" bind:value={newFeedSortMode}>
							<option value="chrono">Chronologique</option>
							<option value="trending">Tendance</option>
							<option value="discussed">Plus discutés</option>
							<option value="oldest">Plus anciens</option>
							<option value="random">Aléatoire</option>
						</select>
					</div>

					<div class="form-group">
						<label for="newFeedTimeInput" class="form-label-sm">Fenêtre</label>
						<select id="newFeedTimeInput" class="form-select" bind:value={newFeedTimeWindow}>
							<option value="24h">24 heures</option>
							<option value="7d">7 jours</option>
							<option value="30d">30 jours</option>
							<option value="all">Tout</option>
						</select>
					</div>
				</div>

				<div class="add-box-actions">
					<button
						type="button"
						class="btn-secondary"
						onclick={addFeed}
						disabled={!newFeedName.trim()}
					>
						Ajouter ce flux
					</button>
				</div>
			</div>
		</div>

		<div class="form-actions">
			<button type="submit" class="btn-save" disabled={isSaving}>
				{isSaving ? 'Enregistrement...' : 'Enregistrer les contenus par défaut'}
			</button>
		</div>
	</form>
</div>

<style>
	.settings-card {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		padding: 24px;
		margin-bottom: 24px;
	}

	.card-header {
		margin-bottom: 20px;
	}

	.card-title {
		font-size: 1.15rem;
		font-weight: 700;
		color: #0f172a;
		margin: 0 0 6px 0;
	}

	.card-description {
		font-size: 0.9rem;
		color: #64748b;
		margin: 0;
	}

	.settings-form {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.form-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 20px;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.form-label {
		font-size: 0.88rem;
		font-weight: 600;
		color: #1e293b;
	}

	.form-label-sm {
		font-size: 0.82rem;
		font-weight: 600;
		color: #475569;
	}

	.form-input,
	.form-select {
		padding: 8px 12px;
		border: 1px solid #cbd5e1;
		border-radius: 6px;
		font-size: 0.9rem;
		color: #0f172a;
		background: #ffffff;
		outline: none;
	}

	.form-input:focus,
	.form-select:focus {
		border-color: #0284c7;
	}

	.field-hint {
		font-size: 0.8rem;
		color: #64748b;
	}

	.sub-section {
		border-top: 1px solid #e2e8f0;
		padding-top: 20px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.sub-section-title {
		font-size: 1.02rem;
		font-weight: 600;
		color: #0f172a;
		margin: 0;
	}

	.sub-section-desc {
		font-size: 0.85rem;
		color: #64748b;
		margin: 0;
	}

	.items-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.item-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 14px;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 6px;
		gap: 12px;
	}

	.item-preview {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}

	.color-badge {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.item-name {
		font-size: 0.92rem;
		color: #0f172a;
	}

	.color-code {
		font-size: 0.8rem;
		color: #64748b;
		font-family: monospace;
	}

	.active-badge {
		padding: 2px 8px;
		background: #e0f2fe;
		color: #0369a1;
		font-size: 0.76rem;
		font-weight: 600;
		border-radius: 4px;
	}

	.feed-meta {
		font-size: 0.82rem;
		color: #64748b;
	}

	.item-actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.btn-delete {
		padding: 4px 10px;
		background: none;
		border: 1px solid #fecaca;
		color: #dc2626;
		font-size: 0.8rem;
		font-weight: 500;
		border-radius: 4px;
		cursor: pointer;
	}

	.btn-delete:hover {
		background: #fef2f2;
	}

	.add-box {
		padding: 14px;
		background: #ffffff;
		border: 1px dashed #cbd5e1;
		border-radius: 8px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.add-box-title {
		margin: 0;
		font-size: 0.88rem;
		font-weight: 600;
		color: #334155;
	}

	.add-row {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.add-feed-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 12px;
	}

	.color-input {
		width: 44px;
		height: 38px;
		padding: 2px;
		border: 1px solid #cbd5e1;
		border-radius: 6px;
		cursor: pointer;
		background: #ffffff;
	}

	.btn-secondary {
		padding: 8px 16px;
		border-radius: 6px;
		border: 1px solid #cbd5e1;
		background: #ffffff;
		color: #0f172a;
		font-weight: 600;
		font-size: 0.85rem;
		cursor: pointer;
		white-space: nowrap;
	}

	.btn-secondary:hover:not(:disabled) {
		background: #f1f5f9;
	}

	.btn-secondary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.add-box-actions {
		display: flex;
		justify-content: flex-end;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		padding-top: 8px;
	}

	.btn-save {
		padding: 9px 20px;
		border-radius: 6px;
		border: none;
		background: #0284c7;
		color: #ffffff;
		font-weight: 600;
		font-size: 0.9rem;
		cursor: pointer;
	}

	.btn-save:hover:not(:disabled) {
		background: #0369a1;
	}

	.btn-save:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
