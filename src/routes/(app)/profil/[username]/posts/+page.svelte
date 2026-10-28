<script lang="ts">
	import PageHeader from '$lib/components/navigation/PageHeader.svelte';
	import InfiniteFeed from '$lib/components/post/InfiniteFeed.svelte';
	import { useFeed } from '$lib/client/useFeed.svelte.js';

	let { data } = $props();

	let postsPerScroll = $derived(data.instanceSettings?.performanceSettings?.postsPerScroll || 8);

	const feed = useFeed(() => ({
		loadNumber: postsPerScroll,
		username: data.profile.username || data.profile.id,
		profileId: data.profile.id,
		feedType: 'posts',
		initialPosts: data.initialPosts,
		initialCursor: data.initialCursor,
		initialSortMode: data.sortMode
	}));
</script>

<div class="profile-posts-page">
	<PageHeader
		title={'Publications de ' + (data.profile.name || data.profile.username)}
		username={data.profile.username || ''}
		back_location={`/profil/${data.profile.username}?sort=${feed.sortMode}`}
	/>

	<InfiniteFeed
		posts={feed.posts}
		hasMore={feed.hasMore}
		isLoadingMore={feed.isLoadingMore}
		onLoadMore={feed.loadMore}
	/>
</div>
