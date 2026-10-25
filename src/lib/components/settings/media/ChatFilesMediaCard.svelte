<!--
  @component ChatFilesMediaCard
  @domain settings/media
  @description Carte de gestion des fichiers partagés dans la messagerie avec filtrage par type et suppression.
  @responsibilities
    - Filtrer les fichiers de messagerie par catégorie (tous, photos, vidéos, fichiers, vocaux)
    - Trier par date d'envoi ou taille
    - Permettre le téléchargement ou l'accès direct au salon de discussion
    - Proposer la suppression définitive des pièces jointes
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import SettingsCard from '$lib/components/settings/ui/SettingsCard.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { formatBytes } from '$lib/utils/format';
	import type { UserMediaMessageItem } from '$lib/server/media';

	/**
	 * Propriétés du composant ChatFilesMediaCard
	 */
	interface Props {
		/** Liste des fichiers multimédias de discussion */
		chatFiles: UserMediaMessageItem[];
		/** Identifiant du message dont la pièce jointe est en cours de suppression */
		deletingMessageId: string | null;
		/** Callback déclenché pour supprimer un fichier de messagerie */
		onDeleteChatFile: (messageId: string) => Promise<void> | void;
	}

	let {
		chatFiles,
		deletingMessageId,
		onDeleteChatFile
	}: Props = $props();

	let chatFileFilter = $state<'all' | 'image' | 'video' | 'file' | 'audio'>('all');
	let chatFileSortBy = $state<'date_desc' | 'date_asc' | 'size_desc' | 'size_asc'>('date_desc');
	let chatFilesLimit = $state(4);

	function formatDate(d: Date | string): string {
		const date = new Date(d);
		return date.toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	const filteredChatFiles = $derived.by(() => {
		let list = [...chatFiles];
		if (chatFileFilter !== 'all') {
			list = list.filter((m) => m.mediaType === chatFileFilter);
		}

		if (chatFileSortBy === 'size_desc') {
			return list.sort((a, b) => b.totalSizeBytes - a.totalSizeBytes);
		} else if (chatFileSortBy === 'size_asc') {
			return list.sort((a, b) => a.totalSizeBytes - b.totalSizeBytes);
		} else if (chatFileSortBy === 'date_desc') {
			return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
		} else if (chatFileSortBy === 'date_asc') {
			return list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
		}
		return list;
	});

	const visibleChatFiles = $derived(filteredChatFiles.slice(0, chatFilesLimit));
</script>

<SettingsCard
	title="Fichiers de messagerie"
	description="Consultez et gérez vos photos, vidéos et documents partagés dans vos conversations."
>
	<div class="posts-controls">
		<div class="stories-tabs">
			<button
				type="button"
				class="filter-chip"
				class:active={chatFileFilter === 'all'}
				onclick={() => (chatFileFilter = 'all')}
			>
				Tous ({chatFiles.length})
			</button>
			<button
				type="button"
				class="filter-chip"
				class:active={chatFileFilter === 'image'}
				onclick={() => (chatFileFilter = 'image')}
			>
				<Icon name="media.image" size={13} /> Photos ({chatFiles.filter(
					(m) => m.mediaType === 'image'
				).length})
			</button>
			<button
				type="button"
				class="filter-chip"
				class:active={chatFileFilter === 'video'}
				onclick={() => (chatFileFilter = 'video')}
			>
				<Icon name="media.video" size={13} /> Vidéos ({chatFiles.filter(
					(m) => m.mediaType === 'video'
				).length})
			</button>
			<button
				type="button"
				class="filter-chip"
				class:active={chatFileFilter === 'file'}
				onclick={() => (chatFileFilter = 'file')}
			>
				<Icon name="action.attachment" size={13} /> Fichiers ({chatFiles.filter(
					(m) => m.mediaType === 'file'
				).length})
			</button>
			<button
				type="button"
				class="filter-chip"
				class:active={chatFileFilter === 'audio'}
				onclick={() => (chatFileFilter = 'audio')}
			>
				<Icon name="action.mic" size={13} /> Vocaux ({chatFiles.filter(
					(m) => m.mediaType === 'audio'
				).length})
			</button>
		</div>

		<div class="sort-selector">
			<label for="chat-file-sort">Trier par :</label>
			<select id="chat-file-sort" bind:value={chatFileSortBy}>
				<option value="date_desc">Plus récent d'abord</option>
				<option value="date_asc">Plus ancien d'abord</option>
				<option value="size_desc">Plus lourd d'abord</option>
				<option value="size_asc">Plus léger d'abord</option>
			</select>
		</div>
	</div>

	{#if filteredChatFiles.length === 0}
		<div class="empty-state">
			<p>Aucun fichier envoyé dans vos conversations.</p>
		</div>
	{:else}
		<div class="media-chat-files-list">
			{#each visibleChatFiles as file (file.id)}
				<div class="media-chat-item">
					<div class="chat-item-thumb">
						{#if file.mediaType === 'image'}
							<img src={file.mediaUrl} alt={file.mediaName || 'Photo'} loading="lazy" />
						{:else if file.mediaType === 'video'}
							<video src={file.mediaUrl} preload="metadata" muted></video>
							<span class="thumb-badge">▶</span>
						{:else if file.mediaType === 'audio'}
							<div class="file-icon-box">
								<Icon name="action.mic" size={22} />
							</div>
						{:else}
							<div class="file-icon-box">
								<Icon name="action.attachment" size={22} />
							</div>
						{/if}
					</div>

					<div class="chat-item-info">
						<div class="chat-item-top">
							<span class="chat-item-name" title={file.mediaName || 'Fichier'}>
								{file.mediaName || 'Fichier'}
							</span>
							<span class="chat-item-size">{formatBytes(file.totalSizeBytes)}</span>
						</div>
						<div class="chat-item-sub">
							<span class="chat-item-conv">Discussion : <strong>{file.chatTitle}</strong></span>
							<span class="chat-item-date">{formatDate(file.createdAt)}</span>
						</div>
						{#if file.content}
							<p class="chat-item-caption">« {file.content} »</p>
						{/if}
					</div>

					<div class="chat-item-actions">
						<a
							href={file.mediaUrl}
							target="_blank"
							rel="noopener noreferrer external"
							download={file.mediaName || undefined}
							class="btn-chat-action btn-chat-view"
							title="Télécharger / Visualiser"
						>
							<Icon name="action.attachment" size={15} />
						</a>
						<a
							href={resolve(`/chat/${file.chatId}`)}
							class="btn-chat-action btn-chat-goto"
							title="Aller à la discussion"
						>
							Discussion ↗
						</a>
						<button
							type="button"
							class="btn-chat-action btn-chat-delete"
							disabled={deletingMessageId === file.id}
							onclick={() => onDeleteChatFile(file.id)}
							title="Supprimer définitivement"
						>
							{#if deletingMessageId === file.id}
								...
							{:else}
								Supprimer
							{/if}
						</button>
					</div>
				</div>
			{/each}
		</div>

		{#if filteredChatFiles.length > chatFilesLimit}
			<div class="pagination-footer">
				<button type="button" class="btn-show-more" onclick={() => (chatFilesLimit += 4)}>
					Afficher plus ({filteredChatFiles.length - chatFilesLimit} restant{filteredChatFiles.length -
						chatFilesLimit >
					1
						? 's'
						: ''})
				</button>
			</div>
		{:else if chatFilesLimit > 4 && filteredChatFiles.length > 4}
			<div class="pagination-footer">
				<button type="button" class="btn-show-less" onclick={() => (chatFilesLimit = 4)}>
					Réduire
				</button>
			</div>
		{/if}
	{/if}
</SettingsCard>

<style>
	.posts-controls {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 16px;
		flex-wrap: wrap;
		gap: 12px;
	}

	.stories-tabs {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	.filter-chip {
		padding: 5px 12px;
		border-radius: 20px;
		border: 1px solid #d1d5db;
		background: white;
		color: #4b5563;
		font-size: 0.85rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.filter-chip:hover {
		background: #f3f4f6;
		color: #111827;
	}

	.filter-chip.active {
		background: #0ea5e9;
		color: white;
		border-color: #0ea5e9;
	}

	.sort-selector {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.85rem;
		color: #4b5563;
	}

	.sort-selector select {
		padding: 6px 10px;
		border-radius: 6px;
		border: 1px solid #d1d5db;
		background: white;
		font-size: 0.85rem;
		color: #1f2937;
		cursor: pointer;
	}

	.empty-state {
		padding: 32px 16px;
		text-align: center;
		color: #6b7280;
		font-size: 0.95rem;
	}

	.media-chat-files-list {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.media-chat-item {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 12px;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		transition: background-color 0.15s;
	}

	.media-chat-item:hover {
		background: #f1f5f9;
	}

	.chat-item-thumb {
		position: relative;
		width: 52px;
		height: 52px;
		border-radius: 8px;
		overflow: hidden;
		flex-shrink: 0;
		background: #e2e8f0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.chat-item-thumb img,
	.chat-item-thumb video {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.thumb-badge {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.35);
		color: #fff;
		font-size: 0.8rem;
	}

	.file-icon-box {
		color: #64748b;
	}

	.chat-item-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.chat-item-top {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 8px;
	}

	.chat-item-name {
		font-weight: 600;
		font-size: 0.92rem;
		color: #1e293b;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.chat-item-size {
		font-size: 0.78rem;
		color: #64748b;
		font-weight: 500;
		flex-shrink: 0;
	}

	.chat-item-sub {
		display: flex;
		justify-content: space-between;
		font-size: 0.76rem;
		color: #64748b;
		gap: 8px;
	}

	.chat-item-conv {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.chat-item-date {
		flex-shrink: 0;
	}

	.chat-item-caption {
		margin: 2px 0 0 0;
		font-size: 0.8rem;
		color: #475569;
		font-style: italic;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.chat-item-actions {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-shrink: 0;
	}

	.btn-chat-action {
		padding: 6px 10px;
		border-radius: 8px;
		font-size: 0.78rem;
		font-weight: 500;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		border: 1px solid transparent;
		transition: all 0.15s;
	}

	.btn-chat-view {
		background: #ffffff;
		border-color: #cbd5e1;
		color: #475569;
	}

	.btn-chat-view:hover {
		background: #f1f5f9;
		color: #0ea5e9;
	}

	.btn-chat-goto {
		background: #ffffff;
		border-color: #cbd5e1;
		color: #475569;
	}

	.btn-chat-goto:hover {
		background: #f1f5f9;
		color: #0ea5e9;
	}

	.btn-chat-delete {
		background: #fef2f2;
		border-color: #fecaca;
		color: #dc2626;
	}

	.btn-chat-delete:hover:not(:disabled) {
		background: #fee2e2;
	}

	.btn-chat-delete:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.pagination-footer {
		display: flex;
		justify-content: center;
		margin-top: 14px;
		gap: 10px;
	}

	.btn-show-more,
	.btn-show-less {
		padding: 8px 20px;
		border-radius: 20px;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s;
		border: 1px solid #cbd5e1;
		background: #ffffff;
		color: #334155;
	}

	.btn-show-more:hover {
		background: #f1f5f9;
		color: #0ea5e9;
		border-color: #0ea5e9;
	}

	.btn-show-less:hover {
		background: #f1f5f9;
		color: #64748b;
	}

	@media (max-width: 640px) {
		.media-chat-item {
			flex-wrap: wrap;
		}
		.chat-item-actions {
			width: 100%;
			justify-content: flex-end;
		}
	}
</style>
