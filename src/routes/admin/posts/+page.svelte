<!--
  @component AdminPostsPage
  @domain admin/posts
  @description Page de modération des publications de l'instance.
-->
<script lang="ts">
	import type { PageData } from './$types';
	import AdminPostsTab from '$lib/components/admin/AdminPostsTab.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
</script>

<div class="admin-page">
	<header class="page-header">
		<div>
			<h1 class="page-title">Modération des publications</h1>
			<p class="page-desc">
				Surveillez et modérez les publications de l'instance ({data.totalPosts} posts au total).
			</p>
		</div>
	</header>

	<div class="page-body">
		<AdminPostsTab
			initialPosts={data.posts}
			initialCursor={data.postsCursor}
			totalPosts={data.totalPosts}
		/>
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
