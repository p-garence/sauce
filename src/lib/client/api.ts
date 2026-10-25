/**
 * Client API Helper - Centralisation et typage de tous les appels /api/*
 */
import type { CommentData } from '$lib/types';

async function apiFetch<T = unknown>(url: string, init?: RequestInit): Promise<T> {
	const res = await fetch(url, {
		headers: { credentials: 'same-origin', ...init?.headers },
		...init
	});

	if (!res.ok) {
		let errorMsg = `Erreur HTTP ${res.status}`;
		try {
			const data = await res.json();
			if (data?.message) errorMsg = data.message;
			else if (data?.error) errorMsg = data.error;
		} catch {
			// ignore json parse error
		}
		throw new Error(errorMsg);
	}

	const contentType = res.headers.get('content-type');
	if (contentType && contentType.includes('application/json')) {
		return res.json() as Promise<T>;
	}
	return null as unknown as T;
}

// ==========================================
// 1. POSTS & INTERACTIONS
// ==========================================

export async function apiToggleLike(postId: string, action: 'like' | 'unlike') {
	return apiFetch<{ success: boolean }>('/api/like', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ postId, action })
	});
}

export async function apiToggleHidePost(postId: string, action: 'hide' | 'unhide') {
	return apiFetch<{ success: boolean }>('/api/posts/hide', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ postId, action })
	});
}

export async function apiRecordPostViews(postIds: string[]) {
	if (postIds.length === 0) return;
	return apiFetch<{ success: boolean }>('/api/posts/view', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ postIds })
	});
}

// ==========================================
// 2. COMMENTAIRES
// ==========================================

export async function apiPostComment(postId: string, content: string, parentId?: string | null) {
	return apiFetch('/api/comments', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ postId, content, parentId: parentId || null })
	});
}

export async function apiToggleCommentLike(commentId: string, action: 'like' | 'unlike') {
	return apiFetch<{ success: boolean }>('/api/comments/like', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ commentId, action })
	});
}

export async function apiUpdateComment(commentId: string, content: string) {
	return apiFetch<{ success: boolean; comment: CommentData }>(`/api/comments/${commentId}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ content })
	});
}

export async function apiDeleteComment(commentId: string) {
	return apiFetch<{
		success: boolean;
		deletedCount: number;
		parentId?: string | null;
		softDeleted?: boolean;
	}>(`/api/comments/${commentId}`, {
		method: 'DELETE'
	});
}

// ==========================================
// 3. UTILISATEURS & RELATIONS
// ==========================================

export async function apiToggleFollow(targetUserId: string) {
	return apiFetch<{ status: 'following' | 'pending' | 'none' }>('/api/follow', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ targetUserId })
	});
}

export async function apiManageFollowRequest(requesterId: string, action: 'accept' | 'reject') {
	return apiFetch<{ success: boolean }>('/api/follow/manage', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ requesterId, action })
	});
}

export async function apiBlockUser(targetUserId: string, block: boolean) {
	return apiFetch<{ success: boolean }>('/api/users/block', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ targetUserId, block })
	});
}

// ==========================================
// 4. GROUPES D'AUDIENCE
// ==========================================

export async function apiGetGroupMemberships(targetId: string): Promise<string[]> {
	return apiFetch<string[]>(`/api/groups/members?targetId=${encodeURIComponent(targetId)}`);
}

export async function apiAddGroupMember(targetId: string, groupId: string) {
	return apiFetch<{ success: boolean }>('/api/groups/members', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ targetId, groupId })
	});
}

export async function apiRemoveGroupMember(targetId: string, groupId: string) {
	return apiFetch<{ success: boolean }>('/api/groups/members', {
		method: 'DELETE',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ targetId, groupId })
	});
}

// ==========================================
// 5. NOTIFICATIONS & FLUX
// ==========================================

export async function apiMarkNotificationsRead() {
	return apiFetch<{ success: boolean }>('/api/notifications/read', { method: 'POST' });
}

export async function apiClearNotifications() {
	return apiFetch<{ success: boolean }>('/api/notifications/clear', { method: 'POST' });
}

export async function apiSetActiveFeed(feedId: string) {
	return apiFetch<{ success: boolean }>('/api/set-active-feed', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ feedId })
	});
}

// ==========================================
// 6. MESSAGES DE CHAT
// ==========================================

export async function apiUpdateChatMessage(messageId: string, content: string) {
	return apiFetch<{ success: boolean; message: import('$lib/types').ChatMessage }>(
		`/api/chat/messages/${messageId}`,
		{
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ content })
		}
	);
}

export async function apiDeleteChatMessage(messageId: string) {
	return apiFetch<{ success: boolean; message?: import('$lib/types').ChatMessage }>(
		`/api/chat/messages/${messageId}`,
		{
			method: 'DELETE'
		}
	);
}

export async function apiToggleChatMessageReaction(
	messageId: string,
	emoji: import('$lib/types').EmojiItem
) {
	return apiFetch<{
		success: boolean;
		messageId: string;
		chatId: string;
		reactions: import('$lib/types').MessageReactionGroup[];
	}>('/api/chat/reactions', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ messageId, emoji })
	});
}
