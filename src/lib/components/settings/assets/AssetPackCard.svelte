<!--
  @component AssetPackCard
  @domain settings/assets
  @description Carte de présentation d'un pack d'icônes ou d'une collection d'émojis avec aperçu et actions adaptées.
  @responsibilities
    - Afficher le nom, la description et le nombre d'éléments
    - Rendre une prévisualisation miniature des premiers éléments
    - Afficher les badges d'état (Actif, En cours d'édition, Publié)
    - Proposer les boutons d'action (Activer/Désactiver, Éditer, Publier, Supprimer ou Retirer des favoris)
-->
<script lang="ts">
	/**
	 * Propriétés du composant AssetPackCard
	 */
	interface Props {
		/** Identifiant unique du pack ou de la collection */
		id: string;
		/** Nom du pack */
		name: string;
		/** Description optionnelle */
		description?: string | null;
		/** Nombre total d'éléments dans le pack */
		itemCount: number;
		/** Libellé de l'élément (ex: "icône", "émoji") */
		itemLabel?: string;
		/** URLs des vignettes de prévisualisation */
		previews?: string[];
		/** Le pack est-il actuellement actif dans le profil utilisateur ? */
		isActive?: boolean;
		/** Le pack est-il actuellement chargé dans l'éditeur ? */
		isEditing?: boolean;
		/** Le pack a-t-il été publié publiquement ? */
		isPublished?: boolean;
		/** L'utilisateur est-il le créateur/propriétaire ? */
		isOwned?: boolean;
		/** Callback pour activer le pack */
		onActivate?: () => void;
		/** Callback pour désactiver le pack */
		onDeactivate?: () => void;
		/** Callback pour charger le pack dans l'éditeur */
		onEdit?: () => void;
		/** Callback pour publier le pack sur le feed public */
		onPublish?: () => void;
		/** Callback pour supprimer définitivement le pack (propriétaire) */
		onDelete?: () => void;
		/** Callback pour retirer le pack sauvegardé de sa bibliothèque */
		onRemoveSaved?: () => void;
	}

	let {
		id,
		name,
		description,
		itemCount,
		itemLabel = 'élément',
		previews = [],
		isActive = false,
		isEditing = false,
		isPublished = false,
		isOwned = true,
		onActivate,
		onDeactivate,
		onEdit,
		onPublish,
		onDelete,
		onRemoveSaved
	}: Props = $props();
</script>

<div class="pack-card" data-pack-id={id} class:is-active={isActive} class:is-editing={isEditing}>
	<div class="pack-card-header">
		<div>
			<strong class="pack-title">{name}</strong>
			{#if isActive}
				<span class="active-badge">Actif</span>
			{/if}
			{#if isEditing}
				<span class="editing-badge">En cours d'édition</span>
			{/if}
			{#if isPublished}
				<span class="published-badge">Publié</span>
			{/if}
		</div>
		<span class="pack-meta">
			{itemCount}
			{itemLabel}{itemCount > 1 ? 's' : ''}
		</span>
	</div>

	{#if description}
		<p class="pack-description">{description}</p>
	{/if}

	{#if previews.length > 0}
		<div class="pack-mini-preview">
			{#each previews.slice(0, 10) as previewUrl, idx (`${previewUrl}_${idx}`)}
				<img src={previewUrl} alt="Aperçu" class="mini-asset-img" />
			{/each}
			{#if itemCount > 10}
				<span class="more-indicator">+{itemCount - 10}</span>
			{/if}
		</div>
	{/if}

	<div class="pack-actions">
		{#if isActive && onDeactivate}
			<button type="button" class="btn-pack-secondary" onclick={onDeactivate}> Désactiver </button>
		{:else if !isActive && onActivate}
			<button type="button" class="btn-pack-primary" onclick={onActivate}> Activer </button>
		{/if}

		{#if isOwned && onEdit}
			<button type="button" class="btn-pack-edit" class:editing={isEditing} onclick={onEdit}>
				{isEditing ? 'Édition en cours' : 'Éditer'}
			</button>
		{/if}

		{#if isOwned && onPublish}
			<button type="button" class="btn-pack-publish" onclick={onPublish}> Publier </button>
		{/if}

		{#if isOwned && onDelete}
			<button type="button" class="btn-pack-delete" onclick={onDelete}> Supprimer </button>
		{/if}

		{#if !isOwned && onRemoveSaved}
			<button type="button" class="btn-pack-delete" onclick={onRemoveSaved}>
				Retirer de la bibliothèque
			</button>
		{/if}
	</div>
</div>

<style>
	.pack-card {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		padding: 14px 16px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease;
	}

	.pack-card.is-active {
		border-color: #0ea5e9;
		background: #f0f9ff;
		box-shadow: 0 2px 8px rgba(14, 165, 233, 0.1);
	}

	.pack-card.is-editing {
		border-color: #f59e0b;
	}

	.pack-card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 8px;
	}

	.pack-title {
		font-size: 1rem;
		font-weight: 600;
		color: #0f172a;
		margin-right: 8px;
	}

	.pack-meta {
		font-size: 0.8rem;
		color: #64748b;
	}

	.active-badge {
		font-size: 0.7rem;
		font-weight: 600;
		background: #0ea5e9;
		color: #ffffff;
		padding: 2px 8px;
		border-radius: 12px;
	}

	.editing-badge {
		font-size: 0.7rem;
		font-weight: 600;
		background: #f59e0b;
		color: #ffffff;
		padding: 2px 8px;
		border-radius: 12px;
	}

	.published-badge {
		font-size: 0.7rem;
		font-weight: 600;
		background: #10b981;
		color: #ffffff;
		padding: 2px 8px;
		border-radius: 12px;
	}

	.pack-description {
		margin: 0;
		font-size: 0.85rem;
		color: #475569;
		line-height: 1.4;
	}

	.pack-mini-preview {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
		padding: 4px 0;
	}

	.mini-asset-img {
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

	.pack-actions {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		margin-top: 4px;
	}

	.btn-pack-primary,
	.btn-pack-secondary,
	.btn-pack-edit,
	.btn-pack-publish,
	.btn-pack-delete {
		padding: 5px 12px;
		border-radius: 6px;
		font-size: 0.8rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
		border: 1px solid transparent;
	}

	.btn-pack-primary {
		background: #0ea5e9;
		color: #ffffff;
	}
	.btn-pack-primary:hover {
		background: #0284c7;
	}

	.btn-pack-secondary {
		background: #e2e8f0;
		color: #334155;
	}
	.btn-pack-secondary:hover {
		background: #cbd5e1;
	}

	.btn-pack-edit {
		background: #ffffff;
		border-color: #cbd5e1;
		color: #334155;
	}
	.btn-pack-edit:hover {
		background: #f1f5f9;
	}
	.btn-pack-edit.editing {
		border-color: #f59e0b;
		color: #b45309;
		background: #fffbeb;
	}

	.btn-pack-publish {
		background: #ecfdf5;
		border-color: #a7f3d0;
		color: #047857;
	}
	.btn-pack-publish:hover {
		background: #d1fae5;
	}

	.btn-pack-delete {
		background: #ffffff;
		border-color: #fecaca;
		color: #dc2626;
	}
	.btn-pack-delete:hover {
		background: #fee2e2;
	}
</style>
