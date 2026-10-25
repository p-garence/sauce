/**
 * @module server/chat
 * @description Point d'entrée du domaine chat ré-exportant les fonctionnalités de conversations et messages.
 */

export {
	getMessagePermission,
	getOrCreateDirectChat,
	createGroupChat,
	softDeleteChat,
	acceptChatInvitation,
	rejectChatInvitation,
	blockChatUser,
	unblockChatUser,
	updateGroupInfo,
	addGroupMember,
	toggleGroupAdmin,
	removeGroupMember,
	leaveGroupChat,
	toggleChatMute,
	assertCanSendChatMessage
} from './conversations';

export { sendChatMessage, updateChatMessage, deleteChatMessage } from './messages';

export { formatMessageReactions, toggleMessageReaction } from './reactions';
