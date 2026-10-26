<!--
  @component AdminAppearancePage
  @domain admin/appearance
  @description Page d'administration de l'apparence, packs d'icônes et émojis officiels de l'instance.
-->
<script lang="ts">
	import type { PageData } from './$types';
	import AdminAppearance from '$lib/components/admin/AdminAppearance.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
</script>

<div class="admin-page">
	<header class="page-header">
		<div>
			<h1 class="page-title">Apparence et personnalisation</h1>
			<p class="page-desc">
				Configurez les packs d'icônes par défaut et la bibliothèque d'émojis officiels mis à disposition de tous les membres.
			</p>
		</div>
	</header>

	<div class="page-body">
		<AdminAppearance
			instanceSettings={data.instanceSettings}
			publishedIconSets={data.publishedIconSets}
			publishedEmojiSets={data.publishedEmojiSets}
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
		padding: 24px;
	}
</style>
