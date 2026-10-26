<!--
  @component AdminStoragePage
  @domain admin/storage
  @description Page d'administration du stockage serveur, quotas de fichiers et détection d'orphelins.
-->
<script lang="ts">
	import type { PageData } from './$types';
	import AdminStorageTab from '$lib/components/admin/AdminStorageTab.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
</script>

<div class="admin-page">
	<header class="page-header">
		<div>
			<h1 class="page-title">Stockage et médias</h1>
			<p class="page-desc">
				Surveillez l'occupation disque globale, analysez la répartition des fichiers et purgez les médias orphelins.
			</p>
		</div>
	</header>

	<div class="page-body">
		<AdminStorageTab serverStorage={data.serverStorage} orphans={data.orphans} />
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
		padding: 24px;
	}
</style>
