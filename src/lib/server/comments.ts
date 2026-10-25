import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { comments, commentLikes, posts, user as userTable } from '$lib/server/db/schema';
import { eq, desc, asc, sql, isNull, and, or } from 'drizzle-orm';
import { sendNotification } from '$lib/server/notifications';
import { notifyMentions } from '$lib/server/mentions';
import { assertCanSeePost, notBlockedSql, isValidUuid } from '$lib/server/permissions';
import {
	COMMENTS_PER_LOAD,
	MAX_COMMENTS_PER_REQUEST,
	MAX_COMMENT_LENGTH,
	clampLimit
} from '$lib/constants';
import type { NotificationPayload } from '$lib/types';

export interface CommentFetchOptions {
	postId: string;
	viewerId?: string | null;
	parentId?: string | null;
	sort?: string;
	page?: number;
	limit?: number;
}

export async function getComments(options: CommentFetchOptions) {
	const { postId, viewerId, parentId, sort = 'newest' } = options;
	const safeLimit = clampLimit(options.limit, COMMENTS_PER_LOAD, MAX_COMMENTS_PER_REQUEST);
	const safePage = Math.max(1, Math.floor(Number(options.page) || 1));
	const offset = (safePage - 1) * safeLimit;

	// SÉCURITÉ : Vérifier que le spectateur (connecté ou visiteur sur post public) a le droit de voir le post
	await assertCanSeePost(viewerId, postId);

	if (parentId && !isValidUuid(parentId)) {
		throw error(400, 'Identifiant de commentaire parent invalide.');
	}

	let orderByClause;
	switch (sort) {
		case 'top':
			orderByClause = desc(comments.likesCount);
			break;
		case 'oldest':
			orderByClause = asc(comments.createdAt);
			break;
		case 'newest':
		default:
			orderByClause = desc(comments.createdAt);
			break;
	}

	const baseWhere = parentId
		? and(
				eq(comments.postId, postId),
				eq(comments.parentId, parentId),
				or(
					sql`${comments.content} != '[deleted]'`,
					sql`EXISTS (SELECT 1 FROM ${comments} c2 WHERE c2.parent_id = ${comments.id})`
				)
		  )
		: and(
				eq(comments.postId, postId),
				isNull(comments.parentId),
				or(
					sql`${comments.content} != '[deleted]'`,
					sql`EXISTS (SELECT 1 FROM ${comments} c2 WHERE c2.parent_id = ${comments.id})`
				)
		  );

	const whereCondition = viewerId
		? and(
				baseWhere,
				or(
					sql`${comments.content} = '[deleted]'`,
					notBlockedSql(viewerId, comments.authorId)
				)
		  )
		: baseWhere;

	const fetchedComments = await db.query.comments.findMany({
		where: whereCondition,
		orderBy: [orderByClause],
		limit: safeLimit,
		offset,
		extras: {
			isLiked: viewerId
				? sql<boolean>`EXISTS (
					SELECT 1 FROM ${commentLikes} cl 
					WHERE cl.comment_id = ${comments.id} 
					AND cl.user_id = ${viewerId}
				)`.as('is_liked')
				: sql<boolean>`false`.as('is_liked'),
			repliesCount: sql<number>`(
				SELECT count(*)::int 
				FROM ${comments} c2 
				WHERE c2.parent_id = ${comments.id}
			)`.as('replies_count')
		},
		with: {
			author: { columns: { id: true, username: true, image: true, name: true } }
		}
	});

	return fetchedComments.map((c) => {
		if (c.content === '[deleted]') {
			return {
				...c,
				isLiked: false,
				author: {
					id: '',
					username: 'supprimé',
					image: null,
					name: '[supprimé]'
				}
			};
		}
		return c;
	});
}

export async function createComment(params: {
	postId: string;
	authorId: string;
	content: string;
	parentId?: string | null;
}) {
	const { postId, authorId, content, parentId } = params;

	const trimmed = content?.trim() ?? '';
	if (!trimmed) {
		throw error(400, 'Le commentaire ne peut pas être vide.');
	}
	if (trimmed.length > MAX_COMMENT_LENGTH) {
		throw error(400, `Le commentaire ne peut pas dépasser ${MAX_COMMENT_LENGTH} caractères.`);
	}

	// SÉCURITÉ : Vérifier que l'auteur du commentaire a accès à la publication
	await assertCanSeePost(authorId, postId);

	if (parentId) {
		if (!isValidUuid(parentId)) {
			throw error(400, 'Commentaire parent invalide.');
		}
		const parentCheck = await db.query.comments.findFirst({
			where: and(eq(comments.id, parentId), eq(comments.postId, postId)),
			columns: { id: true, authorId: true }
		});
		if (!parentCheck) {
			throw error(404, 'Commentaire parent introuvable sur cette publication.');
		}
	}

	const insertedData = await db.transaction(async (tx) => {
		const inserted = await tx
			.insert(comments)
			.values({
				postId,
				authorId,
				content: trimmed,
				parentId: parentId || null
			})
			.returning();

		const updatedPosts = await tx
			.update(posts)
			.set({ commentsCount: sql`${posts.commentsCount} + 1` })
			.where(eq(posts.id, postId))
			.returning({ authorId: posts.authorId });

		let parentAuthorId: string | null = null;
		if (parentId) {
			const [parentComment] = await tx
				.select({ authorId: comments.authorId, content: comments.content })
				.from(comments)
				.where(and(eq(comments.id, parentId), eq(comments.postId, postId)))
				.limit(1);
			if (parentComment && parentComment.content !== '[deleted]') {
				parentAuthorId = parentComment.authorId;
			}
		}

		return {
			comment: inserted[0],
			postAuthor: updatedPosts[0]?.authorId,
			parentAuthor: parentAuthorId
		};
	});

	const author = await db.query.user.findFirst({
		where: eq(userTable.id, authorId),
		columns: { id: true, username: true, image: true, name: true }
	});

	const snippet =
		insertedData.comment.content.length > 50
			? insertedData.comment.content.substring(0, 50) + '...'
			: insertedData.comment.content;

	// 1. Notifier les personnes mentionnées avec @ (uniquement celles qui ont accès au post)
	const notifiedMentionIds = await notifyMentions({
		actorId: authorId,
		text: insertedData.comment.content,
		entityId: postId,
		context: 'comment'
	});

	// 2. Si c'est une réponse, notifier la personne à qui on répond
	if (
		insertedData.parentAuthor &&
		insertedData.parentAuthor !== authorId &&
		!notifiedMentionIds.includes(insertedData.parentAuthor)
	) {
		const notif: NotificationPayload = {
			recipientId: insertedData.parentAuthor,
			entityId: postId,
			type: 'comment',
			actorId: authorId,
			content: snippet
		};
		await sendNotification(notif);
	}
	// 3. Si c'est un commentaire direct, notifier l'auteur du post
	else if (
		!parentId &&
		insertedData.postAuthor &&
		insertedData.postAuthor !== authorId &&
		!notifiedMentionIds.includes(insertedData.postAuthor)
	) {
		const notif: NotificationPayload = {
			recipientId: insertedData.postAuthor,
			entityId: postId,
			type: 'comment',
			actorId: authorId,
			content: snippet
		};
		await sendNotification(notif);
	}

	return {
		...insertedData.comment,
		author,
		isLiked: false,
		likesCount: 0
	};
}

export async function toggleCommentLike(
	userId: string,
	commentId: string,
	action: 'like' | 'unlike'
) {
	if (!isValidUuid(commentId)) {
		throw error(400, 'Identifiant de commentaire invalide.');
	}

	const targetComment = await db.query.comments.findFirst({
		where: eq(comments.id, commentId),
		columns: { id: true, postId: true, content: true }
	});

	if (!targetComment || targetComment.content === '[deleted]') {
		throw error(404, 'Commentaire introuvable.');
	}

	// SÉCURITÉ : Vérifier que l'utilisateur a accès au post parent
	await assertCanSeePost(userId, targetComment.postId);

	await db.transaction(async (tx) => {
		if (action === 'like') {
			const inserted = await tx
				.insert(commentLikes)
				.values({ userId, commentId })
				.onConflictDoNothing()
				.returning();

			if (inserted.length > 0) {
				await tx
					.update(comments)
					.set({ likesCount: sql`${comments.likesCount} + 1` })
					.where(eq(comments.id, commentId));
			}
		} else {
			const deleted = await tx
				.delete(commentLikes)
				.where(and(eq(commentLikes.userId, userId), eq(commentLikes.commentId, commentId)))
				.returning();

			if (deleted.length > 0) {
				await tx
					.update(comments)
					.set({ likesCount: sql`GREATEST(${comments.likesCount} - 1, 0)` })
					.where(eq(comments.id, commentId));
			}
		}
	});

	return { success: true };
}

export async function updateComment(params: {
	commentId: string;
	userId: string;
	content: string;
}) {
	const { commentId, userId, content } = params;

	if (!isValidUuid(commentId)) {
		throw error(400, 'Identifiant de commentaire invalide.');
	}

	const trimmed = content.trim();
	if (!trimmed) {
		throw error(400, 'Le commentaire ne peut pas être vide.');
	}
	if (trimmed.length > MAX_COMMENT_LENGTH) {
		throw error(400, `Le commentaire ne peut pas dépasser ${MAX_COMMENT_LENGTH} caractères.`);
	}

	const existing = await db.query.comments.findFirst({
		where: eq(comments.id, commentId)
	});

	if (!existing) {
		throw error(404, 'Commentaire introuvable.');
	}

	if (existing.content === '[deleted]') {
		throw error(400, 'Impossible de modifier un commentaire supprimé.');
	}

	if (existing.authorId !== userId) {
		throw error(403, 'Vous ne pouvez modifier que vos propres commentaires.');
	}

	const [updated] = await db
		.update(comments)
		.set({
			content: trimmed,
			updatedAt: new Date()
		})
		.where(eq(comments.id, commentId))
		.returning();

	// Notifier les nouvelles mentions
	await notifyMentions({
		actorId: userId,
		text: trimmed,
		entityId: existing.postId,
		context: 'comment'
	});

	const author = await db.query.user.findFirst({
		where: eq(userTable.id, userId),
		columns: { id: true, username: true, image: true, name: true }
	});

	return {
		...updated,
		author
	};
}

export async function deleteComment(params: {
	commentId: string;
	userId: string;
	isAdmin?: boolean;
}) {
	const { commentId, userId, isAdmin = false } = params;

	if (!isValidUuid(commentId)) {
		throw error(400, 'Identifiant de commentaire invalide.');
	}

	const existing = await db.query.comments.findFirst({
		where: eq(comments.id, commentId)
	});

	if (!existing) {
		throw error(404, 'Commentaire introuvable.');
	}

	if (existing.content === '[deleted]') {
		throw error(400, 'Ce commentaire est déjà supprimé.');
	}

	if (existing.authorId !== userId && !isAdmin) {
		throw error(403, 'Vous n\'êtes pas autorisé à supprimer ce commentaire.');
	}

	const result = await db.transaction(async (tx) => {
		// Vérifier si ce commentaire a des réponses enfants
		const childReplies = await tx
			.select({ id: comments.id })
			.from(comments)
			.where(eq(comments.parentId, commentId));

		if (childReplies.length > 0) {
			// Soft delete: conserver la ligne pour préserver le fil des réponses
			await tx.delete(commentLikes).where(eq(commentLikes.commentId, commentId));
			await tx
				.update(comments)
				.set({
					content: '[deleted]',
					likesCount: 0,
					updatedAt: new Date()
				})
				.where(eq(comments.id, commentId));

			await tx
				.update(posts)
				.set({ commentsCount: sql`GREATEST(${posts.commentsCount} - 1, 0)` })
				.where(eq(posts.id, existing.postId));

			return {
				softDeleted: true,
				deletedCount: 1
			};
		} else {
			// Hard delete: pas de réponses enfants
			await tx.delete(comments).where(eq(comments.id, commentId));

			await tx
				.update(posts)
				.set({ commentsCount: sql`GREATEST(${posts.commentsCount} - 1, 0)` })
				.where(eq(posts.id, existing.postId));

			// Si ce commentaire était une réponse, vérifier si le parent est soft-deleted et n'a plus d'enfants
			if (existing.parentId) {
				const [parentComment] = await tx
					.select({ id: comments.id, content: comments.content })
					.from(comments)
					.where(eq(comments.id, existing.parentId));

				if (parentComment && parentComment.content === '[deleted]') {
					const remainingChildren = await tx
						.select({ id: comments.id })
						.from(comments)
						.where(eq(comments.parentId, existing.parentId));

					if (remainingChildren.length === 0) {
						// Le parent était uniquement conservé pour ses réponses, on peut le supprimer physiquement
						await tx.delete(comments).where(eq(comments.id, existing.parentId));
					}
				}
			}

			return {
				softDeleted: false,
				deletedCount: 1
			};
		}
	});

	return {
		success: true,
		softDeleted: result.softDeleted,
		deletedCount: result.deletedCount,
		commentId,
		parentId: existing.parentId,
		postId: existing.postId
	};
}

