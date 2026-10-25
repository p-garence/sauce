<script lang="ts">
	/**
	 * @component FollowButton
	 * @domain Profile / Social
	 * @description Bouton d'abonnement / désabonnement avec déclencheur de menu popover de groupes
	 * @responsibilities
	 * - Synchroniser en temps réel le statut de suivi via `globalFollowState` et `globalStream`
	 * - Proposer deux variantes graphiques : 'profile' (grand split button) et 'small' (compact)
	 * - Déclencher l'ouverture du popover de gestion des groupes (UserGroupAssignPopover)
	 */
	import { globalStream } from '$lib/client/globalStreamState.svelte';
	import { globalFollowState, type FollowStatus } from '$lib/client/followState.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import UserGroupAssignPopover from '$lib/components/profile/UserGroupAssignPopover.svelte';

	interface Props {
		/** Identifiant de l'utilisateur cible */
		targetId: string;
		/** Variante d'affichage ('profile' ou 'small') */
		variant?: 'profile' | 'small';
		/** Statut initial d'abonnement fourni par le SSR */
		initialStatus?: 'following' | 'pending' | 'none' | boolean | null;
		/** Callback optionnel lors du changement d'état */
		onToggle?: (status: 'following' | 'pending' | 'none') => void;
	}

	let {
		targetId,
		variant = 'profile',
		initialStatus = undefined,
		onToggle = undefined
	}: Props = $props();

	// Synchronisation immédiate avec le statut transmis par la page (SSR ou navigation)
	$effect(() => {
		if (initialStatus !== undefined && initialStatus !== null) {
			const status: FollowStatus =
				typeof initialStatus === 'boolean' ? (initialStatus ? 'following' : 'none') : initialStatus;
			globalFollowState.set(targetId, status);
		}
	});

	// followStatus est directement réactif et synchronisé avec tous les autres boutons de l'auteur
	let followStatus = $derived(globalFollowState.get(targetId, 'none') || 'none');
	let isInitialized = $derived(globalFollowState.has(targetId));
	let actionLoading = $state(false);

	// États pour le popover d'ajout aux groupes
	let isDropdownOpen = $state(false);

	$effect(() => {
		let isActive = true;
		if (!targetId) return;

		// Si le store connaît déjà le statut pour cet utilisateur, on évite l'appel réseau
		if (globalFollowState.has(targetId)) return;

		fetch(`/api/follow?targetId=${targetId}`)
			.then((res) => res.json())
			.then((data) => {
				if (!isActive) return;
				const status: FollowStatus = data.isFollowing
					? 'following'
					: data.isPending
						? 'pending'
						: 'none';
				globalFollowState.set(targetId, status);
			})
			.catch((err) => {
				console.error('Erreur init follow button :', err);
				globalFollowState.set(targetId, 'none');
			});

		return () => {
			isActive = false;
		};
	});

	$effect(() => {
		if (followStatus === 'pending' && globalStream.notifs) {
			const requestHasBeenAccepted = globalStream.notifs.some(
				(notif) =>
					notif.type === 'follow' &&
					notif.actor?.id === targetId &&
					notif.content?.includes('accepté')
			);
			if (requestHasBeenAccepted) {
				globalFollowState.set(targetId, 'following');
				if (onToggle) onToggle('following');
			}
		}
	});

	function toggleDropdown(e?: Event) {
		if (e) e.stopPropagation();
		isDropdownOpen = !isDropdownOpen;
	}

	async function toggleFollow(e?: Event) {
		if (e) e.stopPropagation();
		if (actionLoading || !isInitialized) return;

		actionLoading = true;
		const previousStatus = followStatus;
		const action =
			followStatus === 'following' || followStatus === 'pending' ? 'unfollow' : 'follow';
		const optimisticNext: FollowStatus = action === 'follow' ? 'pending' : 'none';

		// Met à jour instantanément TOUS les boutons de cet auteur dans l'application
		globalFollowState.set(targetId, optimisticNext);

		try {
			const res = await fetch('/api/follow', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ targetId, action })
			});

			if (!res.ok) throw new Error('Erreur serveur');
			const data = await res.json();

			const finalStatus: FollowStatus =
				data.status === 'accepted' ? 'following' : data.status === 'pending' ? 'pending' : 'none';

			globalFollowState.set(targetId, finalStatus);
			if (onToggle) onToggle(finalStatus);
		} catch (error) {
			console.log(error);
			globalFollowState.set(targetId, previousStatus);
		} finally {
			actionLoading = false;
		}
	}

	function handleClickOutside(event: MouseEvent) {
		if (isDropdownOpen) {
			const target = event.target as HTMLElement | null;
			if (target && !target.closest(`.follow-container-${targetId}`)) {
				isDropdownOpen = false;
			}
		}
	}
</script>

<svelte:window onclick={handleClickOutside} />

<div class="follow-container follow-container-{targetId}">
	{#if variant === 'profile'}
		<div class="split-btn-group">
			<button
				type="button"
				class="btn-action"
				class:follow={followStatus === 'none'}
				class:unfollow={followStatus === 'following'}
				class:pending={followStatus === 'pending'}
				class:has-trigger={true}
				onclick={toggleFollow}
				disabled={actionLoading || !isInitialized}
			>
				{#if !isInitialized}
					...
				{:else if followStatus === 'following'}
					Abonné(e)
				{:else if followStatus === 'pending'}
					Demande envoyée
				{:else}
					S'abonner
				{/if}
			</button>
			<button
				type="button"
				class="btn-action-trigger"
				class:follow={followStatus === 'none'}
				class:unfollow={followStatus === 'following'}
				class:pending={followStatus === 'pending'}
				onclick={toggleDropdown}
				title="Gérer les groupes"
				aria-label="Gérer les groupes"
			>
				<Icon name="status.users" size={16} />
			</button>
		</div>
	{:else if variant === 'small'}
		<div class="small-split-group">
			<button
				type="button"
				class="btn-follow-small"
				class:following={followStatus === 'following'}
				class:pending={followStatus === 'pending'}
				onclick={toggleFollow}
				disabled={actionLoading || !isInitialized}
			>
				{#if !isInitialized}
					...
				{:else if followStatus === 'following'}
					Suivi
				{:else if followStatus === 'pending'}
					En attente
				{:else}
					Suivre
				{/if}
			</button>
			<button
				type="button"
				class="btn-small-trigger"
				class:following={followStatus === 'following'}
				onclick={toggleDropdown}
				title="Gérer les groupes"
				aria-label="Gérer les groupes"
			>
				<Icon name="status.users" size={13} />
			</button>
		</div>
	{/if}

	{#if isDropdownOpen}
		<UserGroupAssignPopover {targetId} onClose={() => (isDropdownOpen = false)} />
	{/if}
</div>

<style>
	.follow-container {
		position: relative;
		display: inline-block;
	}

	/* === VARIANT PROFILE : SPLIT BUTTON === */
	.split-btn-group {
		display: flex;
		align-items: stretch;
		width: 100%;
		min-width: 160px;
		max-width: 260px;
	}
	.btn-action {
		width: 100%;
		min-width: 150px;
		max-width: 250px;
		display: block;
		text-align: center;
		padding: 10px 16px;
		font-weight: bold;
		font-size: 0.95rem;
		border-radius: 8px;
		cursor: pointer;
		border: none;
		transition:
			background-color 0.2s,
			color 0.2s;
	}
	.btn-action.has-trigger {
		border-top-right-radius: 0;
		border-bottom-right-radius: 0;
		flex: 1;
		min-width: 0;
	}
	.btn-action.follow {
		background: #0ea5e9;
		color: white;
	}
	.btn-action.unfollow {
		background: #f1f5f9;
		color: #1e293b;
		border: 1px solid #cbd5e1;
	}
	.btn-action.unfollow:hover {
		background: #e2e8f0;
	}
	.btn-action.pending {
		background: #f8fafc;
		color: #64748b;
		border: 1px dashed #cbd5e1;
	}
	.btn-action:disabled {
		opacity: 0.5;
		cursor: wait;
	}

	.btn-action-trigger {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0 12px;
		border: none;
		border-top-right-radius: 8px;
		border-bottom-right-radius: 8px;
		cursor: pointer;
		transition:
			background-color 0.2s,
			color 0.2s;
	}
	.btn-action-trigger.follow {
		background: #0ea5e9;
		color: white;
		border-left: 1px solid rgba(255, 255, 255, 0.25);
	}
	.btn-action-trigger.follow:hover {
		background: #0284c7;
	}
	.btn-action-trigger.unfollow {
		background: #f1f5f9;
		color: #1e293b;
		border: 1px solid #cbd5e1;
		border-left: none;
	}
	.btn-action-trigger.unfollow:hover {
		background: #e2e8f0;
	}
	.btn-action-trigger.pending {
		background: #f8fafc;
		color: #64748b;
		border: 1px dashed #cbd5e1;
		border-left: none;
	}

	/* === VARIANT SMALL : BOUTON SUIVI + DÉCLENCHEUR GROUPE === */
	.small-split-group {
		display: inline-flex;
		align-items: center;
		gap: 2px;
	}
	.btn-follow-small {
		background: none;
		border: none;
		font-weight: bold;
		color: #0ea5e9;
		font-size: 0.9rem;
		cursor: pointer;
		padding: 12px;
		border-radius: 4px;
		transition: background-color 0.2s;
	}
	.btn-follow-small:hover {
		background: #f0f9ff;
	}
	.btn-follow-small.following {
		color: #64748b;
	}
	.btn-follow-small.following:hover {
		background: #f1f5f9;
	}
	.btn-follow-small.pending {
		color: #94a3b8;
		font-style: italic;
	}
	.btn-follow-small:disabled {
		opacity: 0.5;
		cursor: wait;
	}

	.btn-small-trigger {
		background: none;
		border: none;
		color: #0ea5e9;
		cursor: pointer;
		padding: 8px 6px;
		border-radius: 4px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		transition: background-color 0.2s;
	}
	.btn-small-trigger:hover {
		background: #f0f9ff;
	}
	.btn-small-trigger.following {
		color: #64748b;
	}
	.btn-small-trigger.following:hover {
		background: #f1f5f9;
	}
</style>
