<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHeader from '$lib/components/navigation/PageHeader.svelte';
	import FollowButton from '$lib/components/profile/FollowButton.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	let { data } = $props();
</script>

<div class="page-container">
	<PageHeader
		title="En commun"
		username={data.profile.username ?? undefined}
		back_location="/profil/{data.profile.username}"
	/>

	<div class="list-container">
		{#if data.users.length === 0}
			<div class="empty-state">
				<span class="icon"><Icon name="status.users" size={32} /></span>
				<p>Aucun ami en commun.</p>
			</div>
		{/if}

		{#each data.users as user (user.id)}
			<div class="user-row">
				<a href={resolve(`/profil/${user.username}`)} class="user-info">
					<div class="avatar-container">
						{#if user.image}
							<img src={user.image} alt={user.username} class="avatar" />
						{:else}
							<div class="avatar-placeholder">{(user.username || '?').charAt(0).toUpperCase()}</div>
						{/if}
					</div>
					<div class="names">
						<strong>{user.name || user.username}</strong>
						<span>@{user.username}</span>
					</div>
				</a>

				{#if user.id !== data.currentUserId}
					<div class="action-btn">
						<FollowButton targetId={user.id} variant="small" />
					</div>
				{/if}
			</div>
		{/each}
	</div>
</div>

<style>
	.page-container {
		width: 100%;
		max-width: var(--max-content-width, 600px);
		margin: 0 auto;
		background: #fff;
		flex: 1;
	}
	.list-container {
		padding: 8px 16px;
	}
	.empty-state {
		text-align: center;
		color: #64748b;
		padding: 64px 16px;
	}
	.empty-state .icon {
		font-size: 2.5rem;
		display: block;
		margin-bottom: 12px;
	}
	.user-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 0;
		border-bottom: 1px solid #f1f5f9;
	}
	.user-info {
		display: flex;
		align-items: center;
		gap: 12px;
		text-decoration: none;
		color: inherit;
		flex: 1;
		min-width: 0;
	}
	.avatar-container {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		overflow: hidden;
		background: #f1f5f9;
		flex-shrink: 0;
	}
	.avatar {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.avatar-placeholder {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: bold;
		color: #64748b;
	}
	.names {
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	.names strong {
		font-size: 0.95rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		color: #1e293b;
	}
	.names span {
		font-size: 0.85rem;
		color: #64748b;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.action-btn {
		flex-shrink: 0;
		margin-left: 12px;
	}
</style>
