<script lang="ts">
	/**
	 * @component SettingsGeneral
	 * @domain settings
	 * @description Onglet Général des paramètres : affichage protégé des identifiants (pseudo, e-mail de connexion) avec boutons d'édition dédiés, comportement de l'app, administration et déconnexion.
	 */

	import { authClient } from '$lib/auth-client';
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import SettingsCard from '$lib/components/settings/ui/SettingsCard.svelte';
	import SettingsRow from '$lib/components/settings/ui/SettingsRow.svelte';
	import SettingsButton from '$lib/components/settings/ui/SettingsButton.svelte';
	import SettingsToggle from './ui/SettingsToggle.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { enhance } from '$app/forms';

	import type { User } from '$lib/types';

	let {
		user,
		form
	}: {
		user: User;
		form?: {
			usernameSuccess?: boolean;
			usernameMessage?: string;
			usernameError?: string;
			emailSuccess?: boolean;
			emailMessage?: string;
			emailError?: string;
		} | null;
	} = $props();

	// Identifiants de connexion
	let initialUsername = $derived(user.username || '');
	let initialEmail = $derived(user.email || '');

	// États d'édition
	let isEditingUsername = $state(false);
	let isEditingEmail = $state(false);

	// svelte-ignore state_referenced_locally
	let usernameInput = $state(user.username || '');
	// svelte-ignore state_referenced_locally
	let emailInput = $state(user.email || '');

	let usernameStatus = $state<{
		checking: boolean;
		available: boolean | null;
		message: string;
	}>({ checking: false, available: null, message: '' });

	let isSubmittingUsername = $state(false);
	let isSubmittingEmail = $state(false);
	let debounceTimeout: ReturnType<typeof setTimeout> | null = null;

	// Synchronisation réactive si les données utilisateur changent
	$effect(() => {
		if (!isEditingUsername) {
			usernameInput = user.username || '';
		}
		if (!isEditingEmail) {
			emailInput = user.email || '';
		}
	});

	function handleUsernameInput(e: Event) {
		const val = (e.target as HTMLInputElement).value.trim();
		usernameInput = val;

		if (debounceTimeout) clearTimeout(debounceTimeout);

		if (!val) {
			usernameStatus = {
				checking: false,
				available: false,
				message: 'Le pseudo ne peut pas être vide.'
			};
			return;
		}

		if (val.toLowerCase() === initialUsername.toLowerCase()) {
			usernameStatus = { checking: false, available: true, message: 'Votre pseudo actuel' };
			return;
		}

		if (val.length < 3) {
			usernameStatus = { checking: false, available: false, message: 'Minimum 3 caractères.' };
			return;
		}

		if (val.length > 30) {
			usernameStatus = { checking: false, available: false, message: 'Maximum 30 caractères.' };
			return;
		}

		if (!/^[a-zA-Z0-9_]+$/.test(val)) {
			usernameStatus = {
				checking: false,
				available: false,
				message: 'Lettres, chiffres et _ uniquement.'
			};
			return;
		}

		usernameStatus = { checking: true, available: null, message: 'Vérification...' };

		debounceTimeout = setTimeout(async () => {
			try {
				const res = await fetch(`/api/users/check-username?username=${encodeURIComponent(val)}`);
				const data = await res.json();
				if (data.available) {
					usernameStatus = { checking: false, available: true, message: '✓ Pseudo disponible' };
				} else {
					usernameStatus = {
						checking: false,
						available: false,
						message: data.reason || '✗ Pseudo indisponible'
					};
				}
			} catch {
				usernameStatus = { checking: false, available: null, message: '' };
			}
		}, 300);
	}

	// Comportement
	let serverDoubleTap = $derived(user.doubleTap ?? false);
	let optDoubleTap = $state<boolean | null>(null);
	let doubleTap = $derived(optDoubleTap !== null ? optDoubleTap : serverDoubleTap);

	let formRef = $state<HTMLFormElement | undefined>();

	function handleChange() {
		formRef?.requestSubmit();
	}

	async function handleLogout() {
		await authClient.signOut();
		await invalidateAll();
		await goto(resolve('/'));
	}
</script>

<SettingsCard title="Comportement de l'app" description="Comportements spécifiques">
	<SettingsToggle
		title="Activer la double touche pour aimer"
		checked={doubleTap}
		onchange={(e: Event) => {
			optDoubleTap = (e.target as HTMLInputElement).checked;
			handleChange();
		}}
	/>
</SettingsCard>

<SettingsCard title="Compte" description="Modifier son pseudo ou adresse de connexion">
	{#if form?.usernameSuccess}
		<div class="feedback-banner success">
			✓ {form.usernameMessage || "Nom d'utilisateur mis à jour."}
		</div>
	{/if}
	{#if form?.usernameError}
		<div class="feedback-banner error">
			✗ {form.usernameError}
		</div>
	{/if}

	{#if form?.emailSuccess}
		<div class="feedback-banner success">
			✓ {form.emailMessage || 'Adresse e-mail mise à jour.'}
		</div>
	{/if}
	{#if form?.emailError}
		<div class="feedback-banner error">
			✗ {form.emailError}
		</div>
	{/if}

	<!-- 1. Pseudo (Nom d'utilisateur) -->
	{#if !isEditingUsername}
		<SettingsRow
			title="Nom d'utilisateur (Pseudo)"
			value={user.username ? `@${user.username}` : 'Non défini'}
			description="Votre identifiant public unique sur l'instance."
		>
			{#snippet action()}
				<button
					type="button"
					class="edit-icon-btn"
					title="Modifier le nom d'utilisateur"
					aria-label="Modifier le nom d'utilisateur"
					onclick={() => {
						isEditingUsername = true;
						usernameInput = user.username || '';
						usernameStatus = { checking: false, available: null, message: '' };
					}}
				>
					<Icon name="action.edit" size={16} />
				</button>
			{/snippet}
		</SettingsRow>
	{:else}
		<div class="inline-edit-box">
			<form
				method="POST"
				action="?/updateUsername"
				use:enhance={() => {
					isSubmittingUsername = true;
					return async ({ update, result }) => {
						await update({ reset: false });
						isSubmittingUsername = false;
						if (result.type === 'success') {
							isEditingUsername = false;
							await invalidateAll();
						}
					};
				}}
			>
				<div class="edit-header">
					<span class="edit-title">Modifier le nom d'utilisateur</span>
					{#if usernameStatus.checking}
						<span class="status-badge checking">Vérification...</span>
					{:else if usernameStatus.available === true && usernameInput.toLowerCase() !== initialUsername.toLowerCase()}
						<span class="status-badge available">Disponible</span>
					{:else if usernameStatus.available === false}
						<span class="status-badge unavailable">{usernameStatus.message}</span>
					{/if}
				</div>

				<input
					id="username"
					name="username"
					type="text"
					value={usernameInput}
					oninput={handleUsernameInput}
					placeholder="nouveau_pseudo"
					class="text-input"
					class:input-error={usernameStatus.available === false}
					class:input-success={usernameStatus.available === true &&
						usernameInput.toLowerCase() !== initialUsername.toLowerCase()}
					required
					autocomplete="off"
				/>
				<span class="field-hint">3 à 30 caractères alphanumériques ou tiret bas (_).</span>

				<div class="edit-actions">
					<button
						type="button"
						class="cancel-btn"
						disabled={isSubmittingUsername}
						onclick={() => {
							isEditingUsername = false;
						}}
					>
						Annuler
					</button>
					<button
						type="submit"
						class="save-btn"
						disabled={isSubmittingUsername ||
							!usernameInput.trim() ||
							usernameInput.trim() === initialUsername ||
							usernameStatus.available === false ||
							usernameStatus.checking}
					>
						{isSubmittingUsername ? 'Enregistrement...' : 'Enregistrer'}
					</button>
				</div>
			</form>
		</div>
	{/if}

	<!-- 2. Adresse e-mail du compte -->
	{#if !isEditingEmail}
		<SettingsRow
			title="Adresse e-mail du compte"
			value={user.email}
			description="Utilisée pour votre connexion et la récupération de mot de passe."
		>
			{#snippet action()}
				<button
					type="button"
					class="edit-icon-btn"
					title="Modifier l'adresse e-mail"
					aria-label="Modifier l'adresse e-mail"
					onclick={() => {
						isEditingEmail = true;
						emailInput = user.email || '';
					}}
				>
					<Icon name="action.edit" size={16} />
				</button>
			{/snippet}
		</SettingsRow>
	{:else}
		<div class="inline-edit-box">
			<form
				method="POST"
				action="?/updateEmail"
				use:enhance={() => {
					isSubmittingEmail = true;
					return async ({ update, result }) => {
						await update({ reset: false });
						isSubmittingEmail = false;
						if (result.type === 'success') {
							isEditingEmail = false;
							await invalidateAll();
						}
					};
				}}
			>
				<div class="edit-header">
					<span class="edit-title">Modifier l'adresse e-mail du compte</span>
				</div>

				<input
					id="email"
					name="email"
					type="email"
					bind:value={emailInput}
					placeholder="nouvelle.adresse@exemple.com"
					class="text-input"
					required
					autocomplete="email"
				/>
				<span class="field-hint"
					>Cette adresse sera immédiatement effective pour vos prochaines connexions.</span
				>

				<div class="edit-actions">
					<button
						type="button"
						class="cancel-btn"
						disabled={isSubmittingEmail}
						onclick={() => {
							isEditingEmail = false;
						}}
					>
						Annuler
					</button>
					<button
						type="submit"
						class="save-btn"
						disabled={isSubmittingEmail ||
							!emailInput.trim() ||
							emailInput.trim().toLowerCase() === initialEmail.toLowerCase()}
					>
						{isSubmittingEmail ? 'Enregistrement...' : 'Enregistrer'}
					</button>
				</div>
			</form>
		</div>
	{/if}
</SettingsCard>

<SettingsCard
	title="À propos & Avancement"
	description="Suivez l'avancement du projet et découvrez les prochaines nouveautés prévues."
>
	<SettingsButton href={resolve('/parametres/calendrier')} variant="secondary">
		Voir la feuille de route
	</SettingsButton>
</SettingsCard>

<form
	bind:this={formRef}
	method="POST"
	action="?/updateBehaviorToggles"
	use:enhance={({ formData }) => {
		formData.set('doubleTap', String(doubleTap));

		return async ({ update }) => {
			await update({ reset: false });
			optDoubleTap = null;
		};
	}}
></form>

{#if user?.role === 'admin'}
	<SettingsCard
		title="Administration"
		description="Accédez à l'interface de gestion de l'instance."
	>
		<SettingsButton href={resolve('/admin')} variant="info">
			Ouvrir le panneau d'administration
		</SettingsButton>
	</SettingsCard>
{/if}

<SettingsCard
	title="Déconnexion"
	description="Vous pourrez vous reconnecter à tout moment avec vos identifiants."
>
	<SettingsButton variant="danger" onclick={handleLogout}>Se déconnecter</SettingsButton>
</SettingsCard>

<style>
	.edit-icon-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 34px;
		height: 34px;
		border-radius: 8px;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		color: #475569;
		cursor: pointer;
		transition: all 0.2s ease;
	}
	.edit-icon-btn:hover {
		background: #f1f5f9;
		color: #0f172a;
		border-color: #cbd5e1;
	}
	.inline-edit-box {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		padding: 14px;
		margin: 8px 0;
	}
	.edit-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 8px;
	}
	.edit-title {
		font-size: 0.9rem;
		font-weight: 600;
		color: #1e293b;
	}
	.status-badge {
		font-size: 0.75rem;
		font-weight: 500;
		padding: 2px 8px;
		border-radius: 9999px;
	}
	.status-badge.checking {
		background: #e2e8f0;
		color: #64748b;
	}
	.status-badge.available {
		background: #dcfce7;
		color: #15803d;
	}
	.status-badge.unavailable {
		background: #fee2e2;
		color: #dc2626;
	}
	.text-input {
		width: 100%;
		padding: 9px 12px;
		border: 1px solid #cbd5e1;
		border-radius: 6px;
		font-size: 0.95rem;
		background: white;
		box-sizing: border-box;
		transition:
			border-color 0.2s,
			box-shadow 0.2s;
	}
	.text-input:focus {
		outline: none;
		border-color: #0f172a;
		box-shadow: 0 0 0 1px #0f172a;
	}
	.text-input.input-error {
		border-color: #ef4444;
	}
	.text-input.input-success {
		border-color: #22c55e;
	}
	.field-hint {
		display: block;
		font-size: 0.75rem;
		color: #64748b;
		margin-top: 4px;
	}
	.edit-actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		margin-top: 12px;
	}
	.cancel-btn {
		background: white;
		border: 1px solid #cbd5e1;
		color: #475569;
		padding: 7px 14px;
		border-radius: 6px;
		font-size: 0.85rem;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.15s ease;
	}
	.cancel-btn:hover {
		background: #f1f5f9;
		color: #0f172a;
	}
	.save-btn {
		background: #0f172a;
		border: 1px solid #0f172a;
		color: white;
		padding: 7px 16px;
		border-radius: 6px;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		transition: opacity 0.15s ease;
	}
	.save-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	.feedback-banner {
		padding: 10px 14px;
		border-radius: 8px;
		font-size: 0.875rem;
		line-height: 1.4;
		margin-bottom: 12px;
	}
	.feedback-banner.success {
		background: #ecfdf5;
		color: #065f46;
		border: 1px solid #a7f3d0;
	}
	.feedback-banner.error {
		background: #fef2f2;
		color: #991b1b;
		border: 1px solid #fecaca;
	}
</style>
