<script lang="ts">
	/**
	 * @component ChatConversationPage
	 * @domain chat
	 * @description Page principale d'une conversation de chat direct ou de groupe en temps réel (SSE, historique, audio et médias).
	 *
	 * @responsibilities
	 * - Synchroniser les messages entrants, modifiés et supprimés avec le store SSE global.
	 * - Assurer le défilement adaptatif avec maintien de position lors du chargement de l'historique.
	 * - Orchestrer l'en-tête, les bulles de messages, le bandeau de requêtes et la barre de saisie.
	 */

	import { onMount, untrack, tick } from 'svelte';
	import { resolve } from '$app/paths';
	import { goto, afterNavigate, invalidateAll } from '$app/navigation';
	import { globalStream } from '$lib/client/globalStreamState.svelte';
	import {
		apiUpdateChatMessage,
		apiDeleteChatMessage,
		apiToggleChatMessageReaction
	} from '$lib/client/api';
	import type { PageData } from './$types';
	import type { MenuAction, Message, StoryBundle } from '$lib/types';
	import type { StoryReplyData } from '$lib/stories';
	import StoryViewerModal from '$lib/components/stories/StoryViewerModal.svelte';
	import ChatHeader from '$lib/components/chat/ChatHeader.svelte';
	import ChatMessageItem from '$lib/components/chat/ChatMessageItem.svelte';
	import ChatAudioRecorder from '$lib/components/chat/ChatAudioRecorder.svelte';
	import ChatMessageRequestsBanner from '$lib/components/chat/ChatMessageRequestsBanner.svelte';
	import ChatInputBar from '$lib/components/chat/ChatInputBar.svelte';

	type ChatMessage = Message & {
		sender?: { name: string | null; username: string | null; image: string | null } | null;
	};

	let { data }: { data: PageData } = $props();

	// 1. ÉTAT DU CHAT
	let historyMessages = $state<ChatMessage[]>([]);
	let liveMessages = $state<ChatMessage[]>([]);
	let messageOverrides = $state<Record<string, Partial<ChatMessage>>>({});
	let editingMessageId = $state<string | null>(null);
	let isSavingEdit = $state(false);

	// Pièces jointes & audio
	let selectedFile = $state<File | null>(null);
	let selectedFilePreview = $state<string | null>(null);
	let recordedAudioUrl = $state<string | null>(null);
	let isRecording = $state(false);

	let recorderRef = $state<ReturnType<typeof ChatAudioRecorder> | null>(null);
	let inputBarRef = $state<ReturnType<typeof ChatInputBar> | null>(null);

	// Navigation et DOM
	let messagesContainerRef = $state<HTMLDivElement | null>(null);
	let messagesEndRef = $state<HTMLDivElement | null>(null);
	let canGoBack = $state(false);
	let lastProcessedMsgId = $state<string | null>(null);
	let isLoadingMore = $state(false);
	let hasMore = $state(untrack(() => data.hasMore));

	// Clavier virtuel mobile
	let chatHeight = $state('100dvh');
	let chatTop = $state('0px');
	let isKeyboardOpen = $state(false);

	// Permissions
	let isDirect = $derived(data.type === 'direct');
	let amIBlocked = $derived(isDirect && data.myStatus === 'blocked');
	let targetBlocked = $derived(isDirect && data.otherUserStatus === 'blocked');
	let amIRefused = $derived(isDirect && data.myStatus === 'refused');
	let targetRefused = $derived(isDirect && data.otherUserStatus === 'refused');
	let targetPending = $derived(isDirect && data.otherUserStatus === 'pending');
	let amIPending = $derived(isDirect && data.myStatus === 'pending');
	let canWrite = $derived(data.type === 'group' ? !data.adminOnlyMessaging || data.isAdmin : true);

	// Visualisation story
	let previewStoryBundle = $state<StoryBundle[]>([]);
	let isStoryModalOpen = $state(false);

	function openStoryModal(storyData: StoryReplyData) {
		previewStoryBundle = [
			{
				author: {
					id: storyData.authorId || '',
					username: storyData.authorUsername || data.otherUserUsername || '',
					name: data.title || '',
					image: data.image
				},
				stories: [
					{
						id: storyData.id,
						authorId: storyData.authorId || '',
						mediaUrl: storyData.mediaUrl,
						mediaType: storyData.mediaType,
						caption: storyData.caption || null,
						visibility: 'public',
						groupId: null,
						viewsCount: 0,
						likesCount: 0,
						expiresAt: new Date(Date.now() + 86400000).toISOString(),
						createdAt: new Date().toISOString(),
						isViewed: true,
						isLiked: false
					}
				],
				hasUnviewed: false,
				hasGroupStory: false,
				latestCreatedAt: new Date().toISOString()
			}
		];
		isStoryModalOpen = true;
	}

	let chatMessages = $derived.by(() => {
		const allMessages = [...historyMessages, ...data.messages, ...liveMessages] as ChatMessage[];
		const uniqueMessages = Array.from(new Map(allMessages.map((m) => [m.id, m])).values());
		return uniqueMessages
			.map((m) => {
				const override = messageOverrides[m.id];
				return override ? { ...m, ...override } : m;
			})
			.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
	});

	let hasSentMessages = $derived(chatMessages.some((m) => m.senderId === data.currentUserId));

	// 2. SYNCHRONISATION SSE STREAM
	$effect(() => {
		globalStream.activeChatId = data.chatId;
		return () => {
			globalStream.activeChatId = null;
		};
	});

	$effect(() => {
		const msg = globalStream.latestMessage;
		if (msg && msg.id !== lastProcessedMsgId && msg.chatId === data.chatId) {
			lastProcessedMsgId = msg.id;
			untrack(() => {
				liveMessages.push(msg as ChatMessage);
				if (msg.senderId !== data.currentUserId) {
					markAsRead();
				}
				scrollToBottom();
			});
		}
	});

	$effect(() => {
		const updated = globalStream.updatedMessage;
		if (updated && updated.chatId === data.chatId) {
			untrack(() => {
				messageOverrides[updated.id] = {
					content: updated.content,
					updatedAt: updated.updatedAt,
					mediaUrl: updated.mediaUrl,
					mediaType: updated.mediaType,
					mediaName: updated.mediaName,
					mediaSize: updated.mediaSize
				};
			});
		}
	});

	$effect(() => {
		const del = globalStream.deletedMessage;
		if (del && del.chatId === data.chatId) {
			untrack(() => {
				messageOverrides[del.messageId] = {
					content: '[deleted]',
					mediaUrl: null,
					mediaType: null,
					mediaName: null,
					mediaSize: null,
					updatedAt: del.message?.updatedAt || new Date()
				};
				if (editingMessageId === del.messageId) {
					editingMessageId = null;
				}
			});
		}
	});

	$effect(() => {
		const reaction = globalStream.reactionUpdate;
		if (reaction && reaction.chatId === data.chatId) {
			untrack(() => {
				const current = messageOverrides[reaction.messageId] || {};
				const localizedReactions = reaction.reactions.map((r) => ({
					...r,
					hasReacted: r.users.some((u) => u.id === data.currentUserId)
				}));
				messageOverrides[reaction.messageId] = {
					...current,
					reactions: localizedReactions
				};
			});
		}
	});

	async function markAsRead() {
		try {
			await fetch('/api/chat/read', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ chatId: data.chatId })
			});
		} catch (e) {
			console.error('Erreur lecture', e);
		}
	}

	async function loadMore() {
		if (!chatMessages.length || isLoadingMore || !hasMore) return;
		isLoadingMore = true;
		const oldestDate = chatMessages[0].createdAt;

		try {
			const res = await fetch(`/api/chat/history?chatId=${data.chatId}&before=${oldestDate}`);
			if (res.ok) {
				const result = await res.json();
				const prevHeight = messagesContainerRef?.scrollHeight || 0;
				const prevScroll = messagesContainerRef?.scrollTop || 0;

				historyMessages = [...result.messages, ...historyMessages];
				hasMore = result.hasMore;

				await tick();
				if (messagesContainerRef) {
					messagesContainerRef.scrollTop =
						prevScroll + (messagesContainerRef.scrollHeight - prevHeight);
				}
			}
		} finally {
			isLoadingMore = false;
		}
	}

	afterNavigate(({ from }) => {
		if (from) canGoBack = true;
	});

	async function scrollToBottom() {
		await tick();
		if (messagesEndRef) {
			messagesEndRef.scrollIntoView({ behavior: 'auto' });
		}
	}

	let chatActions: MenuAction[] = $derived([
		{
			label: data.isMuted ? 'Rétablir le son' : 'Mettre en sourdine',
			onClick: async () => {
				globalStream.setChatMuted(data.chatId, !data.isMuted);
				const formData = new FormData();
				formData.set('mute', data.isMuted ? 'false' : 'true');
				await fetch(resolve(`/chat/${data.chatId}?/toggleMute`), {
					method: 'POST',
					body: formData
				});
				invalidateAll();
			}
		},
		{
			label: 'Supprimer la discussion',
			variant: 'danger',
			dividerBelow: true,
			onClick: async () => {
				if (!confirm('Voulez-vous vraiment effacer cette conversation de votre côté ?')) return;
				const formData = new FormData();
				await fetch(resolve(`/chat?/clearChat&chatId=${data.chatId}`), {
					method: 'POST',
					body: formData
				});
				goto(resolve('/chat'));
			}
		},
		...(isDirect
			? [
					{
						label: amIBlocked || amIRefused ? 'Débloquer' : 'Bloquer',
						variant: (amIBlocked || amIRefused ? 'default' : 'danger') as 'default' | 'danger',
						onClick: async () => {
							const actionText = amIBlocked || amIRefused ? 'débloquer' : 'bloquer';
							if (!confirm(`Voulez-vous vraiment ${actionText} cette personne ?`)) return;
							const fd = new FormData();
							const endpoint = amIBlocked || amIRefused ? 'unblockChat' : 'blockChat';
							await fetch(resolve(`/chat/${data.chatId}?/${endpoint}`), {
								method: 'POST',
								body: fd
							});
							invalidateAll();
						}
					}
				]
			: [])
	]);

	async function saveEditMessage(msg: ChatMessage, content: string) {
		const trimmed = content.trim();
		if (!msg.mediaUrl && !trimmed) return;
		if (isSavingEdit) return;

		isSavingEdit = true;
		try {
			const res = await apiUpdateChatMessage(msg.id, trimmed);
			if (res.success && res.message) {
				messageOverrides[msg.id] = {
					content: res.message.content,
					updatedAt: res.message.updatedAt
				};
				editingMessageId = null;
			}
		} catch (err) {
			console.error('Erreur mise à jour message:', err);
		} finally {
			isSavingEdit = false;
		}
	}

	async function deleteMessage(msg: ChatMessage) {
		if (!confirm('Voulez-vous vraiment supprimer ce message ?')) return;
		try {
			const res = await apiDeleteChatMessage(msg.id);
			if (res.success && res.message) {
				messageOverrides[msg.id] = {
					content: '[deleted]',
					mediaUrl: null,
					mediaType: null,
					mediaName: null,
					mediaSize: null,
					updatedAt: res.message.updatedAt
				};
				if (editingMessageId === msg.id) {
					editingMessageId = null;
				}
			}
		} catch (err) {
			console.error('Erreur suppression message:', err);
		}
	}

	async function handleToggleReaction(msg: ChatMessage, emoji: import('$lib/types').EmojiItem) {
		const currentReactions = msg.reactions || [];
		const existingGroupIndex = currentReactions.findIndex((r) => r.emojiId === emoji.id);
		let updatedReactions = [...currentReactions];

		if (existingGroupIndex !== -1) {
			const group = { ...updatedReactions[existingGroupIndex] };
			if (group.hasReacted) {
				const newUsers = group.users.filter((u) => u.id !== data.currentUserId);
				if (newUsers.length === 0) {
					updatedReactions.splice(existingGroupIndex, 1);
				} else {
					group.users = newUsers;
					group.count = newUsers.length;
					group.hasReacted = false;
					updatedReactions[existingGroupIndex] = group;
				}
			} else {
				group.users = [
					...group.users,
					{
						id: data.currentUserId,
						name: data.sessionUser?.name || null,
						username: data.sessionUser?.username || null,
						image: data.sessionUser?.image || null
					}
				];
				group.count = group.users.length;
				group.hasReacted = true;
				updatedReactions[existingGroupIndex] = group;
			}
		} else {
			updatedReactions.push({
				emojiId: emoji.id,
				emojiName: emoji.name,
				emojiUrl: emoji.url,
				count: 1,
				users: [
					{
						id: data.currentUserId,
						name: data.sessionUser?.name || null,
						username: data.sessionUser?.username || null,
						image: data.sessionUser?.image || null
					}
				],
				hasReacted: true
			});
		}

		messageOverrides[msg.id] = {
			...(messageOverrides[msg.id] || {}),
			reactions: updatedReactions
		};

		try {
			const res = await apiToggleChatMessageReaction(msg.id, emoji);
			if (res?.reactions) {
				const localized = res.reactions.map((r) => ({
					...r,
					hasReacted: r.users.some((u) => u.id === data.currentUserId)
				}));
				messageOverrides[msg.id] = {
					...(messageOverrides[msg.id] || {}),
					reactions: localized
				};
			}
		} catch (e) {
			console.error('Erreur bascule réaction:', e);
			const current = { ...(messageOverrides[msg.id] || {}) };
			delete current.reactions;
			messageOverrides[msg.id] = current;
		}
	}

	function handleAudioComplete(file: File, url: string, autoSend: boolean) {
		selectedFile = file;
		selectedFilePreview = null;
		recordedAudioUrl = url;
		if (autoSend) {
			tick().then(() => {
				inputBarRef?.submitForm();
			});
		}
	}

	onMount(() => {
		document.documentElement.classList.add('chat-lock');
		document.body.classList.add('chat-lock');

		globalStream.markChatAsRead(data.chatId);
		markAsRead();
		scrollToBottom();

		const refreshChat = async () => {
			await invalidateAll();
			markAsRead();
			scrollToBottom();
		};

		const handleVisibilityChange = () => {
			if (document.visibilityState === 'visible') refreshChat();
		};
		const handleWindowFocus = () => refreshChat();
		const handleSwMessage = (event: MessageEvent) => {
			if (event.data?.type === 'NOTIFICATION_CLICK') refreshChat();
		};

		document.addEventListener('visibilitychange', handleVisibilityChange);
		window.addEventListener('focus', handleWindowFocus);
		if ('serviceWorker' in navigator && navigator.serviceWorker) {
			navigator.serviceWorker.addEventListener('message', handleSwMessage);
		}

		let baseViewportHeight = window.visualViewport?.height || window.innerHeight;
		const handleResize = () => {
			if (!window.visualViewport) return;
			const vv = window.visualViewport;
			chatHeight = `${vv.height}px`;
			chatTop = `${vv.offsetTop}px`;
			if (vv.height > baseViewportHeight) baseViewportHeight = vv.height;
			isKeyboardOpen = baseViewportHeight - vv.height > 120;
		};

		if (window.visualViewport) {
			window.visualViewport.addEventListener('resize', handleResize);
			window.visualViewport.addEventListener('scroll', handleResize);
			handleResize();
		}

		return () => {
			document.removeEventListener('visibilitychange', handleVisibilityChange);
			window.removeEventListener('focus', handleWindowFocus);
			if ('serviceWorker' in navigator && navigator.serviceWorker) {
				navigator.serviceWorker.removeEventListener('message', handleSwMessage);
			}
			if (window.visualViewport) {
				window.visualViewport.removeEventListener('resize', handleResize);
				window.visualViewport.removeEventListener('scroll', handleResize);
			}
			recorderRef?.cancel();
			if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
			document.documentElement.classList.remove('chat-lock');
			document.body.classList.remove('chat-lock');
		};
	});
</script>

<svelte:body class:keyboard-open={isKeyboardOpen} />

<div
	class="chat-page"
	style="top: {chatTop}; height: {isKeyboardOpen
		? chatHeight
		: `calc(${chatHeight} - var(--nav-height) - env(safe-area-inset-bottom, 0px))`};"
>
	<ChatHeader
		chatId={data.chatId}
		type={data.type}
		title={data.title}
		image={data.image}
		description={data.description}
		isMuted={data.isMuted}
		otherUserId={data.otherUserId}
		otherUserUsername={data.otherUserUsername}
		{canGoBack}
		{chatActions}
	/>

	<div class="messages-container" bind:this={messagesContainerRef}>
		{#if hasMore}
			<div class="load-more-container">
				<button class="load-more-btn" onclick={loadMore} disabled={isLoadingMore}>
					{isLoadingMore ? 'Chargement...' : 'Charger les messages précédents'}
				</button>
			</div>
		{/if}

		{#each chatMessages as msg, idx (msg.id)}
			<ChatMessageItem
				message={msg}
				currentUserId={data.currentUserId}
				currentUsername={data.currentUsername ?? undefined}
				chatType={data.type}
				isEditing={editingMessageId === msg.id}
				{isSavingEdit}
				menuDirection={idx >= chatMessages.length - 2 ? 'up' : 'auto'}
				userFavoriteEmojis={data.userFavoriteEmojis}
				onToggleReaction={handleToggleReaction}
				onStartEdit={(m) => (editingMessageId = m.id)}
				onCancelEdit={() => (editingMessageId = null)}
				onSaveEdit={saveEditMessage}
				onDelete={deleteMessage}
				onOpenStoryModal={openStoryModal}
			/>
		{/each}

		{#if data.messages.length === 0}
			<div class="empty-state">
				<p>Début de la conversation avec {data.title}</p>
			</div>
		{/if}

		<div bind:this={messagesEndRef}></div>
	</div>

	<!-- BANDEAU DE REQUÊTES OU DE RESTRICTION -->
	{#if amIBlocked || targetBlocked || amIRefused || targetRefused || (targetPending && !amIPending) || amIPending || !canWrite}
		<ChatMessageRequestsBanner
			title={data.title}
			{amIBlocked}
			{targetBlocked}
			{amIRefused}
			{targetRefused}
			{targetPending}
			{amIPending}
			{hasSentMessages}
			{canWrite}
			onIntroSent={(newMsg) => {
				liveMessages = [...liveMessages, newMsg];
				scrollToBottom();
			}}
		/>
	{:else}
		<ChatAudioRecorder
			bind:this={recorderRef}
			bind:isRecording
			onRecordingComplete={handleAudioComplete}
		/>

		<ChatInputBar
			bind:this={inputBarRef}
			chatId={data.chatId}
			bind:selectedFile
			bind:selectedFilePreview
			bind:recordedAudioUrl
			{isRecording}
			onToggleVoiceRecording={() => recorderRef?.toggle()}
			onMessageSent={(newMsg) => {
				liveMessages = [...liveMessages, newMsg];
				scrollToBottom();
			}}
		/>
	{/if}
</div>

{#if isStoryModalOpen}
	<StoryViewerModal
		bundles={previewStoryBundle}
		isOpen={isStoryModalOpen}
		onClose={() => (isStoryModalOpen = false)}
	/>
{/if}

<style>
	:global(html.chat-lock),
	:global(body.chat-lock) {
		overflow: hidden !important;
		overscroll-behavior: none !important;
	}

	.chat-page {
		display: flex;
		flex-direction: column;
		width: 100%;
		max-width: 600px;
		margin: 0 auto;
		background: #ffffff;
		box-sizing: border-box;
		position: fixed;
		left: 0;
		right: 0;
		z-index: 50;
	}

	.messages-container {
		flex: 1;
		overflow-y: auto;
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.load-more-container {
		display: flex;
		justify-content: center;
		padding: 8px 0;
		margin-bottom: 8px;
	}

	.load-more-btn {
		background: #f1f5f9;
		color: #475569;
		border: none;
		padding: 6px 16px;
		border-radius: 20px;
		font-weight: 600;
		cursor: pointer;
	}

	.empty-state {
		text-align: center;
		color: #94a3b8;
		margin-top: 20px;
	}
</style>
