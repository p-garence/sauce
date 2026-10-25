<script lang="ts">
	/**
	 * @component ChatMessageRequestsBanner
	 * @domain chat
	 * @description Bandeaux de statut des demandes de messages (en attente, approbation requise, refusé, bloqué, lecture seule).
	 *
	 * @responsibilities
	 * - Informer l'utilisateur sur l'état de la relation (bloqué, refusé, salon restreint).
	 * - Permettre l'envoi d'un message initial d'introduction lorsque la demande est initiée.
	 * - Proposer les actions d'acceptation ou de refus d'une invitation reçue.
	 */

	import { enhance } from '$app/forms';
	import type { Message } from '$lib/types';

	type ChatMessage = Message & {
		sender?: { name: string | null; username: string | null; image: string | null } | null;
	};

	interface Props {
		/** Nom ou titre de l'interlocuteur */
		title: string;
		/** L'utilisateur courant a-t-il bloqué l'interlocuteur */
		amIBlocked?: boolean;
		/** L'interlocuteur a-t-il bloqué l'utilisateur courant */
		targetBlocked?: boolean;
		/** L'utilisateur courant a-t-il refusé la demande */
		amIRefused?: boolean;
		/** L'interlocuteur a-t-il refusé la demande */
		targetRefused?: boolean;
		/** La demande vers l'interlocuteur est-elle en attente */
		targetPending?: boolean;
		/** La demande reçue est-elle en attente de notre acceptation */
		amIPending?: boolean;
		/** L'utilisateur courant a-t-il déjà envoyé un message dans ce chat */
		hasSentMessages?: boolean;
		/** L'utilisateur a-t-il les droits d'écriture (ex: membre dans groupe non restreint) */
		canWrite?: boolean;
		/** Callback déclenché lors de l'envoi d'un message d'introduction */
		onIntroSent?: (newMessage: ChatMessage) => void;
	}

	let {
		title,
		amIBlocked = false,
		targetBlocked = false,
		amIRefused = false,
		targetRefused = false,
		targetPending = false,
		amIPending = false,
		hasSentMessages = false,
		canWrite = true,
		onIntroSent
	}: Props = $props();

	let isSubmitting = $state(false);
</script>

{#if amIBlocked}
	<div class="readonly-banner">Vous avez bloqué cet utilisateur.</div>
{:else if targetBlocked}
	<div class="readonly-banner">Cet utilisateur est indisponible.</div>
{:else if amIRefused}
	<div class="readonly-banner">Vous avez refusé cette demande de message.</div>
{:else if targetRefused}
	<div class="readonly-banner">{title} n'a pas accepté votre demande.</div>
{:else if targetPending && !amIPending}
	{#if hasSentMessages}
		<div class="readonly-banner">
			Demande envoyée. En attente de l'approbation de {title}.
		</div>
	{:else}
		<div class="intro-banner">
			<p>
				<strong>{title}</strong> doit accepter votre demande. Envoyez un message d'introduction :
			</p>
		</div>
		<form
			method="POST"
			action="?/sendMessage"
			class="message-form"
			use:enhance={() => {
				isSubmitting = true;
				return async ({ result, update }) => {
					if (result.type === 'success' && result.data?.newMessage && onIntroSent) {
						onIntroSent(result.data.newMessage as ChatMessage);
					}
					await update({ reset: true });
					isSubmitting = false;
				};
			}}
		>
			<input
				type="text"
				name="content"
				placeholder="Écrire votre message d'introduction..."
				required
				disabled={isSubmitting}
			/>
			<button type="submit" disabled={isSubmitting}>Envoyer</button>
		</form>
	{/if}
{:else if amIPending}
	<div class="pending-actions-banner">
		<p><strong>{title}</strong> souhaite discuter avec vous.</p>
		<div class="pending-buttons">
			<form
				method="POST"
				action="?/acceptChat"
				use:enhance={() => {
					return async ({ update }) => {
						await update();
					};
				}}
			>
				<button type="submit" class="btn-accept-large">Accepter</button>
			</form>
			<form
				method="POST"
				action="?/rejectChat"
				use:enhance={() => {
					return async ({ update }) => {
						await update();
					};
				}}
			>
				<button type="submit" class="btn-reject-large">Refuser</button>
			</form>
		</div>
	</div>
{:else if !canWrite}
	<div class="readonly-banner">Seuls les administrateurs peuvent envoyer des messages.</div>
{/if}

<style>
	.readonly-banner {
		flex-shrink: 0;
		padding: 16px;
		text-align: center;
		background: #f8fafc;
		color: #64748b;
		font-size: 0.9rem;
		font-weight: 500;
		border-top: 1px solid #eaeaea;
	}

	.intro-banner {
		padding: 12px 16px;
		background: #f0f9ff;
		color: #0369a1;
		font-size: 0.85rem;
		border-top: 1px solid #bae6fd;
		text-align: center;
	}

	.intro-banner p {
		margin: 0;
	}

	.message-form {
		display: flex;
		gap: 8px;
		padding: 12px 16px;
		background: #ffffff;
		border-top: 1px solid #f0f0f0;
	}

	.message-form input {
		flex: 1;
		padding: 10px 16px;
		border: 1px solid #e2e8f0;
		border-radius: 20px;
		font-size: 0.95rem;
		outline: none;
	}

	.message-form input:focus {
		border-color: #0ea5e9;
	}

	.message-form button {
		background: #0ea5e9;
		color: white;
		border: none;
		padding: 0 20px;
		border-radius: 20px;
		font-weight: bold;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.message-form button:hover:not(:disabled) {
		background: #0284c7;
	}

	.message-form button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.pending-actions-banner {
		padding: 16px;
		background: #f8fafc;
		border-top: 1px solid #e2e8f0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		text-align: center;
	}

	.pending-actions-banner p {
		margin: 0;
		font-size: 0.95rem;
		color: #1e293b;
	}

	.pending-buttons {
		display: flex;
		gap: 12px;
	}

	.btn-accept-large {
		background: #0ea5e9;
		color: #ffffff;
		border: none;
		padding: 8px 24px;
		border-radius: 20px;
		font-weight: 700;
		font-size: 0.9rem;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.btn-accept-large:hover {
		background: #0284c7;
	}

	.btn-reject-large {
		background: #ffffff;
		color: #dc2626;
		border: 1px solid #fca5a5;
		padding: 8px 24px;
		border-radius: 20px;
		font-weight: 600;
		font-size: 0.9rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-reject-large:hover {
		background: #fef2f2;
	}
</style>
