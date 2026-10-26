<!--
  @component AdminBackupsPage
  @domain admin/backups
  @description Page de gestion des sauvegardes : export direct, clé maîtresse masquée, gestion
  de destinations WebDAV multiples (dossiers dédiés), et section d'importation/restauration de dossiers avec parts.
-->
<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { formatBytes } from '$lib/utils/format';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';

	interface Props {
		data: PageData;
		form: ActionData;
	}

	let { data, form }: Props = $props();

	let configs = $state<typeof data.configs>([]);
	let restoreStatus = $state<typeof data.restoreStatus>(data.restoreStatus);

	$effect.pre(() => {
		configs = data.configs;
		restoreStatus = data.restoreStatus;
	});

	let keyCopied = $state(false);
	let isRotatingKey = $state(false);
	let isDownloading = $state(false);

	// États d'actions par configuration
	let loadingAction = $state<string | null>(null);
	let testFeedback = $state<{ configId: string; success: boolean; message: string } | null>(null);

	// Modale d'édition/création WebDAV
	let isModalOpen = $state(false);
	let modalMode = $state<'create' | 'edit'>('create');
	let editingId = $state<string>('');
	let formName = $state('');
	let formWebdavUrl = $state('');
	let formWebdavUsername = $state('');
	let formWebdavPassword = $state('');
	let formHasPassword = $state(false);
	let formFrequency = $state<'daily' | 'weekly' | 'manual'>('daily');
	let formRetentionCount = $state(7);
	let formChunkSizeMb = $state(10);
	let formEnabled = $state(true);

	// États pour la section IMPORTATION & RESTAURATION
	let folderInputRef = $state<HTMLInputElement | null>(null);
	let fileInputRef = $state<HTMLInputElement | null>(null);
	let selectedFiles = $state<File[]>([]);
	let importDecryptionKey = $state('');
	let isInspecting = $state(false);
	let isRestoring = $state(false);
	let isPickerMenuOpen = $state(false);
	let isDraggingOver = $state(false);
	let inspectResult = $state<{
		inspectToken: string;
		isEncrypted: boolean;
		manifest: {
			createdAt: string;
			instance: { url: string };
			stats: {
				databaseSizeBytes: number;
				uploadsCount: number;
				uploadsSizeBytes: number;
			};
		};
	} | null>(null);
	let importFeedback = $state<{ success: boolean; message: string } | null>(null);

	// Polling persistant de l'état des sauvegardes et restaurations
	let pollInterval: ReturnType<typeof setInterval> | null = null;

	function checkAndStartPolling() {
		const isAnyBackupRunning = configs.some((c) => c.lastRunStatus === 'running');
		const isRestoreRunning = restoreStatus?.status === 'running' || isRestoring;

		if (isAnyBackupRunning || isRestoreRunning) {
			if (!pollInterval) {
				pollInterval = setInterval(async () => {
					try {
						const res = await fetch('/api/admin/backups/status');
						if (res.ok) {
							const statusData = await res.json();
							if (statusData.configs) {
								for (const update of statusData.configs) {
									const found = configs.find((c) => c.id === update.id);
									if (found) {
										found.lastRunStatus = update.lastRunStatus;
										found.lastRunAt = update.lastRunAt;
										found.lastRunError = update.lastRunError;
									}
								}
							}
							if (statusData.restore) {
								restoreStatus = statusData.restore;
								if (statusData.restore.status === 'success') {
									importFeedback = {
										success: true,
										message:
											'Restauration terminée avec succès ! Redirection vers la page de connexion...'
									};
									inspectResult = null;
									selectedFiles = [];
									isRestoring = false;
									setTimeout(() => {
										window.location.href = '/login';
									}, 1500);
								} else if (statusData.restore.status === 'error') {
									if (statusData.restore.error) {
										importFeedback = {
											success: false,
											message: `Erreur lors de la restauration : ${statusData.restore.error}`
										};
									}
									isRestoring = false;
								}
							}

							const stillRunningBackup = configs.some((c) => c.lastRunStatus === 'running');
							const stillRunningRestore = restoreStatus?.status === 'running' || isRestoring;
							if (!stillRunningBackup && !stillRunningRestore && pollInterval) {
								clearInterval(pollInterval);
								pollInterval = null;
							}
						}
					} catch (err) {
						console.warn('Erreur polling statut backup:', err);
					}
				}, 2000);
			}
		} else if (pollInterval) {
			clearInterval(pollInterval);
			pollInterval = null;
		}
	}

	$effect(() => {
		checkAndStartPolling();
		return () => {
			if (pollInterval) {
				clearInterval(pollInterval);
				pollInterval = null;
			}
		};
	});

	$effect(() => {
		if (form?.action === 'testConnection' && form.message) {
			testFeedback = {
				configId: String(form.configId || ''),
				success: Boolean(form.success),
				message: form.message
			};
		}
		if (form?.action === 'saveConfig' && form.success) {
			isModalOpen = false;
		}
	});

	function openCreateModal() {
		modalMode = 'create';
		editingId = '';
		formName = 'Sauvegarde Cloud';
		formWebdavUrl = '';
		formWebdavUsername = '';
		formWebdavPassword = '';
		formHasPassword = false;
		formFrequency = 'daily';
		formRetentionCount = 7;
		formChunkSizeMb = 10;
		formEnabled = true;
		isModalOpen = true;
	}

	function openEditModal(cfg: (typeof data.configs)[0]) {
		modalMode = 'edit';
		editingId = cfg.id;
		formName = cfg.name;
		formWebdavUrl = cfg.webdavUrl;
		formWebdavUsername = cfg.webdavUsername;
		formWebdavPassword = '';
		formHasPassword = cfg.hasPassword;
		formFrequency = cfg.frequency;
		formRetentionCount = cfg.retentionCount;
		formChunkSizeMb = cfg.chunkSizeMb;
		formEnabled = cfg.enabled;
		isModalOpen = true;
	}

	function formatDate(iso: string | null): string {
		if (!iso) return 'Jamais';
		const d = new Date(iso);
		if (isNaN(d.getTime())) return 'Date inconnue';
		return d.toLocaleString('fr-FR', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	async function copyKeyToClipboard() {
		if (!data.masterKey) return;
		try {
			await navigator.clipboard.writeText(data.masterKey);
			keyCopied = true;
			setTimeout(() => (keyCopied = false), 3000);
		} catch (e) {
			console.error('Erreur lors de la copie de la clé:', e);
		}
	}

	function handleFilesChange(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			selectedFiles = Array.from(target.files);
			inspectResult = null;
			importFeedback = null;
		}
	}

	async function scanEntry(entry: FileSystemEntry, outFiles: File[]) {
		if (entry.isFile) {
			const fileEntry = entry as FileSystemFileEntry;
			const file = await new Promise<File>((resolveCb, rejectCb) =>
				fileEntry.file(resolveCb, rejectCb)
			);
			outFiles.push(file);
		} else if (entry.isDirectory) {
			const dirEntry = entry as FileSystemDirectoryEntry;
			const dirReader = dirEntry.createReader();
			const entries = await new Promise<FileSystemEntry[]>((resolveCb, rejectCb) =>
				dirReader.readEntries(resolveCb, rejectCb)
			);
			for (const child of entries) {
				await scanEntry(child, outFiles);
			}
		}
	}

	async function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDraggingOver = false;
		if (restoreStatus?.status === 'running') return;

		const items = e.dataTransfer?.items;
		if (!items || items.length === 0) return;

		const collected: File[] = [];
		for (let i = 0; i < items.length; i++) {
			const entry = items[i].webkitGetAsEntry();
			if (entry) {
				await scanEntry(entry, collected);
			} else {
				const file = items[i].getAsFile();
				if (file) collected.push(file);
			}
		}

		if (collected.length > 0) {
			selectedFiles = collected;
			inspectResult = null;
			importFeedback = null;
		}
	}

	async function inspectSelectedArchive() {
		if (selectedFiles.length === 0) return;
		isInspecting = true;
		importFeedback = null;
		inspectResult = null;

		try {
			const fd = new FormData();
			fd.append('action', 'inspect');
			fd.append('decryptionKey', importDecryptionKey.trim());
			for (const f of selectedFiles) {
				fd.append('files', f, f.name);
			}

			const res = await fetch('/api/admin/backups/import', {
				method: 'POST',
				body: fd
			});

			const json = await res.json();
			if (!res.ok || !json.success) {
				importFeedback = {
					success: false,
					message: json.message || 'Erreur lors de l’analyse de l’archive.'
				};
			} else {
				inspectResult = json;
			}
		} catch (err) {
			importFeedback = {
				success: false,
				message: `Erreur réseau lors de l'envoi : ${err instanceof Error ? err.message : String(err)}`
			};
		} finally {
			isInspecting = false;
		}
	}

	async function triggerRestore() {
		if (!inspectResult) return;
		if (
			!confirm(
				'ATTENTION : Restauration intégrale depuis l’image.\n\nLe serveur actuel sera entièrement réinitialisé pour correspondre exactement à cette sauvegarde (les publications, commentaires et médias créés ultérieurement seront effacés).\n\nAprès la restauration, vous serez redirigé vers l’écran de connexion.\n\nConfirmer la réinitialisation et restauration ?'
			)
		) {
			return;
		}

		isRestoring = true;
		if (restoreStatus) {
			restoreStatus.status = 'running';
		}
		checkAndStartPolling();
		importFeedback = null;

		try {
			const fd = new FormData();
			fd.append('action', 'restore');
			fd.append('inspectToken', inspectResult.inspectToken);

			const res = await fetch('/api/admin/backups/import', {
				method: 'POST',
				body: fd
			});

			const json = await res.json();
			if (!res.ok || !json.success) {
				importFeedback = {
					success: false,
					message: json.message || 'Erreur lors de la restauration.'
				};
				if (restoreStatus) {
					restoreStatus.status = 'error';
				}
			} else {
				importFeedback = {
					success: true,
					message: 'Restauration terminée avec succès ! Redirection vers la page de connexion...'
				};
				if (restoreStatus) {
					restoreStatus.status = 'success';
				}
				inspectResult = null;
				selectedFiles = [];
				setTimeout(() => {
					window.location.href = '/login';
				}, 1500);
			}
		} catch (err) {
			importFeedback = {
				success: false,
				message: `Erreur lors de la restauration : ${err instanceof Error ? err.message : String(err)}`
			};
			if (restoreStatus) {
				restoreStatus.status = 'error';
			}
		} finally {
			isRestoring = false;
		}
	}
</script>

<div class="admin-page">
	<header class="page-header">
		<div>
			<h1 class="page-title">Sauvegardes et restauration</h1>
			<p class="page-desc">
				Exportez vos données, restaurez depuis une sauvegarde, ou gérez vos destinations
				automatiques chiffrées.
			</p>
		</div>
	</header>

	{#if form?.message && form?.action !== 'testConnection'}
		<div class="alert {form.success ? 'alert-success' : 'alert-error'}">
			<span>{form.message}</span>
		</div>
	{/if}

	<!-- MÉTRIQUES VOLUME -->
	<div class="metrics-grid">
		<div class="metric-card">
			<span class="metric-label">Base de données PostgreSQL</span>
			<div class="metric-value">{formatBytes(data.dbSizeBytes)}</div>
			<span class="metric-desc">Tables, relations et métadonnées</span>
		</div>

		<div class="metric-card">
			<span class="metric-label">Volume des médias</span>
			<div class="metric-value">{formatBytes(data.serverStorage.totalAppBytes ?? 0)}</div>
			<span class="metric-desc">
				{data.serverStorage.uploadsCount ?? 0} fichiers • {formatBytes(
					data.serverStorage.freeDiskBytes ?? 0
				)} libres
			</span>
		</div>

		<div class="metric-card">
			<span class="metric-label">Destinations configurées</span>
			<div class="metric-value">{data.configs.length}</div>
			<span class="metric-desc">
				{data.configs.filter((c) => c.enabled).length} actives pour synchronisation automatique
			</span>
		</div>
	</div>

	<!-- SÉCURITÉ : CLÉ MAÎTRESSE DE CHIFFREMENT (MASQUÉE) -->
	<div class="card security-card">
		<div class="card-header">
			<div>
				<h2>Clé de déchiffrement des sauvegardes (AES-256)</h2>
				<p>
					Cette clé maîtresse chiffre toutes les archives envoyées vers vos espaces Cloud distants.
				</p>
			</div>
		</div>

		<div class="security-warning">
			<strong>Conservation obligatoire en lieu sûr</strong>
			<p>
				La clé n'est jamais transmise au serveur distant. Sans elle, il sera strictement impossible
				de déchiffrer ou restaurer vos données depuis une sauvegarde Cloud. Copiez-la et
				conservez-la dans votre gestionnaire de mots de passe.
			</p>
		</div>

		<div class="key-container">
			<div class="key-status-text">
				<span class="key-badge">Clé maîtresse active</span>
				<span class="key-subtext">32 octets (AES-256-GCM) • Masquée pour sécurité</span>
			</div>
			<div class="key-actions">
				<button type="button" class="btn btn-secondary" onclick={copyKeyToClipboard}>
					{keyCopied ? 'Clé copiée dans le presse-papier !' : 'Copier la clé de déchiffrement'}
				</button>
				<form
					method="POST"
					action="?/rotateKey"
					use:enhance={({ cancel }) => {
						if (
							!confirm(
								'Voulez-vous vraiment recycler la clé de chiffrement ?\n\nLes futures sauvegardes utiliseront cette nouvelle clé. Pensez à immédiatement copier la nouvelle clé.'
							)
						) {
							cancel();
							return;
						}
						isRotatingKey = true;
						return async ({ update }) => {
							isRotatingKey = false;
							await update();
						};
					}}
				>
					<button type="submit" class="btn btn-danger-outline" disabled={isRotatingKey}>
						{isRotatingKey ? 'Génération...' : 'Recycler la clé'}
					</button>
				</form>
			</div>
		</div>
	</div>

	<!-- SECTION 1 : EXPORTER LES DONNÉES -->
	<div class="card export-card">
		<div class="card-header">
			<div>
				<h2>Exporter les données brutes de l'instance</h2>
				<p>
					Générez et téléchargez immédiatement une archive complète au format <code>.tar.gz</code>.
				</p>
			</div>
		</div>

		<div class="archive-contents-info">
			<span class="info-title">Contenu inclus dans l'archive :</span>
			<ul class="file-list">
				<li><strong>database.sql</strong> : Dump SQL intégral de toutes les tables PostgreSQL.</li>
				<li>
					<strong>uploads/</strong> : L'ensemble des médias du serveur (photos, vidéos, audio, bannières,
					avatars).
				</li>
				<li>
					<strong>manifest.json</strong> : Métadonnées d'intégrité (date, version de l'instance, sommes
					de contrôle SHA-256).
				</li>
			</ul>
		</div>

		<div class="export-actions">
			<a
				href={resolve('/api/admin/backups/export' as Parameters<typeof resolve>[0])}
				download
				class="btn btn-primary btn-large"
				onclick={() => {
					isDownloading = true;
					setTimeout(() => (isDownloading = false), 6000);
				}}
			>
				{#if isDownloading}
					Génération de l'archive en cours...
				{:else}
					Exporter les données (.tar.gz)
				{/if}
			</a>
			<span class="help-text"
				>Le téléchargement démarre dès que la base et les médias sont compressés.</span
			>
		</div>
	</div>

	<!-- SECTION 3 : DESTINATIONS DE SAUVEGARDES WEBDAV MULTIPLES -->
	<div class="card">
		<div class="section-header-row">
			<div>
				<h2>Sauvegardes automatiques chiffrées dans le Cloud (WebDAV)</h2>
				<p>
					Chaque sauvegarde est isolée dans son propre sous-dossier dédié (avec ses fragments
					chiffrés) pour un import simplifié.
				</p>
			</div>
			<button type="button" class="btn btn-primary" onclick={openCreateModal}>
				Créer une configuration
			</button>
		</div>

		{#if configs.length === 0}
			<div class="empty-state">
				<p>Aucune configuration de sauvegarde automatique n'a été créée pour le moment.</p>
				<button type="button" class="btn btn-primary mt-12" onclick={openCreateModal}>
					Créer ma première configuration WebDAV
				</button>
			</div>
		{:else}
			<div class="configs-list">
				{#each configs as cfg (cfg.id)}
					<div class="config-card {cfg.enabled ? 'is-enabled' : 'is-disabled'}">
						<div class="config-main">
							<div class="config-title-row">
								<h3 class="config-name">{cfg.name}</h3>
								<div class="badges-row">
									<span class="badge {cfg.enabled ? 'badge-success' : 'badge-neutral'}">
										{cfg.enabled ? 'Active' : 'En pause'}
									</span>
									<span class="badge badge-outline">
										{#if cfg.frequency === 'daily'}
											Quotidienne
										{:else if cfg.frequency === 'weekly'}
											Hebdomadaire
										{:else}
											Manuelle
										{/if}
									</span>
									<span class="badge badge-outline">
										Rétention : {cfg.retentionCount} dossiers
									</span>
									{#if cfg.chunkSizeMb > 0}
										<span class="badge badge-info">
											Fragments {cfg.chunkSizeMb} Mo
										</span>
									{:else}
										<span class="badge badge-outline"> Archive unique </span>
									{/if}
								</div>
							</div>

							<div class="config-url">
								<code>{cfg.webdavUrl || 'URL non configurée'}</code>
							</div>

							<div class="config-meta">
								<span>Dernière sauvegarde : <strong>{formatDate(cfg.lastRunAt)}</strong></span>
								{#if cfg.lastRunStatus === 'running'}
									<span class="status-indicator status-running">Sauvegarde en cours...</span>
								{:else if cfg.lastRunStatus === 'success'}
									<span class="status-indicator status-ok">Succès</span>
								{:else if cfg.lastRunStatus === 'error'}
									<span class="status-indicator status-err">Échec</span>
								{/if}
							</div>

							{#if cfg.lastRunError}
								<div class="error-box">
									<strong>Dernière erreur :</strong>
									<span>{cfg.lastRunError}</span>
								</div>
							{/if}

							{#if testFeedback && testFeedback.configId === cfg.id}
								<div
									class="test-feedback {testFeedback.success
										? 'feedback-success'
										: 'feedback-error'}"
								>
									<span>{testFeedback.message}</span>
								</div>
							{/if}
						</div>

						<div class="config-actions">
							<!-- 1. SAUVEGARDER MAINTENANT -->
							<form
								method="POST"
								action="?/triggerBackup"
								use:enhance={() => {
									const found = configs.find((c) => c.id === cfg.id);
									if (found) {
										found.lastRunStatus = 'running';
									}
									checkAndStartPolling();
									return async ({ update }) => {
										await update();
									};
								}}
							>
								<input type="hidden" name="id" value={cfg.id} />
								<button
									type="submit"
									class="btn btn-primary btn-sm"
									disabled={cfg.lastRunStatus === 'running' || !cfg.webdavUrl}
								>
									{cfg.lastRunStatus === 'running'
										? 'Traitement en cours...'
										: 'Sauvegarder maintenant'}
								</button>
							</form>

							<!-- 2. TESTER -->
							<form
								method="POST"
								action="?/testConnection"
								use:enhance={() => {
									loadingAction = `test_${cfg.id}`;
									testFeedback = null;
									return async ({ update }) => {
										loadingAction = null;
										await update();
									};
								}}
							>
								<input type="hidden" name="id" value={cfg.id} />
								<button
									type="submit"
									class="btn btn-secondary btn-sm"
									disabled={cfg.lastRunStatus === 'running' ||
										loadingAction === `test_${cfg.id}` ||
										!cfg.webdavUrl}
								>
									{loadingAction === `test_${cfg.id}` ? 'Test...' : 'Tester'}
								</button>
							</form>

							<!-- 3. ACTIVER / DÉSACTIVER -->
							<form
								method="POST"
								action="?/toggleEnabled"
								use:enhance={() => {
									loadingAction = `toggle_${cfg.id}`;
									return async ({ update }) => {
										loadingAction = null;
										await update();
									};
								}}
							>
								<input type="hidden" name="id" value={cfg.id} />
								<input type="hidden" name="enabled" value={cfg.enabled ? 'false' : 'true'} />
								<button
									type="submit"
									class="btn btn-sm {cfg.enabled ? 'btn-toggle-active' : 'btn-toggle-paused'}"
									disabled={cfg.lastRunStatus === 'running' || loadingAction === `toggle_${cfg.id}`}
								>
									{cfg.enabled ? 'Désactiver' : 'Activer'}
								</button>
							</form>

							<!-- 4. MODIFIER -->
							<button
								type="button"
								class="btn btn-secondary btn-sm"
								onclick={() => openEditModal(cfg)}
								disabled={cfg.lastRunStatus === 'running'}
							>
								Modifier
							</button>

							<!-- 5. SUPPRIMER -->
							<form
								method="POST"
								action="?/deleteConfig"
								use:enhance={({ cancel }) => {
									if (!confirm(`Supprimer définitivement la configuration "${cfg.name}" ?`)) {
										cancel();
										return;
									}
									return async ({ update }) => {
										await update();
									};
								}}
							>
								<input type="hidden" name="id" value={cfg.id} />
								<button
									type="submit"
									class="btn btn-icon-danger btn-sm"
									title="Supprimer cette configuration"
									disabled={cfg.lastRunStatus === 'running'}
								>
									✕
								</button>
							</form>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- SECTION : IMPORTER ET RESTAURER UNE SAUVEGARDE (TOUT EN BAS) -->
	<div class="card import-card">
		<div class="card-header">
			<div>
				<h2>Importer et restaurer une sauvegarde</h2>
				<p>
					Restauration intégrale du système à partir d'une image antérieure (dossier de fragments ou
					archive unique).
				</p>
			</div>
		</div>

		{#if restoreStatus?.status === 'running'}
			<div class="alert alert-info">
				<span
					>Traitement en cours : Restauration de l'instance en progression... Veuillez patienter
					sans éteindre le serveur.</span
				>
			</div>
		{/if}

		{#if importFeedback}
			<div class="alert {importFeedback.success ? 'alert-success' : 'alert-error'}">
				<span>{importFeedback.message}</span>
			</div>
		{/if}

		<div
			class="import-picker-zone {isDraggingOver ? 'is-dragging-over' : ''}"
			ondragover={(e) => {
				e.preventDefault();
				isDraggingOver = true;
			}}
			ondragleave={() => (isDraggingOver = false)}
			ondrop={handleDrop}
			role="region"
			aria-label="Zone de dépôt ou sélection de sauvegarde"
		>
			<!-- Inputs masqués -->
			<input
				type="file"
				bind:this={folderInputRef}
				onchange={handleFilesChange}
				style="display: none;"
				webkitdirectory={true}
				multiple
				disabled={restoreStatus?.status === 'running'}
			/>
			<input
				type="file"
				bind:this={fileInputRef}
				onchange={handleFilesChange}
				style="display: none;"
				multiple
				accept=".tar.gz,.enc,.part*"
				disabled={restoreStatus?.status === 'running'}
			/>

			<div class="picker-single-wrapper">
				<div class="dropdown-anchor">
					<button
						type="button"
						class="btn btn-primary btn-large"
						onclick={() => (isPickerMenuOpen = !isPickerMenuOpen)}
						disabled={restoreStatus?.status === 'running'}
					>
						Sélectionner une sauvegarde (dossier ou archive) ▾
					</button>

					{#if isPickerMenuOpen}
						<div class="picker-dropdown-menu">
							<button
								type="button"
								class="picker-menu-item"
								onclick={() => {
									isPickerMenuOpen = false;
									folderInputRef?.click();
								}}
							>
								Dossier de sauvegarde (fragments .part*)
							</button>
							<button
								type="button"
								class="picker-menu-item"
								onclick={() => {
									isPickerMenuOpen = false;
									fileInputRef?.click();
								}}
							>
								Fichier archive (.tar.gz / .enc)
							</button>
						</div>
					{/if}
				</div>
				<span class="picker-drop-hint">
					Ou glissez-déposez directement vos fichiers ou dossier dans cet encadré
				</span>
			</div>

			{#if selectedFiles.length > 0}
				<div class="selected-files-summary">
					<strong>{selectedFiles.length} fichier(s) sélectionné(s) :</strong>
					<ul class="parts-list">
						{#each selectedFiles as f (f.name)}
							<li><code>{f.name}</code> ({formatBytes(f.size)})</li>
						{/each}
					</ul>
				</div>

				<div class="import-form-row">
					<div class="form-group flex-1">
						<label for="import_key">Clé de déchiffrement (si l'archive est chiffrée .enc)</label>
						<div class="input-with-button">
							<input
								type="password"
								id="import_key"
								placeholder="Laisser vide pour utiliser la clé maîtresse actuelle"
								bind:value={importDecryptionKey}
								class="input"
								disabled={restoreStatus?.status === 'running'}
							/>
							<button
								type="button"
								class="btn btn-secondary btn-sm"
								onclick={() => (importDecryptionKey = data.masterKey)}
								disabled={restoreStatus?.status === 'running'}
							>
								Insérer clé maîtresse
							</button>
						</div>
					</div>

					<button
						type="button"
						class="btn btn-primary self-end"
						onclick={inspectSelectedArchive}
						disabled={isInspecting || restoreStatus?.status === 'running'}
					>
						{isInspecting ? 'Traitement en cours...' : 'Analyser et préparer la restauration'}
					</button>
				</div>
			{/if}
		</div>

		<!-- APERÇU ET CONFIRMATION DE RESTAURATION -->
		{#if inspectResult}
			<div class="inspect-box">
				<div class="inspect-header">
					<h3>Aperçu de la sauvegarde prête à restaurer</h3>
					<span class="badge badge-success">Archive validée</span>
				</div>

				<div class="inspect-grid">
					<div>
						<span class="inspect-label">Date de création :</span>
						<strong>{formatDate(inspectResult.manifest.createdAt)}</strong>
					</div>
					<div>
						<span class="inspect-label">Instance d'origine :</span>
						<strong>{inspectResult.manifest.instance?.url || 'Inconnue'}</strong>
					</div>
					<div>
						<span class="inspect-label">Base de données :</span>
						<strong>{formatBytes(inspectResult.manifest.stats.databaseSizeBytes)}</strong>
					</div>
					<div>
						<span class="inspect-label">Médias :</span>
						<strong>
							{inspectResult.manifest.stats.uploadsCount} fichiers ({formatBytes(
								inspectResult.manifest.stats.uploadsSizeBytes
							)})
						</strong>
					</div>
				</div>

				<div class="restore-mode-card">
					<div class="mode-badge-title">
						<span class="badge badge-danger">Opération irréversible</span>
						<strong>Option unique : Restauration intégrale depuis l'image</strong>
					</div>
					<p class="mode-desc">
						Le serveur actuel sera réinitialisé pour correspondre fidèlement à l'état de l'image
						(schéma, publications, commentaires et médias). Les éléments créés après cette
						sauvegarde seront supprimés. Après restauration, vous serez automatiquement redirigé
						vers l'écran de connexion.
					</p>
				</div>

				<div class="restore-actions">
					<button
						type="button"
						class="btn btn-danger-solid"
						onclick={triggerRestore}
						disabled={isRestoring || restoreStatus?.status === 'running'}
					>
						{isRestoring || restoreStatus?.status === 'running'
							? 'Traitement en cours...'
							: 'Lancer la restauration intégrale'}
					</button>
					<button
						type="button"
						class="btn btn-secondary"
						onclick={() => (inspectResult = null)}
						disabled={isRestoring || restoreStatus?.status === 'running'}
					>
						Annuler
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- MODALE DE CRÉATION ET MODIFICATION D'UNE CONFIGURATION -->
{#if isModalOpen}
	<div
		class="modal-backdrop"
		role="presentation"
		onclick={() => (isModalOpen = false)}
		onkeydown={(e) => e.key === 'Escape' && (isModalOpen = false)}
	>
		<div
			class="modal-content"
			role="dialog"
			aria-modal="true"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<div class="modal-header">
				<h2>
					{modalMode === 'create' ? 'Créer une configuration Cloud' : 'Modifier la configuration'}
				</h2>
				<button type="button" class="modal-close-btn" onclick={() => (isModalOpen = false)}
					>✕</button
				>
			</div>

			<form
				method="POST"
				action="?/saveConfig"
				use:enhance={() => {
					loadingAction = 'save';
					return async ({ update }) => {
						loadingAction = null;
						await update();
					};
				}}
				class="modal-form"
			>
				<input type="hidden" name="id" value={editingId} />

				<div class="form-group">
					<label for="cfg_name">Nom de la configuration</label>
					<input
						type="text"
						id="cfg_name"
						name="name"
						placeholder="Ex: Mon Nextcloud personnel, Sauvegarde kDrive..."
						bind:value={formName}
						required
						class="input"
					/>
				</div>

				<input type="hidden" name="enabled" value={formEnabled ? 'true' : 'false'} />

				<div class="form-group">
					<label for="cfg_url">URL du dossier Cloud WebDAV</label>
					<input
						type="url"
						id="cfg_url"
						name="webdavUrl"
						placeholder="https://nuage.exemple.com/remote.php/dav/files/user/sauvegardes/"
						bind:value={formWebdavUrl}
						required
						class="input"
					/>
					<span class="field-hint">
						Le dossier parent distant doit être préalablement créé sur votre serveur Cloud.
					</span>
				</div>

				<div class="form-grid">
					<div class="form-group">
						<label for="cfg_user">Nom d'utilisateur Cloud</label>
						<input
							type="text"
							id="cfg_user"
							name="webdavUsername"
							placeholder="admin ou castagne"
							bind:value={formWebdavUsername}
							required
							class="input"
						/>
					</div>

					<div class="form-group">
						<label for="cfg_pass">Mot de passe ou Jeton d'application</label>
						<input
							type="password"
							id="cfg_pass"
							name="webdavPassword"
							placeholder={formHasPassword
								? '•••••••••••• (inchangé)'
								: 'Mot de passe ou App Token'}
							bind:value={formWebdavPassword}
							class="input"
						/>
					</div>

					<div class="form-group">
						<label for="cfg_freq">Fréquence de sauvegarde</label>
						<select id="cfg_freq" name="frequency" bind:value={formFrequency} class="select">
							<option value="daily">Quotidienne (toutes les 24h)</option>
							<option value="weekly">Hebdomadaire (tous les 7 jours)</option>
							<option value="manual">Manuelle uniquement</option>
						</select>
					</div>

					<div class="form-group">
						<label for="cfg_ret">Nombre de sauvegardes conservées (Rétention)</label>
						<input
							type="number"
							id="cfg_ret"
							name="retentionCount"
							min="1"
							max="365"
							bind:value={formRetentionCount}
							class="input"
						/>
					</div>

					<div class="form-group full-width">
						<label for="cfg_chunk">Découpage en fragments (Solution anti-rejet Nginx 413)</label>
						<select id="cfg_chunk" name="chunkSizeMb" bind:value={formChunkSizeMb} class="select">
							<option value={5}>Fragments de 5 Mo (Recommandé si Nginx est très restrictif)</option>
							<option value={10}>Fragments de 10 Mo (Standard sécurisé)</option>
							<option value={25}>Fragments de 25 Mo</option>
							<option value={50}>Fragments de 50 Mo</option>
							<option value={100}>Fragments de 100 Mo</option>
							<option value={0}
								>Archive unique sans découpage (Nécessite client_max_body_size élevé)</option
							>
						</select>
						<span class="field-hint">
							Si le serveur Nginx rejette l'envoi avec l'erreur HTTP 413, sélectionnez 5 Mo ou 10
							Mo.
						</span>
					</div>
				</div>

				<div class="modal-actions">
					<button type="button" class="btn btn-secondary" onclick={() => (isModalOpen = false)}>
						Annuler
					</button>
					<button type="submit" class="btn btn-primary" disabled={loadingAction === 'save'}>
						{loadingAction === 'save' ? 'Enregistrement...' : 'Enregistrer la configuration'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.admin-page {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.page-header {
		border-bottom: 1px solid #e2e8f0;
		padding-bottom: 16px;
	}

	.page-title {
		margin: 0 0 6px 0;
		font-size: 1.5rem;
		font-weight: 700;
		color: #0f172a;
		letter-spacing: -0.02em;
	}

	.page-desc {
		margin: 0;
		color: #64748b;
		font-size: 0.95rem;
	}

	.alert {
		padding: 12px 16px;
		border-radius: 8px;
		font-size: 0.9rem;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.alert-success {
		background: #f0fdf4;
		border: 1px solid #bbf7d0;
		color: #166534;
	}

	.alert-error {
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #991b1b;
	}

	.alert-info {
		background: #eff6ff;
		border: 1px solid #bfdbfe;
		color: #1e40af;
	}

	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 16px;
	}

	.metric-card {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.metric-label {
		font-size: 0.8rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: #64748b;
	}

	.metric-value {
		font-size: 1.7rem;
		font-weight: 700;
		color: #0f172a;
		letter-spacing: -0.02em;
	}

	.metric-desc {
		font-size: 0.82rem;
		color: #94a3b8;
	}

	.card {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.card-header h2,
	.section-header-row h2 {
		margin: 0 0 4px 0;
		font-size: 1.2rem;
		font-weight: 600;
		color: #0f172a;
	}

	.card-header p,
	.section-header-row p {
		margin: 0;
		font-size: 0.88rem;
		color: #64748b;
	}

	.section-header-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
	}

	.security-card {
		border-left: 4px solid #0284c7;
	}

	.security-warning {
		background: #f0f9ff;
		border: 1px solid #bae6fd;
		border-radius: 8px;
		padding: 14px 18px;
	}

	.security-warning strong {
		display: block;
		font-size: 0.9rem;
		color: #0369a1;
		margin-bottom: 4px;
	}

	.security-warning p {
		margin: 0;
		font-size: 0.84rem;
		color: #075985;
		line-height: 1.45;
	}

	.key-container {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		padding: 16px 20px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
	}

	.key-status-text {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.key-badge {
		font-size: 0.82rem;
		font-weight: 700;
		color: #0369a1;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.key-subtext {
		font-size: 0.85rem;
		color: #64748b;
	}

	.key-actions {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.btn-danger-outline {
		background: #ffffff;
		color: #dc2626;
		border: 1px solid #fca5a5;
	}

	.btn-danger-outline:hover:not(:disabled) {
		background: #fef2f2;
	}

	.btn-danger-solid {
		background: #dc2626;
		color: #ffffff;
		border: 1px solid #dc2626;
	}

	.btn-danger-solid:hover:not(:disabled) {
		background: #b91c1c;
	}

	.archive-contents-info {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		padding: 16px 20px;
	}

	.info-title {
		display: block;
		font-size: 0.88rem;
		font-weight: 600;
		color: #1e293b;
		margin-bottom: 8px;
	}

	.file-list {
		margin: 0;
		padding-left: 20px;
		display: flex;
		flex-direction: column;
		gap: 6px;
		color: #475569;
		font-size: 0.85rem;
	}

	.export-actions {
		display: flex;
		align-items: center;
		gap: 16px;
		flex-wrap: wrap;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-family: inherit;
		font-size: 0.875rem;
		font-weight: 600;
		padding: 9px 16px;
		border-radius: 6px;
		cursor: pointer;
		text-decoration: none;
		transition: all 0.15s ease;
		border: 1px solid transparent;
		white-space: nowrap;
	}

	.btn-sm {
		font-size: 0.8rem;
		padding: 7px 12px;
	}

	.btn-large {
		padding: 12px 24px;
		font-size: 0.95rem;
	}

	.btn-primary {
		background: #0f172a;
		color: #ffffff;
		border-color: #0f172a;
	}

	.btn-primary:hover:not(:disabled) {
		background: #1e293b;
	}

	.btn-secondary {
		background: #ffffff;
		color: #334155;
		border-color: #cbd5e1;
	}

	.btn-secondary:hover:not(:disabled) {
		background: #f8fafc;
	}

	.btn-toggle-active {
		background: #f0fdf4;
		color: #166534;
		border-color: #bbf7d0;
	}

	.btn-toggle-paused {
		background: #f8fafc;
		color: #64748b;
		border-color: #cbd5e1;
	}

	.btn-icon-danger {
		background: #ffffff;
		color: #94a3b8;
		border-color: #e2e8f0;
		padding: 7px 10px;
	}

	.btn-icon-danger:hover {
		color: #ef4444;
		border-color: #fca5a5;
		background: #fef2f2;
	}

	.btn:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.help-text {
		font-size: 0.82rem;
		color: #64748b;
	}

	.import-picker-zone {
		display: flex;
		flex-direction: column;
		gap: 16px;
		background: #f8fafc;
		border: 2px dashed #cbd5e1;
		border-radius: 8px;
		padding: 24px;
		transition: all 0.2s ease;
	}

	.import-picker-zone.is-dragging-over {
		border-color: #0284c7;
		background: #f0f9ff;
	}

	.picker-single-wrapper {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 8px;
	}

	.dropdown-anchor {
		position: relative;
		display: inline-block;
	}

	.picker-dropdown-menu {
		position: absolute;
		top: calc(100% + 6px);
		left: 0;
		z-index: 50;
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		box-shadow:
			0 10px 15px -3px rgba(0, 0, 0, 0.1),
			0 4px 6px -4px rgba(0, 0, 0, 0.1);
		min-width: 260px;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.picker-menu-item {
		background: transparent;
		border: none;
		padding: 10px 16px;
		text-align: left;
		font-family: inherit;
		font-size: 0.88rem;
		color: #1e293b;
		cursor: pointer;
		transition: background 0.15s ease;
		display: block;
		width: 100%;
	}

	.picker-menu-item:hover {
		background: #f1f5f9;
		color: #0f172a;
	}

	.picker-drop-hint {
		font-size: 0.82rem;
		color: #64748b;
	}

	.selected-files-summary {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 6px;
		padding: 12px 16px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.parts-list {
		margin: 0;
		padding-left: 18px;
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: 0.82rem;
		color: #475569;
		max-height: 120px;
		overflow-y: auto;
	}

	.import-form-row {
		display: flex;
		align-items: flex-end;
		gap: 16px;
		flex-wrap: wrap;
	}

	.input-with-button {
		display: flex;
		gap: 8px;
	}

	.self-end {
		align-self: flex-end;
	}

	.inspect-box {
		background: #f0fdf4;
		border: 1px solid #bbf7d0;
		border-radius: 8px;
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.inspect-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.inspect-header h3 {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 700;
		color: #166534;
	}

	.inspect-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 12px;
		background: #ffffff;
		border: 1px solid #dcfce7;
		border-radius: 6px;
		padding: 14px;
	}

	.inspect-label {
		display: block;
		font-size: 0.78rem;
		color: #64748b;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.restore-mode-card {
		background: #fff;
		border: 1px solid #fecaca;
		border-left: 4px solid #ef4444;
		border-radius: 6px;
		padding: 14px 16px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.mode-badge-title {
		display: flex;
		align-items: center;
		gap: 10px;
		color: #991b1b;
		font-size: 0.95rem;
	}

	.mode-desc {
		margin: 0;
		font-size: 0.85rem;
		color: #7f1d1d;
		line-height: 1.45;
	}

	.restore-actions {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	/* CONFIGS LIST */
	.configs-list {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.config-card {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		padding: 20px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 24px;
		flex-wrap: wrap;
	}

	.config-card.is-enabled {
		border-left: 4px solid #10b981;
	}

	.config-card.is-disabled {
		border-left: 4px solid #cbd5e1;
		opacity: 0.85;
	}

	.config-main {
		flex: 1;
		min-width: 280px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.config-title-row {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}

	.config-name {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 700;
		color: #0f172a;
	}

	.badges-row {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
	}

	.badge {
		font-size: 0.72rem;
		font-weight: 600;
		padding: 2px 8px;
		border-radius: 9999px;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.badge-success {
		background: #dcfce7;
		color: #166534;
	}

	.badge-neutral {
		background: #e2e8f0;
		color: #475569;
	}

	.badge-info {
		background: #e0f2fe;
		color: #0369a1;
	}

	.badge-danger {
		background: #fee2e2;
		color: #991b1b;
	}

	.badge-outline {
		background: #ffffff;
		border: 1px solid #cbd5e1;
		color: #64748b;
	}

	.config-url code {
		font-family: monospace;
		font-size: 0.82rem;
		color: #475569;
		background: #ffffff;
		padding: 4px 8px;
		border: 1px solid #e2e8f0;
		border-radius: 4px;
		word-break: break-all;
	}

	.config-meta {
		font-size: 0.82rem;
		color: #64748b;
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.status-indicator {
		font-size: 0.75rem;
		font-weight: 600;
		padding: 1px 6px;
		border-radius: 4px;
	}

	.status-ok {
		background: #dcfce7;
		color: #166534;
	}

	.status-err {
		background: #fee2e2;
		color: #991b1b;
	}

	.status-running {
		background: #e0f2fe;
		color: #0369a1;
	}

	.error-box {
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 6px;
		padding: 8px 12px;
		font-size: 0.8rem;
		color: #991b1b;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.test-feedback {
		padding: 8px 12px;
		border-radius: 6px;
		font-size: 0.82rem;
		line-height: 1.4;
	}

	.feedback-success {
		background: #f0fdf4;
		border: 1px solid #bbf7d0;
		color: #166534;
	}

	.feedback-error {
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #991b1b;
	}

	.config-actions {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.empty-state {
		padding: 40px 16px;
		text-align: center;
		color: #64748b;
		background: #f8fafc;
		border: 1px dashed #cbd5e1;
		border-radius: 8px;
	}

	.mt-12 {
		margin-top: 12px;
	}

	/* MODALE */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(15, 23, 42, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px;
		z-index: 1000;
	}

	.modal-content {
		background: #ffffff;
		border-radius: 12px;
		max-width: 600px;
		width: 100%;
		max-height: 90vh;
		overflow-y: auto;
		padding: 24px;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-bottom: 1px solid #e2e8f0;
		padding-bottom: 12px;
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 700;
		color: #0f172a;
	}

	.modal-close-btn {
		background: none;
		border: none;
		font-size: 1.25rem;
		color: #64748b;
		cursor: pointer;
		padding: 4px 8px;
		border-radius: 4px;
	}

	.modal-close-btn:hover {
		background: #f1f5f9;
		color: #0f172a;
	}

	.modal-form {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.form-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 14px;
	}

	@media (max-width: 600px) {
		.form-grid {
			grid-template-columns: 1fr;
		}
	}

	.full-width {
		grid-column: 1 / -1;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 5px;
	}

	.flex-1 {
		flex: 1;
		min-width: 260px;
	}

	.form-group label {
		font-size: 0.84rem;
		font-weight: 600;
		color: #334155;
	}

	.input,
	.select {
		font-family: inherit;
		font-size: 0.875rem;
		padding: 9px 12px;
		border: 1px solid #cbd5e1;
		border-radius: 6px;
		background: #ffffff;
		color: #0f172a;
	}

	.input:focus,
	.select:focus {
		outline: none;
		border-color: #0f172a;
		box-shadow: 0 0 0 1px #0f172a;
	}

	.field-hint {
		font-size: 0.76rem;
		color: #64748b;
	}

	.modal-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 12px;
		margin-top: 8px;
		border-top: 1px solid #e2e8f0;
		padding-top: 16px;
	}
</style>
