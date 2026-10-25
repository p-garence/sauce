<!--
  @component FeedConfigForm
  @domain settings/feeds
  @description Formulaire unifié de création et d'édition d'un flux personnalisé (sources, filtres, tags, blend, RSS).
  @responsibilities
    - Unifier la saisie pour l'ajout et la mise à jour d'un flux (éliminant la duplication)
    - Gérer les sources (public, abonnements, groupes, fusion blend, flux RSS)
    - Configurer les filtres de tags avec sélection rapide depuis les tendances
    - Configurer les types de contenus et sous-types de carrousels
    - Configurer le ratio de mixage pour les flux de fusion (blend)
    - Soumettre le formulaire avec progressive enhancement (enhance SvelteKit)
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { untrack } from 'svelte';
	import SettingsButton from '$lib/components/settings/ui/SettingsButton.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import TrendingTagsBar from '$lib/components/post/TrendingTagsBar.svelte';
	import type { UserGroup, UserFeed, FeedSource, FeedSortMode, IconId } from '$lib/types';
	import { clearMainFeedState } from '$lib/client/feedMemory.svelte';

	/**
	 * Propriétés du composant FeedConfigForm
	 */
	interface Props {
		/** Flux en cours d'édition (ou null/undefined en mode création) */
		feed?: UserFeed | null;
		/** Liste de tous les flux existants pour la fusion blend */
		feeds: UserFeed[];
		/** Liste des groupes de l'utilisateur pour le filtrage par groupe */
		groups?: UserGroup[];
		/** Tags tendance suggérés */
		trendingTags?: { name: string; count?: number }[];
		/** Callback appelé lors de l'annulation */
		onCancel: () => void;
		/** Callback appelé après sauvegarde réussie */
		onSuccess: () => void;
	}

	let { feed = null, feeds, groups = [], trendingTags = [], onCancel, onSuccess }: Props = $props();

	const isEditing = $derived(!!feed?.id);

	let feedActionLoading = $state(false);

	// Initialisation des états selon le mode
	let currentSource = $state<FeedSource>(untrack(() => feed?.source || 'public'));
	let currentSortMode = $state<FeedSortMode>(untrack(() => feed?.sortMode || 'chrono'));
	let currentTags = $state<string[]>(
		untrack(() => (feed?.includeTags ? [...feed.includeTags] : []))
	);
	let tagInput = $state('');

	const AVAILABLE_CONTENT_TYPES = [
		{ id: 'text', label: 'Texte' },
		{ id: 'image', label: 'Image' },
		{ id: 'video', label: 'Vidéo' },
		{ id: 'carousel', label: 'Carrousel' }
	];

	const CAROUSEL_CHILD_TYPES = [
		{ id: 'image', label: 'Image' },
		{ id: 'video', label: 'Vidéo' },
		{ id: 'text', label: 'Texte' }
	];

	let currentExcludedGroups = $state<string[]>(
		untrack(() => (feed?.excludedGroupIds ? [...feed.excludedGroupIds] : []))
	);
	let currentContentTypeFilterMode = $state<'all' | 'include' | 'exclude'>(
		untrack(() => feed?.contentTypeFilterMode || 'all')
	);
	let currentContentTypes = $state<string[]>(
		untrack(() => (feed?.contentTypes ? [...feed.contentTypes] : []))
	);
	let currentCarouselContentTypeFilterMode = $state<'all' | 'include' | 'exclude'>(
		untrack(() => feed?.carouselContentTypeFilterMode || 'all')
	);
	let currentCarouselContentTypes = $state<string[]>(
		untrack(() => (feed?.carouselContentTypes ? [...feed.carouselContentTypes] : []))
	);
	let currentTagFilterMode = $state<'all' | 'include' | 'exclude'>(
		untrack(
			() =>
				feed?.tagFilterMode ||
				(feed?.includeTags && feed.includeTags.length > 0 ? 'include' : 'all')
		)
	);

	// Blend
	const availableCandidateFeeds = $derived(
		feeds.filter((f) => f.source !== 'blend' && (!feed?.id || f.id !== feed.id))
	);

	let currentBlendFeedA = $state<string>(
		untrack(() => feed?.blendFeedAId || availableCandidateFeeds[0]?.id || '')
	);
	let currentBlendFeedB = $state<string>(
		untrack(() => feed?.blendFeedBId || availableCandidateFeeds[1]?.id || '')
	);
	let currentBlendRatio = $state<number>(untrack(() => feed?.blendRatio ?? 50));

	// RSS
	let currentRssUrls = $state<string[]>(untrack(() => (feed?.rssUrls ? [...feed.rssUrls] : [])));
	let rssUrlInput = $state('');
	let rssInputError = $state('');

	function addRssUrl() {
		rssInputError = '';
		const trimmed = rssUrlInput.trim();
		if (!trimmed) return;
		try {
			const parsed = new URL(trimmed);
			if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
				rssInputError = "L'URL doit commencer par http:// ou https://";
				return;
			}
		} catch {
			rssInputError = 'URL de flux RSS invalide';
			return;
		}

		if (!currentRssUrls.includes(trimmed)) {
			currentRssUrls = [...currentRssUrls, trimmed];
		}
		rssUrlInput = '';
	}

	function removeRssUrl(urlToRemove: string) {
		currentRssUrls = currentRssUrls.filter((u) => u !== urlToRemove);
	}

	const RATIO_PRESETS = [
		{ label: '10 / 90', value: 10 },
		{ label: '30 / 70', value: 30 },
		{ label: '50 / 50', value: 50 },
		{ label: '70 / 30', value: 70 },
		{ label: '90 / 10', value: 90 }
	];

	function getFeedName(id?: string | null): string {
		if (!id) return '';
		return feeds.find((f) => f.id === id)?.name || 'Flux';
	}

	function addTag(raw: string) {
		if (!raw.trim()) return;
		const tokens = raw
			.split(/[\s,]+/)
			.map((t) => t.trim().toLowerCase().replace(/^#+/, '').slice(0, 50))
			.filter((t) => t.length > 0);

		for (const token of tokens) {
			if (!currentTags.includes(token)) {
				currentTags = [...currentTags, token];
			}
		}
		tagInput = '';
	}

	function removeTag(tagToRemove: string) {
		currentTags = currentTags.filter((t) => t !== tagToRemove);
	}

	function toggleTag(tagName: string) {
		const normalized = tagName.trim().toLowerCase().replace(/^#+/, '');
		if (currentTags.includes(normalized)) {
			removeTag(normalized);
		} else {
			addTag(normalized);
		}
	}

	function handleTagKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
			e.preventDefault();
			addTag(tagInput);
		}
	}
</script>

<form
	method="POST"
	action={isEditing ? '?/updateFeed' : '?/createFeed'}
	class="feed-form"
	use:enhance={() => {
		feedActionLoading = true;
		clearMainFeedState();
		return async ({ update }) => {
			await update();
			feedActionLoading = false;
			onSuccess();
		};
	}}
>
	{#if isEditing && feed}
		<input type="hidden" name="feedId" value={feed.id} />
	{/if}
	<input type="hidden" name="includeTags" value={JSON.stringify(currentTags)} />

	<div class="input-group">
		<label for={isEditing ? `feed_name_${feed?.id}` : 'new_feed_name'}>Nom du flux</label>
		<input
			id={isEditing ? `feed_name_${feed?.id}` : 'new_feed_name'}
			type="text"
			name="name"
			value={feed?.name || ''}
			placeholder={isEditing ? undefined : 'Mes abonnements'}
			required
			maxlength="50"
		/>
	</div>

	<div class="input-group">
		<label for={isEditing ? `feed_source_${feed?.id}` : 'new_feed_source'}>Source des posts</label>
		<select
			id={isEditing ? `feed_source_${feed?.id}` : 'new_feed_source'}
			name="source"
			bind:value={currentSource}
		>
			<option value="public">Tout le réseau</option>
			<option value="following">Mes abonnements</option>
			<option value="groups">Groupe(s) d'utilisateurice(s)</option>
			<option value="blend">Fusion de flux</option>
			<option value="rss">Flux RSS externes</option>
		</select>
	</div>

	<!-- SECTION GROUPES -->
	{#if currentSource === 'groups'}
		<div class="groups-checkbox-section">
			<span class="section-subtitle">Sélectionnez les groupes sources :</span>
			{#if groups.length === 0}
				<div class="empty-hint">
					Vous n'avez pas encore créé de groupe. Vous pouvez en créer dans l'onglet « Mes groupes ».
				</div>
			{:else}
				<div class="groups-grid">
					{#each groups as group (group.id)}
						<label class="group-checkbox-item">
							<input
								type="checkbox"
								name="groupIds"
								value={group.id}
								checked={feed?.groupIds?.includes(group.id)}
							/>
							{#if group.icon && group.icon !== 'star'}
								<span class="group-icon-custom"><Icon name={group.icon as IconId} size={16} /></span
								>
							{/if}
							<span class="group-name">{group.name}</span>
						</label>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	<!-- SECTION FUSION DE FLUX (BLEND) -->
	{#if currentSource === 'blend'}
		<div class="blend-section">
			<div class="blend-header">
				<Icon name="media.carousel" size={16} />
				<span>Configuration du mixage (Fusion)</span>
			</div>

			{#if availableCandidateFeeds.length < 2}
				<div class="blend-warning">
					Vous devez avoir au moins 2 flux standards (non fusionnés) pour pouvoir créer une fusion.
				</div>
			{:else}
				<div class="blend-selectors-grid">
					<div class="blend-selector-item">
						<label for={isEditing ? `blend_feed_a_${feed?.id}` : 'new_blend_feed_a'}>Flux A</label>
						<select
							id={isEditing ? `blend_feed_a_${feed?.id}` : 'new_blend_feed_a'}
							name="blendFeedAId"
							bind:value={currentBlendFeedA}
						>
							{#each availableCandidateFeeds as candidate (candidate.id)}
								<option value={candidate.id} disabled={candidate.id === currentBlendFeedB}>
									{candidate.name}
								</option>
							{/each}
						</select>
					</div>

					<div class="blend-selector-item">
						<label for={isEditing ? `blend_feed_b_${feed?.id}` : 'new_blend_feed_b'}>Flux B</label>
						<select
							id={isEditing ? `blend_feed_b_${feed?.id}` : 'new_blend_feed_b'}
							name="blendFeedBId"
							bind:value={currentBlendFeedB}
						>
							{#each availableCandidateFeeds as candidate (candidate.id)}
								<option value={candidate.id} disabled={candidate.id === currentBlendFeedA}>
									{candidate.name}
								</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="blend-ratio-control">
					<div class="blend-ratio-header">
						<span class="ratio-title">Dosage du mix :</span>
						<span class="ratio-indicator">
							{currentBlendRatio}% {getFeedName(currentBlendFeedA) || 'A'} / {100 -
								currentBlendRatio}% {getFeedName(currentBlendFeedB) || 'B'}
						</span>
					</div>

					<div class="ratio-presets">
						{#each RATIO_PRESETS as preset (preset.value)}
							<button
								type="button"
								class="preset-chip"
								class:active={currentBlendRatio === preset.value}
								onclick={() => (currentBlendRatio = preset.value)}
							>
								{preset.label}
							</button>
						{/each}
					</div>

					<input
						type="range"
						name="blendRatio"
						min="10"
						max="90"
						step="5"
						bind:value={currentBlendRatio}
						class="ratio-slider"
					/>

					<div class="blend-visual-bar">
						<div class="bar-part bar-a" style="width: {currentBlendRatio}%">
							{currentBlendRatio}%
						</div>
						<div class="bar-part bar-b" style="width: {100 - currentBlendRatio}%">
							{100 - currentBlendRatio}%
						</div>
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- SECTION FLUX RSS -->
	{#if currentSource === 'rss'}
		<div class="rss-config-section">
			<label for={isEditing ? `rss_url_input_${feed?.id}` : 'new_rss_url_input'}>
				URLs des flux RSS ou Atom externes
			</label>
			<span class="input-hint">
				Ajoutez une ou plusieurs adresses de flux RSS (ex: https://lemonde.fr/rss/une.xml).
			</span>

			<div class="tag-input-row">
				<input
					id={isEditing ? `rss_url_input_${feed?.id}` : 'new_rss_url_input'}
					type="url"
					class="tag-input"
					placeholder="https://exemple.com/feed.xml"
					bind:value={rssUrlInput}
					onkeydown={(e) => {
						if (e.key === 'Enter') {
							e.preventDefault();
							addRssUrl();
						}
					}}
				/>
				<button
					type="button"
					class="btn-add-tag"
					onclick={addRssUrl}
					disabled={!rssUrlInput.trim()}
				>
					Ajouter
				</button>
			</div>

			{#if rssInputError}
				<span class="rss-error-msg">{rssInputError}</span>
			{/if}

			{#if currentRssUrls.length > 0}
				<div class="rss-urls-list">
					{#each currentRssUrls as url (url)}
						<div class="rss-url-item">
							<span class="rss-url-icon"><Icon name="source.rss" size={14} /></span>
							<span class="rss-url-text" title={url}>{url}</span>
							<button
								type="button"
								class="btn-remove-rss"
								onclick={() => removeRssUrl(url)}
								aria-label="Supprimer ce flux RSS"
							>
								<Icon name="action.close" size={12} />
							</button>
						</div>
					{/each}
				</div>
			{/if}

			{#each currentRssUrls as url (url)}
				<input type="hidden" name="rssUrls" value={url} />
			{/each}
		</div>
	{/if}

	<!-- PARAMÈTRES POUR LES FLUX NORMAUX -->
	{#if currentSource !== 'blend' && currentSource !== 'rss'}
		<!-- SECTION FILTRE DE TAGS -->
		<div class="input-group">
			<label for={isEditing ? `tag_filter_mode_${feed?.id}` : 'new_tag_filter_mode'}>
				Filtre par hashtags (#)
			</label>
			<select
				id={isEditing ? `tag_filter_mode_${feed?.id}` : 'new_tag_filter_mode'}
				name="tagFilterMode"
				bind:value={currentTagFilterMode}
			>
				<option value="all">Tous les hashtags (aucun filtre)</option>
				<option value="include">Afficher uniquement avec ces hashtags</option>
				<option value="exclude">Exclure les publications avec ces hashtags</option>
			</select>
		</div>

		{#if currentTagFilterMode !== 'all'}
			<div class="input-group">
				<label for={isEditing ? `tag_input_${feed?.id}` : 'new_tag_input'}>
					Hashtags cibles ({currentTagFilterMode === 'include' ? 'inclus' : 'exclus'})
				</label>
				<span class="input-hint">
					Tapez un tag et appuyez sur Entrée, virgule ou espace pour l'ajouter.
				</span>

				<div class="tag-input-row">
					<input
						id={isEditing ? `tag_input_${feed?.id}` : 'new_tag_input'}
						type="text"
						class="tag-input"
						placeholder=""
						bind:value={tagInput}
						onkeydown={handleTagKeydown}
					/>
					<button
						type="button"
						class="btn-add-tag"
						onclick={() => addTag(tagInput)}
						disabled={!tagInput.trim()}
					>
						Ajouter
					</button>
				</div>

				{#if currentTags.length > 0}
					<div class="active-tags-list">
						{#each currentTags as tag (tag)}
							<span class="active-tag-chip">
								#{tag}
								<button
									type="button"
									class="btn-remove-tag"
									onclick={() => removeTag(tag)}
									aria-label="Supprimer le tag {tag}"
								>
									✕
								</button>
							</span>
						{/each}
					</div>
				{/if}

				{#if trendingTags.length > 0}
					<TrendingTagsBar tags={trendingTags} selectedTags={currentTags} onTagClick={toggleTag} />
				{/if}
			</div>
		{/if}

		<!-- SECTION TRI & FENÊTRE TEMPORELLE -->
		<div class="input-group">
			<label for={isEditing ? `sort_mode_${feed?.id}` : 'new_sort_mode'}>Tri des posts</label>
			<select
				id={isEditing ? `sort_mode_${feed?.id}` : 'new_sort_mode'}
				name="sortMode"
				bind:value={currentSortMode}
			>
				<option value="chrono">Chronologique (Plus récents)</option>
				<option value="oldest">Chronologique inversé (Plus anciens)</option>
				<option value="trending">Tendance (Score d'engagement)</option>
				<option value="discussed">Les plus discutés (Commentaires)</option>
				<option value="random">Aléatoire (Découverte)</option>
			</select>
		</div>

		{#if currentSortMode !== 'chrono'}
			<div class="input-group">
				<label for={isEditing ? `time_window_${feed?.id}` : 'new_time_window'}>
					Période considérée
				</label>
				<select
					id={isEditing ? `time_window_${feed?.id}` : 'new_time_window'}
					name="timeWindow"
					value={feed?.timeWindow || '7d'}
				>
					<option value="24h">Dernières 24 heures</option>
					<option value="7d">7 derniers jours</option>
					<option value="30d">30 derniers jours</option>
					<option value="all">Tout les temps</option>
				</select>
			</div>
		{/if}

		<!-- FILTRAGE PAR TYPE DE CONTENU -->
		<div class="input-group">
			<label for={isEditing ? `content_type_mode_${feed?.id}` : 'new_content_type_mode'}>
				Filtre par type de contenu
			</label>
			<select
				id={isEditing ? `content_type_mode_${feed?.id}` : 'new_content_type_mode'}
				name="contentTypeFilterMode"
				bind:value={currentContentTypeFilterMode}
			>
				<option value="all">Tous les types de contenus</option>
				<option value="include">Afficher uniquement les types sélectionnés</option>
				<option value="exclude">Exclure les types sélectionnés</option>
			</select>
		</div>

		{#if currentContentTypeFilterMode !== 'all'}
			<div class="groups-checkbox-section">
				<span class="section-subtitle">
					Types de posts {currentContentTypeFilterMode === 'include' ? 'à inclure' : 'à exclure'} :
				</span>
				<div class="groups-grid">
					{#each AVAILABLE_CONTENT_TYPES as ctype (ctype.id)}
						<div class="content-type-item-block">
							<label class="group-checkbox-item">
								<input
									type="checkbox"
									name="contentTypes"
									value={ctype.id}
									checked={currentContentTypes.includes(ctype.id)}
									onchange={(e: Event) => {
										const checked = (e.target as HTMLInputElement).checked;
										if (checked) {
											currentContentTypes = [...currentContentTypes, ctype.id];
										} else {
											currentContentTypes = currentContentTypes.filter((t) => t !== ctype.id);
										}
									}}
								/>
								<span class="group-name">{ctype.label}</span>
							</label>

							{#if ctype.id === 'carousel' && ((currentContentTypeFilterMode === 'include' && currentContentTypes.includes('carousel')) || currentContentTypeFilterMode === 'exclude')}
								<div class="carousel-subfilter-section">
									<label for={isEditing ? `carousel_sub_${feed?.id}` : 'new_carousel_sub'}>
										Sous-filtrer les carrousels par contenu interne :
									</label>
									<select
										id={isEditing ? `carousel_sub_${feed?.id}` : 'new_carousel_sub'}
										name="carouselContentTypeFilterMode"
										bind:value={currentCarouselContentTypeFilterMode}
									>
										<option value="all">Tous les carrousels</option>
										<option value="include">Carrousels contenant au moins un...</option>
										<option value="exclude">Carrousels ne contenant aucun...</option>
									</select>

									{#if currentCarouselContentTypeFilterMode !== 'all'}
										<div class="groups-grid" style="margin-top: 6px;">
											{#each CAROUSEL_CHILD_TYPES as childType (childType.id)}
												<label class="group-checkbox-item">
													<input
														type="checkbox"
														name="carouselContentTypes"
														value={childType.id}
														checked={currentCarouselContentTypes.includes(childType.id)}
														onchange={(e: Event) => {
															const checked = (e.target as HTMLInputElement).checked;
															if (checked) {
																currentCarouselContentTypes = [
																	...currentCarouselContentTypes,
																	childType.id
																];
															} else {
																currentCarouselContentTypes = currentCarouselContentTypes.filter(
																	(t) => t !== childType.id
																);
															}
														}}
													/>
													<span class="group-name">{childType.label}</span>
												</label>
											{/each}
										</div>
									{/if}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- EXCLUSION DE GROUPES -->
		{#if groups.length > 0}
			<div class="groups-checkbox-section">
				<span class="section-subtitle">Exclure des groupes :</span>
				<span class="input-hint" style="margin-bottom: 8px;">
					Ne pas afficher les publications des membres de ces groupes.
				</span>
				<div class="groups-grid">
					{#each groups as group (group.id)}
						<label class="group-checkbox-item">
							<input
								type="checkbox"
								name="excludedGroupIds"
								value={group.id}
								checked={currentExcludedGroups.includes(group.id)}
								onchange={(e: Event) => {
									const checked = (e.target as HTMLInputElement).checked;
									if (checked) {
										currentExcludedGroups = [...currentExcludedGroups, group.id];
									} else {
										currentExcludedGroups = currentExcludedGroups.filter((g) => g !== group.id);
									}
								}}
							/>
							{#if group.icon && group.icon !== 'star'}
								<span class="group-icon-custom"><Icon name={group.icon as IconId} size={16} /></span
								>
							{/if}
							<span class="group-name">{group.name}</span>
						</label>
					{/each}
				</div>
			</div>
		{/if}
	{/if}

	{#if currentSource !== 'rss'}
		<div class="checkbox-group">
			<input
				type="checkbox"
				id={isEditing ? `hideSeen_${feed?.id}` : 'new_hideSeen'}
				name="hideSeen"
				value="true"
				checked={feed?.hideSeen}
			/>
			<label for={isEditing ? `hideSeen_${feed?.id}` : 'new_hideSeen'}
				>Masquer les posts déjà vus</label
			>
		</div>

		<div class="checkbox-group">
			<input
				type="checkbox"
				id={isEditing ? `showStories_${feed?.id}` : 'new_showStories'}
				name="showStories"
				value="true"
				checked={feed ? feed.showStories !== false : true}
			/>
			<label for={isEditing ? `showStories_${feed?.id}` : 'new_showStories'}>
				Afficher les stories sur ce flux
			</label>
		</div>
	{/if}

	<div class="form-actions">
		<SettingsButton type="submit" disabled={feedActionLoading}>
			{isEditing ? 'Enregistrer' : 'Créer'}
		</SettingsButton>
		<SettingsButton variant="secondary" onclick={onCancel}>Annuler</SettingsButton>
	</div>
</form>

<style>
	.feed-form {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.input-group label {
		display: block;
		margin-bottom: 6px;
		font-weight: bold;
		font-size: 0.9rem;
		color: #1a1a1a;
	}
	.input-group input[type='text'],
	.input-group select {
		width: 100%;
		padding: 10px;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		font-size: 1rem;
		background: white;
	}
	.input-hint {
		font-size: 0.8rem;
		color: #64748b;
		margin-top: 4px;
		display: block;
	}

	/* SECTION TAGS */
	.tag-input-row {
		display: flex;
		gap: 8px;
		align-items: center;
	}
	.tag-input {
		flex: 1;
		padding: 9px 14px;
		border: 1px solid #cbd5e1;
		border-radius: 20px !important;
		font-size: 0.9rem;
		background: #ffffff;
		outline: none;
		transition: border-color 0.15s;
	}
	.tag-input:focus {
		border-color: var(--primary, #0ea5e9);
	}
	.btn-add-tag {
		padding: 9px 16px;
		background: var(--primary, #0ea5e9);
		color: #ffffff;
		border: none;
		border-radius: 20px;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s;
		white-space: nowrap;
	}
	.btn-add-tag:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.btn-add-tag:not(:disabled):hover {
		background: #0284c7;
	}
	.active-tags-list {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		padding: 6px 0;
	}
	.active-tag-chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		border-radius: 14px;
		background: #e0f2fe;
		color: #0369a1;
		font-size: 0.85rem;
		font-weight: 600;
	}
	.btn-remove-tag {
		background: none;
		border: none;
		color: #0284c7;
		font-size: 0.75rem;
		cursor: pointer;
		padding: 0 2px;
		line-height: 1;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.btn-remove-tag:hover {
		color: #ef4444;
	}

	/* SECTION FUSION / BLEND */
	.blend-section {
		background: #faf5ff;
		border: 1px solid #e9d5ff;
		border-radius: 10px;
		padding: 14px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.blend-header {
		display: flex;
		align-items: center;
		gap: 8px;
		font-weight: 700;
		font-size: 0.95rem;
		color: #6b21a8;
	}
	.blend-warning {
		background: #fffbeb;
		border: 1px solid #fde68a;
		color: #92400e;
		padding: 10px;
		border-radius: 8px;
		font-size: 0.85rem;
	}
	.blend-selectors-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}
	.blend-selector-item label {
		display: block;
		font-size: 0.85rem;
		font-weight: 600;
		color: #4b5563;
		margin-bottom: 4px;
	}
	.blend-ratio-control {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.blend-ratio-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.85rem;
	}
	.ratio-title {
		font-weight: 600;
		color: #374151;
	}
	.ratio-indicator {
		font-weight: 700;
		color: #7e22ce;
	}
	.ratio-presets {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
	}
	.preset-chip {
		background: white;
		border: 1px solid #d8b4fe;
		border-radius: 12px;
		padding: 3px 10px;
		font-size: 0.8rem;
		font-weight: 600;
		color: #6b21a8;
		cursor: pointer;
		transition: all 0.15s ease;
	}
	.preset-chip:hover {
		background: #f3e8ff;
	}
	.preset-chip.active {
		background: #9333ea;
		color: white;
		border-color: #9333ea;
	}
	.ratio-slider {
		width: 100%;
		accent-color: #9333ea;
		cursor: pointer;
	}
	.blend-visual-bar {
		display: flex;
		height: 22px;
		border-radius: 11px;
		overflow: hidden;
		background: #e9d5ff;
		box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
	}
	.bar-part {
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		font-size: 0.75rem;
		font-weight: 700;
		transition: width 0.2s ease;
	}
	.bar-a {
		background: #9333ea;
	}
	.bar-b {
		background: #0ea5e9;
	}

	/* SECTION CARROUSELS */
	.content-type-item-block {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.carousel-subfilter-section {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-left: 3px solid var(--primary, #0ea5e9);
		border-radius: 8px;
		padding: 10px 14px;
		margin-left: 24px;
		margin-top: 4px;
		margin-bottom: 6px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.carousel-subfilter-section label {
		font-weight: 600;
		font-size: 0.85rem;
		color: #334155;
		display: block;
		margin-bottom: 2px;
	}

	.carousel-subfilter-section select {
		width: 100%;
		padding: 9px 12px;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		font-size: 0.95rem;
		background: white;
		color: #1e293b;
		outline: none;
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease;
		cursor: pointer;
	}

	.carousel-subfilter-section select:focus {
		border-color: var(--primary, #0ea5e9);
		box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.15);
	}

	/* SECTION GROUPES */
	.groups-checkbox-section {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		padding: 12px;
	}
	.section-subtitle {
		font-weight: 600;
		font-size: 0.85rem;
		color: #334155;
		display: block;
		margin-bottom: 8px;
	}
	.groups-grid {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.group-checkbox-item {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.9rem;
		color: #1e293b;
		cursor: pointer;
	}
	.group-icon-custom {
		display: flex;
		align-items: center;
		color: #64748b;
	}
	.empty-hint {
		font-size: 0.85rem;
		color: #94a3b8;
		font-style: italic;
	}

	.checkbox-group {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.95rem;
	}

	.form-actions {
		display: flex;
		gap: 12px;
		margin-top: 8px;
	}
	.form-actions :global(> *) {
		flex: 1;
	}

	/* SECTION RSS */
	.rss-config-section {
		display: flex;
		flex-direction: column;
		gap: 8px;
		background: #fff7ed;
		border: 1px solid #ffedd5;
		border-radius: 8px;
		padding: 12px;
	}
	.rss-config-section label {
		font-weight: bold;
		font-size: 0.9rem;
		color: #9a3412;
		margin-bottom: 2px;
	}
	.rss-error-msg {
		color: #dc2626;
		font-size: 0.8rem;
		font-weight: 500;
	}
	.rss-urls-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin-top: 4px;
	}
	.rss-url-item {
		display: flex;
		align-items: center;
		gap: 8px;
		background: #ffffff;
		border: 1px solid #fed7aa;
		border-radius: 6px;
		padding: 6px 10px;
		font-size: 0.85rem;
	}
	.rss-url-icon {
		color: #ea580c;
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}
	.rss-url-text {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: #1e293b;
		font-family: monospace;
		font-size: 0.8rem;
	}
	.btn-remove-rss {
		background: none;
		border: none;
		color: #94a3b8;
		cursor: pointer;
		padding: 2px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		transition:
			color 0.15s,
			background 0.15s;
	}
	.btn-remove-rss:hover {
		color: #ef4444;
		background: #fee2e2;
	}
</style>
