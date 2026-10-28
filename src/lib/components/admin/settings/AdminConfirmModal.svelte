<!--
  @component AdminConfirmModal
  @domain admin
  @description Boîte de dialogue de confirmation sobre pour la bascule du mode de l'instance (Public vs Privé).
  @responsibilities
    - Présenter clairement les conséquences de la bascule de visibilité globale de l'instance.
    - Exiger une confirmation explicite de l'administrateur avant diffusion de la notification système.
-->
<script lang="ts">
	interface Props {
		/** Indique si la modale est visible */
		isOpen: boolean;
		/** Nouveau mode visé ('public' ou 'private') */
		targetStatus: 'public' | 'private';
		/** En cours de traitement serveur */
		loading?: boolean;
		/** Callback appelé lors de la confirmation */
		onConfirm: () => void;
		/** Callback appelé lors de l'annulation ou fermeture */
		onCancel: () => void;
	}

	let { isOpen, targetStatus, loading = false, onConfirm, onCancel }: Props = $props();
</script>

{#if isOpen}
	<div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
		<div class="modal-card">
			<h2 id="confirm-modal-title" class="modal-title">
				{targetStatus === 'private'
					? "Basculer l'instance en mode Privé"
					: "Basculer l'instance en mode Public"}
			</h2>

			<div class="modal-body">
				{#if targetStatus === 'private'}
					<p class="warning-text">
						Attention : En mode privé, seuls les utilisateurs connectés auront accès à l'instance.
						Les visiteurs anonymes seront automatiquement redirigés vers la page de connexion.
					</p>
					<ul class="impact-list">
						<li>
							Les publications marquées comme publiques ne seront plus accessibles sur le web.
						</li>
						<li>
							Un badge informatif sera affiché sur les publications publiques existantes sans
							altérer la base de données.
						</li>
						<li>
							L'option de publication publique sera retirée de l'éditeur de post pour les nouveaux
							contenus.
						</li>
						<li>
							Une notification système sera diffusée à l'ensemble des utilisateurs pour les en
							informer.
						</li>
					</ul>
				{:else}
					<p class="info-text">
						En mode public, les publications créées avec la visibilité publique redeviendront
						accessibles aux visiteurs non connectés.
					</p>
					<ul class="impact-list">
						<li>L'accès au flux public et aux profils sera de nouveau ouvert aux visiteurs.</li>
						<li>L'option de publication publique sera réactivée dans l'éditeur de post.</li>
						<li>
							Une notification système sera diffusée à l'ensemble des utilisateurs pour les en
							informer.
						</li>
					</ul>
				{/if}
			</div>

			<div class="modal-actions">
				<button type="button" class="btn-secondary" onclick={onCancel} disabled={loading}>
					Annuler
				</button>
				<button
					type="button"
					class={targetStatus === 'private' ? 'btn-danger' : 'btn-primary'}
					onclick={onConfirm}
					disabled={loading}
				>
					{loading
						? 'Enregistrement en cours...'
						: targetStatus === 'private'
							? 'Confirmer le passage en privé'
							: 'Confirmer le passage en public'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(15, 23, 42, 0.7);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 16px;
	}

	.modal-card {
		background: #ffffff;
		border-radius: 12px;
		width: 100%;
		max-width: 520px;
		padding: 24px;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
		border: 1px solid #e2e8f0;
	}

	.modal-title {
		font-size: 1.2rem;
		font-weight: 700;
		color: #0f172a;
		margin: 0 0 16px 0;
	}

	.modal-body {
		font-size: 0.92rem;
		line-height: 1.55;
		color: #334155;
		margin-bottom: 24px;
	}

	.warning-text {
		background: #fef3c7;
		border-left: 4px solid #f59e0b;
		padding: 10px 12px;
		border-radius: 4px;
		color: #92400e;
		font-weight: 500;
		margin-bottom: 14px;
	}

	.info-text {
		background: #eff6ff;
		border-left: 4px solid #3b82f6;
		padding: 10px 12px;
		border-radius: 4px;
		color: #1e40af;
		font-weight: 500;
		margin-bottom: 14px;
	}

	.impact-list {
		margin: 0;
		padding-left: 20px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.impact-list li {
		color: #475569;
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
	}

	.btn-secondary {
		padding: 8px 16px;
		border-radius: 6px;
		border: 1px solid #cbd5e1;
		background: #ffffff;
		color: #475569;
		font-weight: 500;
		cursor: pointer;
	}

	.btn-secondary:hover:not(:disabled) {
		background: #f8fafc;
	}

	.btn-primary {
		padding: 8px 18px;
		border-radius: 6px;
		border: none;
		background: #0284c7;
		color: #ffffff;
		font-weight: 600;
		cursor: pointer;
	}

	.btn-primary:hover:not(:disabled) {
		background: #0369a1;
	}

	.btn-danger {
		padding: 8px 18px;
		border-radius: 6px;
		border: none;
		background: #dc2626;
		color: #ffffff;
		font-weight: 600;
		cursor: pointer;
	}

	.btn-danger:hover:not(:disabled) {
		background: #b91c1c;
	}

	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
