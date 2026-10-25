import { relations } from 'drizzle-orm';

import { user, session, account, inviteKeys } from './auth';
import { userGroups, userGroupMembers } from './groups';
import { algorithms, userFeeds } from './feeds';
import {
	posts,
	comments,
	postLikes,
	commentLikes,
	hiddenPosts,
	postViews,
	interactions
} from './posts';
import { chats, chatParticipants, messages } from './chats';
import { follows, userBlocks, notifications, userInstanceConsents } from './social';
import { tags, postTags } from './tags';
import { stories, storyViews, storyLikes } from './stories';
import { iconSets, userSavedIconSets } from './icons';
import { emojiSets, userSavedEmojiSets } from './emojis';
import { instanceSettings } from './instanceSettings';

export const userRelations = relations(user, ({ one, many }) => ({
	sessions: many(session),
	accounts: many(account),
	inviter: one(user, {
		fields: [user.invitedById],
		references: [user.id],
		relationName: 'invitations'
	}),
	invitedUsers: many(user, { relationName: 'invitations' }),
	activeAlgo: one(algorithms, { fields: [user.activeFeedId], references: [algorithms.id] }),
	activeIconSet: one(iconSets, { fields: [user.activeIconSetId], references: [iconSets.id] }),
	activeEmojiSet: one(emojiSets, { fields: [user.activeEmojiSetId], references: [emojiSets.id] }),
	ownedIconSets: many(iconSets),
	savedIconSets: many(userSavedIconSets),
	ownedEmojiSets: many(emojiSets),
	savedEmojiSets: many(userSavedEmojiSets),
	posts: many(posts),
	interactions: many(interactions),
	consents: many(userInstanceConsents),
	inviteKeysCreated: many(inviteKeys, { relationName: 'createdKeys' }),
	inviteKeyUsed: one(inviteKeys, {
		fields: [user.id],
		references: [inviteKeys.usedBy],
		relationName: 'usedKey'
	}),
	followers: many(follows, { relationName: 'followers_relation' }),
	following: many(follows, { relationName: 'following_relation' }),
	messagesSent: many(messages, { relationName: 'sent_messages' }),
	messagesReceived: many(messages, { relationName: 'received_messages' }),
	comments: many(comments),
	postLikes: many(postLikes),
	commentLikes: many(commentLikes),
	hiddenPosts: many(hiddenPosts),
	postViews: many(postViews),
	feeds: many(userFeeds),
	participants: many(chatParticipants),
	stories: many(stories),
	storyViews: many(storyViews)
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
	author: one(user, { fields: [posts.authorId], references: [user.id] }),
	iconSet: one(iconSets, { fields: [posts.iconSetId], references: [iconSets.id] }),
	emojiSet: one(emojiSets, { fields: [posts.emojiSetId], references: [emojiSets.id] }),
	comments: many(comments),
	likes: many(postLikes),
	hiddenBy: many(hiddenPosts),
	views: many(postViews),
	tags: many(postTags)
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
	post: one(posts, { fields: [comments.postId], references: [posts.id] }),
	author: one(user, { fields: [comments.authorId], references: [user.id] }),
	parent: one(comments, {
		fields: [comments.parentId],
		references: [comments.id],
		relationName: 'replies'
	}),
	replies: many(comments, { relationName: 'replies' }),
	likes: many(commentLikes)
}));

export const postLikesRelations = relations(postLikes, ({ one }) => ({
	user: one(user, { fields: [postLikes.userId], references: [user.id] }),
	post: one(posts, { fields: [postLikes.postId], references: [posts.id] })
}));

export const commentLikesRelations = relations(commentLikes, ({ one }) => ({
	user: one(user, { fields: [commentLikes.userId], references: [user.id] }),
	comment: one(comments, { fields: [commentLikes.commentId], references: [comments.id] })
}));

export const hiddenPostsRelations = relations(hiddenPosts, ({ one }) => ({
	user: one(user, { fields: [hiddenPosts.userId], references: [user.id] }),
	post: one(posts, { fields: [hiddenPosts.postId], references: [posts.id] })
}));

export const postViewsRelations = relations(postViews, ({ one }) => ({
	user: one(user, { fields: [postViews.userId], references: [user.id] }),
	post: one(posts, { fields: [postViews.postId], references: [posts.id] })
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, { fields: [session.userId], references: [user.id] })
}));

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, { fields: [account.userId], references: [user.id] })
}));

export const inviteKeysRelations = relations(inviteKeys, ({ one }) => ({
	creator: one(user, {
		fields: [inviteKeys.createdBy],
		references: [user.id],
		relationName: 'createdKeys'
	}),
	user: one(user, { fields: [inviteKeys.usedBy], references: [user.id], relationName: 'usedKey' })
}));

export const chatsRelations = relations(chats, ({ many }) => ({
	participants: many(chatParticipants),
	messages: many(messages)
}));

export const chatParticipantsRelations = relations(chatParticipants, ({ one }) => ({
	chat: one(chats, { fields: [chatParticipants.chatId], references: [chats.id] }),
	user: one(user, { fields: [chatParticipants.userId], references: [user.id] })
}));

export const newMessagesRelations = relations(messages, ({ one }) => ({
	chat: one(chats, { fields: [messages.chatId], references: [chats.id] }),
	sender: one(user, { fields: [messages.senderId], references: [user.id] })
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
	recipient: one(user, {
		fields: [notifications.recipientId],
		references: [user.id],
		relationName: 'received_notifications'
	}),
	actor: one(user, {
		fields: [notifications.actorId],
		references: [user.id],
		relationName: 'sent_notifications'
	})
}));

export const userFeedsRelations = relations(userFeeds, ({ one }) => ({
	user: one(user, { fields: [userFeeds.userId], references: [user.id] }),
	algo: one(algorithms, { fields: [userFeeds.algoId], references: [algorithms.id] })
}));

export const userGroupsRelations = relations(userGroups, ({ one, many }) => ({
	owner: one(user, { fields: [userGroups.ownerId], references: [user.id] }),
	members: many(userGroupMembers)
}));

export const userGroupMembersRelations = relations(userGroupMembers, ({ one }) => ({
	group: one(userGroups, { fields: [userGroupMembers.groupId], references: [userGroups.id] }),
	user: one(user, { fields: [userGroupMembers.userId], references: [user.id] })
}));

export const tagsRelations = relations(tags, ({ many }) => ({
	posts: many(postTags)
}));

export const postTagsRelations = relations(postTags, ({ one }) => ({
	post: one(posts, { fields: [postTags.postId], references: [posts.id] }),
	tag: one(tags, { fields: [postTags.tagId], references: [tags.id] })
}));

export const storiesRelations = relations(stories, ({ one, many }) => ({
	author: one(user, { fields: [stories.authorId], references: [user.id] }),
	group: one(userGroups, { fields: [stories.groupId], references: [userGroups.id] }),
	views: many(storyViews),
	likes: many(storyLikes)
}));

export const storyViewsRelations = relations(storyViews, ({ one }) => ({
	story: one(stories, { fields: [storyViews.storyId], references: [stories.id] }),
	viewer: one(user, { fields: [storyViews.viewerId], references: [user.id] })
}));

export const storyLikesRelations = relations(storyLikes, ({ one }) => ({
	story: one(stories, { fields: [storyLikes.storyId], references: [stories.id] }),
	user: one(user, { fields: [storyLikes.userId], references: [user.id] })
}));

export const userBlocksRelations = relations(userBlocks, ({ one }) => ({
	blocker: one(user, {
		fields: [userBlocks.blockerId],
		references: [user.id],
		relationName: 'user_blocks_blocker'
	}),
	blocked: one(user, {
		fields: [userBlocks.blockedId],
		references: [user.id],
		relationName: 'user_blocks_blocked'
	})
}));

export const iconSetsRelations = relations(iconSets, ({ one, many }) => ({
	owner: one(user, { fields: [iconSets.ownerId], references: [user.id] }),
	savedBy: many(userSavedIconSets),
	posts: many(posts)
}));

export const userSavedIconSetsRelations = relations(userSavedIconSets, ({ one }) => ({
	user: one(user, { fields: [userSavedIconSets.userId], references: [user.id] }),
	iconSet: one(iconSets, { fields: [userSavedIconSets.iconSetId], references: [iconSets.id] })
}));

export const emojiSetsRelations = relations(emojiSets, ({ one, many }) => ({
	owner: one(user, { fields: [emojiSets.ownerId], references: [user.id] }),
	savedBy: many(userSavedEmojiSets),
	posts: many(posts)
}));

export const userSavedEmojiSetsRelations = relations(userSavedEmojiSets, ({ one }) => ({
	user: one(user, { fields: [userSavedEmojiSets.userId], references: [user.id] }),
	emojiSet: one(emojiSets, { fields: [userSavedEmojiSets.emojiSetId], references: [emojiSets.id] })
}));

export const instanceSettingsRelations = relations(instanceSettings, ({ one }) => ({
	defaultIconSet: one(iconSets, {
		fields: [instanceSettings.defaultIconSetId],
		references: [iconSets.id]
	})
}));
