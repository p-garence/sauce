<!--
  @component AdminDocsPage
  @domain admin/docs
  @description Page d'accès à la documentation technique d'administration et Wiki Dev.
-->
<script lang="ts">
	import AdminDocsTab from '$lib/components/admin/AdminDocsTab.svelte';
</script>

<div class="admin-page">
	<header class="page-header">
		<div>
			<h1 class="page-title">Documentation et architecture</h1>
			<p class="page-desc">
				Guides techniques d'exploitation, architecture du système et documentation interactive du Wiki Dev.
			</p>
		</div>
	</header>

	<div class="page-body">
		<AdminDocsTab />
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
