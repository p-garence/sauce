<!--
  @component AdminPerformanceSettings
  @domain admin
  @description Gestion des seuils de pagination, des limites de requêtes et de protection contre les abus (anti-DoS).
  @responsibilities
    - Configurer les volumes d'éléments chargés par défilement (posts, chat, commentaires, etc.).
    - Ajuster les plafonds stricts pour préserver les performances du serveur.
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { InstancePerformanceSettings } from '$lib/types';

	interface Props {
		/** Paramètres de performance actuels de l'instance */
		performanceSettings: InstancePerformanceSettings;
	}

	let { performanceSettings }: Props = $props();
	let isSaving = $state(false);

	// svelte-ignore state_referenced_locally
	let postsPerScroll = $state(performanceSettings.postsPerScroll);
	// svelte-ignore state_referenced_locally
	let postsPerGrid = $state(performanceSettings.postsPerGrid);
	// svelte-ignore state_referenced_locally
	let commentsPerLoad = $state(performanceSettings.commentsPerLoad);
	// svelte-ignore state_referenced_locally
	let messagesPerChat = $state(performanceSettings.messagesPerChat);
	// svelte-ignore state_referenced_locally
	let notificationsPerLoad = $state(performanceSettings.notificationsPerLoad);
	// svelte-ignore state_referenced_locally
	let trendingTagsLimit = $state(performanceSettings.trendingTagsLimit);
	// svelte-ignore state_referenced_locally
	let usersPerPage = $state(performanceSettings.usersPerPage);
	// svelte-ignore state_referenced_locally
	let adminItemsPerPage = $state(performanceSettings.adminItemsPerPage);
	// svelte-ignore state_referenced_locally
	let maxPostsPerRequest = $state(performanceSettings.maxPostsPerRequest);
	// svelte-ignore state_referenced_locally
	let maxCommentsPerRequest = $state(performanceSettings.maxCommentsPerRequest);
	// svelte-ignore state_referenced_locally
	let maxCommentLength = $state(performanceSettings.maxCommentLength);
	// svelte-ignore state_referenced_locally
	let maxUsersSearchLimit = $state(performanceSettings.maxUsersSearchLimit);

	$effect(() => {
		postsPerScroll = performanceSettings.postsPerScroll;
		postsPerGrid = performanceSettings.postsPerGrid;
		commentsPerLoad = performanceSettings.commentsPerLoad;
		messagesPerChat = performanceSettings.messagesPerChat;
		notificationsPerLoad = performanceSettings.notificationsPerLoad;
		trendingTagsLimit = performanceSettings.trendingTagsLimit;
		usersPerPage = performanceSettings.usersPerPage;
		adminItemsPerPage = performanceSettings.adminItemsPerPage;
		maxPostsPerRequest = performanceSettings.maxPostsPerRequest;
		maxCommentsPerRequest = performanceSettings.maxCommentsPerRequest;
		maxCommentLength = performanceSettings.maxCommentLength;
		maxUsersSearchLimit = performanceSettings.maxUsersSearchLimit;
	});
</script>

<div class="settings-card">
	<div class="card-header">
		<h2 class="card-title">Volumes de chargement et pagination</h2>
		<p class="card-description">
			Ajustez le nombre d'éléments récupérés par requête pour le confort d'affichage et
			l'utilisation de la bande passante.
		</p>
	</div>

	<form
		method="POST"
		action="?/savePerformance"
		use:enhance={() => {
			isSaving = true;
			return async ({ update }) => {
				await update({ reset: false });
				isSaving = false;
			};
		}}
		class="settings-form"
	>
		<div class="form-grid">
			<div class="form-group">
				<label for="postsPerScroll" class="form-label"> Publications par défilement (flux) </label>
				<input
					type="number"
					id="postsPerScroll"
					name="postsPerScroll"
					class="form-input"
					min="1"
					max="50"
					bind:value={postsPerScroll}
					required
				/>
				<span class="field-hint">Nombre de posts chargés à chaque scroll infini.</span>
			</div>

			<div class="form-group">
				<label for="postsPerGrid" class="form-label">
					Publications par lot (grilles profil et tags)
				</label>
				<input
					type="number"
					id="postsPerGrid"
					name="postsPerGrid"
					class="form-input"
					min="1"
					max="50"
					bind:value={postsPerGrid}
					required
				/>
				<span class="field-hint">Nombre de posts par page dans les vues en grille.</span>
			</div>

			<div class="form-group">
				<label for="commentsPerLoad" class="form-label"> Commentaires par chargement </label>
				<input
					type="number"
					id="commentsPerLoad"
					name="commentsPerLoad"
					class="form-input"
					min="1"
					max="50"
					bind:value={commentsPerLoad}
					required
				/>
				<span class="field-hint">Commentaires affichés initialement et par lot sous un post.</span>
			</div>

			<div class="form-group">
				<label for="messagesPerChat" class="form-label"> Messages par conversation </label>
				<input
					type="number"
					id="messagesPerChat"
					name="messagesPerChat"
					class="form-input"
					min="5"
					max="100"
					bind:value={messagesPerChat}
					required
				/>
				<span class="field-hint">Historique de messages récupéré par page de chat.</span>
			</div>

			<div class="form-group">
				<label for="notificationsPerLoad" class="form-label"> Notifications par chargement </label>
				<input
					type="number"
					id="notificationsPerLoad"
					name="notificationsPerLoad"
					class="form-input"
					min="5"
					max="50"
					bind:value={notificationsPerLoad}
					required
				/>
				<span class="field-hint">Éléments affichés dans le panneau de notifications.</span>
			</div>

			<div class="form-group">
				<label for="trendingTagsLimit" class="form-label"> Tags tendance visibles </label>
				<input
					type="number"
					id="trendingTagsLimit"
					name="trendingTagsLimit"
					class="form-input"
					min="1"
					max="30"
					bind:value={trendingTagsLimit}
					required
				/>
				<span class="field-hint">Nombre maximal de tags affichés dans les suggestions.</span>
			</div>

			<div class="form-group">
				<label for="usersPerPage" class="form-label"> Utilisateurs par page de recherche </label>
				<input
					type="number"
					id="usersPerPage"
					name="usersPerPage"
					class="form-input"
					min="1"
					max="50"
					bind:value={usersPerPage}
					required
				/>
				<span class="field-hint">Résultats par lot lors d'une recherche utilisateur.</span>
			</div>

			<div class="form-group">
				<label for="adminItemsPerPage" class="form-label">
					Éléments par page dans l'administration
				</label>
				<input
					type="number"
					id="adminItemsPerPage"
					name="adminItemsPerPage"
					class="form-input"
					min="5"
					max="100"
					bind:value={adminItemsPerPage}
					required
				/>
				<span class="field-hint">Publications, stories et comptes par page d'administration.</span>
			</div>
		</div>

		<div class="sub-section">
			<h3 class="sub-section-title">Plafonds stricts de protection (Anti-DoS)</h3>
			<p class="sub-section-desc">
				Valeurs maximales infranchissables acceptées par l'API afin de bloquer les requêtes
				artificiellement surchargées.
			</p>

			<div class="form-grid">
				<div class="form-group">
					<label for="maxPostsPerRequest" class="form-label">
						Plafond max de publications par requête API
					</label>
					<input
						type="number"
						id="maxPostsPerRequest"
						name="maxPostsPerRequest"
						class="form-input"
						min="10"
						max="100"
						bind:value={maxPostsPerRequest}
						required
					/>
				</div>

				<div class="form-group">
					<label for="maxCommentsPerRequest" class="form-label">
						Plafond max de commentaires par requête API
					</label>
					<input
						type="number"
						id="maxCommentsPerRequest"
						name="maxCommentsPerRequest"
						class="form-input"
						min="10"
						max="100"
						bind:value={maxCommentsPerRequest}
						required
					/>
				</div>

				<div class="form-group">
					<label for="maxCommentLength" class="form-label">
						Longueur maximale d'un commentaire (caractères)
					</label>
					<input
						type="number"
						id="maxCommentLength"
						name="maxCommentLength"
						class="form-input"
						min="100"
						max="10000"
						bind:value={maxCommentLength}
						required
					/>
				</div>

				<div class="form-group">
					<label for="maxUsersSearchLimit" class="form-label">
						Plafond max de résultats pour la recherche utilisateur
					</label>
					<input
						type="number"
						id="maxUsersSearchLimit"
						name="maxUsersSearchLimit"
						class="form-input"
						min="5"
						max="100"
						bind:value={maxUsersSearchLimit}
						required
					/>
				</div>
			</div>
		</div>

		<div class="form-actions">
			<button type="submit" class="btn-save" disabled={isSaving}>
				{isSaving ? 'Enregistrement...' : 'Enregistrer les paramètres de performance'}
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
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
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

	.form-input {
		padding: 8px 12px;
		border: 1px solid #cbd5e1;
		border-radius: 6px;
		font-size: 0.9rem;
		color: #0f172a;
		background: #ffffff;
		outline: none;
	}

	.form-input:focus {
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
