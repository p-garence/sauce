<script lang="ts">
	/**
	 * @component ChatGroupDangerCard
	 * @domain chat
	 * @description Zone des actions irréversibles d'un groupe (quitter le groupe avec confirmation).
	 *
	 * @responsibilities
	 * - Proposer le formulaire de départ volontaire du groupe via `?/leaveGroup`.
	 * - Afficher les alertes ou erreurs de départ (ex: dernier administrateur).
	 */

	import { enhance } from '$app/forms';

	let leaveError = $state('');
</script>

<section class="danger-zone">
	{#if leaveError}
		<div class="error-msg" style="margin-bottom: 12px;">{leaveError}</div>
	{/if}

	<form
		method="POST"
		action="?/leaveGroup"
		use:enhance={() => {
			return async ({ result, update }) => {
				if (result.type === 'failure' || (result.type === 'success' && result.data?.error)) {
					leaveError = result.data?.error as string;
				}
				await update({ reset: false });
			};
		}}
	>
		<button
			type="submit"
			class="btn-danger"
			onclick={(e) => {
				if (!confirm('Voulez-vous vraiment quitter ce groupe ?')) {
					e.preventDefault();
				}
			}}
		>
			Quitter le groupe
		</button>
	</form>
</section>

<style>
	.danger-zone {
		margin-top: auto;
		padding-top: 24px;
		border-top: 1px solid #fee2e2;
		width: 100%;
		box-sizing: border-box;
	}

	.btn-danger {
		width: 100%;
		padding: 14px;
		background: white;
		color: #ef4444;
		font-weight: bold;
		font-size: 1rem;
		border: 2px solid #ef4444;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-danger:hover {
		background: #ef4444;
		color: white;
	}

	.error-msg {
		color: #ef4444;
		font-size: 0.9rem;
		font-weight: 600;
		text-align: center;
	}
</style>
