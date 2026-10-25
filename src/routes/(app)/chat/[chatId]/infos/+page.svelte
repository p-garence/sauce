<script lang="ts">
	/**
	 * @component ChatGroupInfosPage
	 * @domain chat
	 * @description Page de consultation et de gestion des paramètres et participants d'un groupe de discussion.
	 *
	 * @responsibilities
	 * - Orchestrer les cartes modulaires d'informations générales, de membres et d'actions critiques.
	 * - Proposer le retour direct vers le chat actif.
	 */

	import PageHeader from '$lib/components/navigation/PageHeader.svelte';
	import type { PageData } from './$types';
	import ChatGroupMetaCard from '$lib/components/chat/group-infos/ChatGroupMetaCard.svelte';
	import ChatGroupMembersList from '$lib/components/chat/group-infos/ChatGroupMembersList.svelte';
	import ChatGroupDangerCard from '$lib/components/chat/group-infos/ChatGroupDangerCard.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
</script>

<div class="group-infos-page">
	<PageHeader title="Infos du groupe" back_location={`/chat/${data.chat.id}`} />

	<div class="content">
		<ChatGroupMetaCard chat={data.chat} isAdmin={data.isAdmin} isMuted={data.isMuted} />

		<ChatGroupMembersList
			chatId={data.chat.id}
			participants={data.participants}
			isAdmin={data.isAdmin}
			currentUserId={data.currentUserId}
		/>

		<ChatGroupDangerCard />
	</div>
</div>

<style>
	.group-infos-page {
		width: 100%;
		max-width: var(--max-content-width, 600px);
		margin: 0 auto;
		background: #fff;
		flex: 1;
		display: flex;
		flex-direction: column;
		box-sizing: border-box;
	}

	.content {
		width: 100%;
		box-sizing: border-box;
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 32px;
		overflow-y: auto;
		flex: 1;
	}
</style>
