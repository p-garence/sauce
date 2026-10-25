<!--
  @component SetupPrivacyStep
  @domain setup
  @description Étape 2 de l'onboarding : configuration de la confidentialité initiale du compte.
  @responsibilities
    - Ajuster la politique d'approbation manuelle des abonnés
    - Ajuster la politique d'approbation des messages directs
    - Définir la visibilité publique des listes d'abonnés et d'abonnements
    - Piloter la navigation précédente ou suivante
-->
<script lang="ts">
	import SettingsToggle from '$lib/components/settings/ui/SettingsToggle.svelte';

	/**
	 * Propriétés du composant SetupPrivacyStep
	 */
	interface Props {
		/** Nécessite une approbation manuelle pour s'abonner */
		requireFollowRequest: boolean;
		/** Nécessite une approbation manuelle pour recevoir des messages de non-abonnés */
		requireMessageApproval: boolean;
		/** Afficher la liste des abonnés sur le profil public */
		showFollowers: boolean;
		/** Afficher la liste des abonnements sur le profil public */
		showFollowing: boolean;
		/** Callback pour revenir à l'étape précédente */
		onPrev: () => void;
		/** Callback pour passer à l'étape suivante */
		onNext: () => void;
	}

	let {
		requireFollowRequest = $bindable(false),
		requireMessageApproval = $bindable(false),
		showFollowers = $bindable(true),
		showFollowing = $bindable(true),
		onPrev,
		onNext
	}: Props = $props();
</script>

<div class="step-content">
	<h2 class="title">Confidentialité</h2>
	<p class="subtitle">Ces paramètres restent modifiables à tout moment.</p>

	<div class="privacy-list">
		<SettingsToggle title="Approuver les abonnés" bind:checked={requireFollowRequest} />
		<SettingsToggle title="Approuver les messages" bind:checked={requireMessageApproval} />
		<SettingsToggle title="Montrer mes abonnés" bind:checked={showFollowers} />
		<SettingsToggle title="Montrer mes abonnements" bind:checked={showFollowing} />
	</div>

	<div class="actions space-between">
		<button type="button" class="btn-secondary" onclick={onPrev}>Retour</button>
		<button type="button" class="btn-primary" onclick={onNext}>Suivant</button>
	</div>
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

	.privacy-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-bottom: 24px;
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
