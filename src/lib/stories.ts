export type StoryReplyData = {
	id: string;
	authorId?: string;
	authorUsername?: string;
	mediaUrl: string;
	mediaType: 'image' | 'video';
	caption?: string | null;
};

/**
 * Détecte et extrait les métadonnées d'une story attachée à un message de réponse.
 */
export function parseStoryReply(content: string): { story: StoryReplyData | null; text: string } {
	if (!content) return { story: null, text: '' };

	const match = content.match(/^\[story:(\{.*?\})\](?:\n|\r\n)?([\s\S]*)$/);
	if (match) {
		try {
			const story = JSON.parse(match[1]) as StoryReplyData;
			if (
				story &&
				typeof story.id === 'string' &&
				typeof story.mediaUrl === 'string' &&
				story.mediaUrl.startsWith('/media/')
			) {
				return { story, text: match[2].trim() };
			}
		} catch {
			// Si le JSON est invalide, on laisse le contenu tel quel
		}
	}

	return { story: null, text: content };
}

/**
 * Formate le contenu d'un message pour y attacher les données de la story référencée.
 */
export function formatStoryReplyContent(story: StoryReplyData, messageText: string): string {
	const payload: StoryReplyData = {
		id: story.id,
		authorId: story.authorId,
		authorUsername: story.authorUsername,
		mediaUrl: story.mediaUrl,
		mediaType: story.mediaType,
		caption: story.caption || null
	};

	return `[story:${JSON.stringify(payload)}]\n${messageText.trim()}`;
}
