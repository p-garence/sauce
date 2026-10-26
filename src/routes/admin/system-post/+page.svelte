<!--
  @component AdminSystemPostPage
  @domain admin/system-post
  @description Page de publication d'annonces officielles et posts système avec diffusion Web Push.
-->
<script lang="ts">
	import type { PageData } from './$types';
	import AdminSystemPost from '$lib/components/admin/AdminSystemPost.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
</script>

<div class="admin-page">
	<header class="page-header">
		<div>
			<h1 class="page-title">Post système et notification globale</h1>
			<p class="page-desc">
				Rédigez un message officiel publié au nom du système et diffusé en temps réel par notification push à tous les membres.
			</p>
		</div>
	</header>

	<div class="page-body">
		<AdminSystemPost trendingTags={data.trendingTags} />
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
