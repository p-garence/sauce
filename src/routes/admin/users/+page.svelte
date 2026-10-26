<!--
  @component AdminUsersPage
  @domain admin/users
  @description Page de gestion des membres de l'instance (rôles, statut, quotas, clés d'invitation).
-->
<script lang="ts">
	import type { PageData } from './$types';
	import AdminUsersTab from '$lib/components/admin/AdminUsersTab.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
</script>

<div class="admin-page">
	<header class="page-header">
		<div>
			<h1 class="page-title">Gestion des utilisateurs</h1>
			<p class="page-desc">
				Administrez les comptes de l'instance ({data.users.length} membres) : modération, rôles, quotas de stockage et parrainage.
			</p>
		</div>
	</header>

	<div class="page-body">
		<AdminUsersTab users={data.users} />
	</div>
</div>

<style>
	.admin-page {
		display: flex;
		flex-direction: column;
		gap: 20px;
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

	.page-body {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		padding: 20px;
	}
</style>
