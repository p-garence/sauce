<!--
  @component AdminMediaSettings
  @domain admin
  @description Gestion des paramètres multimédias : tailles maximales d'upload, quotas disque par utilisateur, délai de grâce des orphelins et durée des stories.
  @responsibilities
    - Ajuster la taille maximale autorisée par fichier uploadé (images, vidéos, audio, documents).
    - Régler le quota de stockage disque standard attribué aux utilisateurs.
    - Configurer la durée de vie des stories et le délai de purge des fichiers orphelins.
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { InstanceMediaSettings } from '$lib/types';

	interface Props {
		/** Paramètres médias actuels de l'instance */
		mediaSettings: InstanceMediaSettings;
	}

	let { mediaSettings }: Props = $props();
	let isSaving = $state(false);

	// svelte-ignore state_referenced_locally
	let maxMediaSizeMb = $state(mediaSettings.maxMediaSizeMb);
	// svelte-ignore state_referenced_locally
	let defaultStorageQuotaGb = $state(
		Math.round((mediaSettings.defaultStorageQuotaBytes / (1024 * 1024 * 1024)) * 10) / 10
	);
	// svelte-ignore state_referenced_locally
	let orphanGracePeriodHours = $state(mediaSettings.orphanGracePeriodHours);
	// svelte-ignore state_referenced_locally
	let storyDurationHours = $state(mediaSettings.storyDurationHours);

	$effect(() => {
		maxMediaSizeMb = mediaSettings.maxMediaSizeMb;
		defaultStorageQuotaGb =
			Math.round((mediaSettings.defaultStorageQuotaBytes / (1024 * 1024 * 1024)) * 10) / 10;
		orphanGracePeriodHours = mediaSettings.orphanGracePeriodHours;
		storyDurationHours = mediaSettings.storyDurationHours;
	});
</script>

<div class="settings-card">
	<div class="card-header">
		<h2 class="card-title">Stockage et gestion des médias</h2>
		<p class="card-description">
			Configurez les plafonds de transfert et les règles d'expiration des fichiers hébergés sur le
			serveur.
		</p>
	</div>

	<form
		method="POST"
		action="?/saveMedia"
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
				<label for="maxMediaSizeMb" class="form-label">
					Poids brut maximal par fichier envoyé (Mo)
				</label>
				<input
					type="number"
					id="maxMediaSizeMb"
					name="maxMediaSizeMb"
					class="form-input"
					min="1"
					max="5000"
					bind:value={maxMediaSizeMb}
					required
				/>
				<span class="field-hint">
					Poids maximal accepté à l'envoi HTTP (avant compression serveur WebP / MP4). Protège la
					mémoire et le processeur contre les transferts géants.
				</span>
			</div>

			<div class="form-group">
				<label for="defaultStorageQuotaGb" class="form-label">
					Quota de stockage par défaut par compte (Go)
				</label>
				<input
					type="number"
					id="defaultStorageQuotaGb"
					name="defaultStorageQuotaGb"
					class="form-input"
					min="0.1"
					max="100"
					step="0.1"
					bind:value={defaultStorageQuotaGb}
					required
				/>
				<span class="field-hint">
					Espace disque cumulé alloué par compte. Calculé sur la taille finale des fichiers réels
					compressés conservés sur le disque.
				</span>
			</div>

			<div class="form-group">
				<label for="orphanGracePeriodHours" class="form-label">
					Période de grâce des fichiers orphelins (heures)
				</label>
				<input
					type="number"
					id="orphanGracePeriodHours"
					name="orphanGracePeriodHours"
					class="form-input"
					min="1"
					max="168"
					bind:value={orphanGracePeriodHours}
					required
				/>
				<span class="field-hint">
					Délai avant qu'un fichier non rattaché soit éligible à la purge (protège les brouillons en
					cours).
				</span>
			</div>

			<div class="form-group">
				<label for="storyDurationHours" class="form-label">
					Durée de validité des stories (heures)
				</label>
				<input
					type="number"
					id="storyDurationHours"
					name="storyDurationHours"
					class="form-input"
					min="1"
					max="168"
					bind:value={storyDurationHours}
					required
				/>
				<span class="field-hint">
					Durée avant l'archivage ou l'expiration automatique d'une story standard (24h par défaut).
				</span>
			</div>
		</div>

		<div class="form-actions">
			<button type="submit" class="btn-save" disabled={isSaving}>
				{isSaving ? 'Enregistrement...' : 'Enregistrer les paramètres des médias'}
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
