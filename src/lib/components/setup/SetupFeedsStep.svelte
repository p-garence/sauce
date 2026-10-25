<!--
  @component SetupFeedsStep
  @domain setup
  @description Étape 3 de l'onboarding : personnalisation et gestion des flux d'actualité.
  @responsibilities
    - Afficher la liste des flux configurés par l'utilisateur avec leurs badges résumés
    - Basculer en mode création (+ Nouveau flux) ou édition d'un flux existant
    - Intégrer les formulaires de configuration FeedConfigForm et les cartes FeedItemCard
    - Naviguer entre les étapes précédentes et suivantes
-->
<script lang="ts">
	import FeedItemCard from '$lib/components/settings/feeds/FeedItemCard.svelte';
	import FeedConfigForm from '$lib/components/settings/feeds/FeedConfigForm.svelte';
	import type { UserFeed, UserGroup } from '$lib/types';

	/**
	 * Propriétés du composant SetupFeedsStep
	 */
	interface Props {
		/** Liste des flux actuels de l'utilisateur */
		feeds: UserFeed[];
		/** Groupes de visibilité pour filtrer les sources par groupe */
		groups?: UserGroup[];
		/** Hashtags tendances suggérés */
		trendingTags?: { name: string; count?: number }[];
		/** Message d'erreur éventuel retourné par l'action de création/édition */
		feedError?: string | null;
		/** Callback pour revenir à l'étape précédente */
		onPrev: () => void;
		/** Callback pour passer à l'étape suivante */
		onNext: () => void;
	}

	let { feeds, groups = [], trendingTags = [], feedError = null, onPrev, onNext }: Props = $props();

	let editingFeedId = $state<string | null>(null);
</script>

<div class="step-content">
	<h2 class="title">Gérer vos flux</h2>
	<p class="subtitle">
		Ici, aucun algorithme ne décide à votre place. Vous personnalisez vos propres flux : choisissez
		les sources, les tags thématiques ou les critères de tri selon vos envies.
	</p>

	{#if feedError}
		<div class="alert-box error">{feedError}</div>
	{/if}

	<div class="feeds-container">
		{#if editingFeedId === 'new'}
			<div class="feed-form-wrapper">
				<h3 class="form-title">Nouveau flux</h3>
				<FeedConfigForm
					feed={null}
					{feeds}
					{groups}
					{trendingTags}
					onCancel={() => (editingFeedId = null)}
					onSuccess={() => (editingFeedId = null)}
				/>
			</div>
		{:else if editingFeedId}
			{@const currentEditingFeed = feeds.find((f) => f.id === editingFeedId)}
			{#if currentEditingFeed}
				<div class="feed-form-wrapper">
					<h3 class="form-title">Modifier le flux</h3>
					<FeedConfigForm
						feed={currentEditingFeed}
						{feeds}
						{groups}
						{trendingTags}
						onCancel={() => (editingFeedId = null)}
						onSuccess={() => (editingFeedId = null)}
					/>
				</div>
			{/if}
		{:else}
			<div class="feeds-list">
				{#each feeds as feed (feed.id)}
					<FeedItemCard
						{feed}
						{feeds}
						{groups}
						canDelete={feeds.length > 1}
						onEdit={() => (editingFeedId = feed.id)}
					/>
				{/each}
			</div>

			<button type="button" class="btn-add-feed" onclick={() => (editingFeedId = 'new')}>
				+ Créer un nouveau flux
			</button>
		{/if}
	</div>

	{#if !editingFeedId}
		<div class="actions space-between">
			<button type="button" class="btn-secondary" onclick={onPrev}>Retour</button>
			<button type="button" class="btn-primary" onclick={onNext}>Suivant</button>
		</div>
	{/if}
</div>

<style>
	.step-content {
		padding: 32px 24px;
		animation: fadeIn 0.3s ease;
	}

	.title {
		margin: 0 0 8px 0;
		font-size: 1.25rem;
		font-weight: 600;
	}
	.subtitle {
		margin: 0 0 24px 0;
		font-size: 0.9rem;
		color: #6b7280;
		line-height: 1.45;
	}

	.feeds-container {
		display: flex;
		flex-direction: column;
		gap: 16px;
		margin-bottom: 24px;
	}
	.feeds-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.btn-add-feed {
		width: 100%;
		padding: 12px;
		background: #f0f9ff;
		color: #0284c7;
		border: 1.5px dashed #bae6fd;
		border-radius: 8px;
		font-weight: 600;
		font-size: 0.9rem;
		cursor: pointer;
		transition: all 0.2s;
	}
	.btn-add-feed:hover {
		background: #e0f2fe;
		border-color: #7dd3fc;
	}
	.feed-form-wrapper {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		padding: 16px;
	}
	.form-title {
		margin: 0 0 16px 0;
		font-size: 1.05rem;
		font-weight: 600;
		color: #0f172a;
	}

	.actions {
		display: flex;
		align-items: center;
		margin-top: 24px;
	}
	.actions.space-between {
		justify-content: space-between;
	}

	button {
		font-family: inherit;
		font-size: 0.9rem;
		font-weight: 500;
		cursor: pointer;
		padding: 10px 16px;
		border-radius: 6px;
		transition: all 0.2s;
	}

	.btn-primary {
		background: #111827;
		color: white;
		border: 1px solid #111827;
	}
	.btn-primary:hover {
		background: #374151;
	}

	.btn-secondary {
		background: #ffffff;
		color: #374151;
		border: 1px solid #d1d5db;
	}
	.btn-secondary:hover {
		background: #f9fafb;
	}

	.alert-box {
		padding: 12px;
		border-radius: 6px;
		margin-bottom: 16px;
		font-size: 0.85rem;
		text-align: center;
		border: 1px solid transparent;
	}
	.alert-box.error {
		background: #fef2f2;
		color: #991b1b;
		border-color: #fecaca;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(5px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
