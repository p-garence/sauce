export type IconId =
	// 1. Navigation principale
	| 'nav.feed'
	| 'nav.publish'
	| 'nav.chat'
	| 'nav.explore'
	| 'nav.notifications'
	| 'nav.settings'

	// 2. Actions & Interactions universelles
	| 'action.like'
	| 'action.like_outline'
	| 'action.comment'
	| 'action.menu'
	| 'action.edit'
	| 'action.delete'
	| 'action.close'
	| 'action.back'
	| 'action.search'
	| 'action.add'
	| 'action.check'
	| 'action.copy_link'
	| 'action.message'
	| 'action.up'
	| 'action.download'
	| 'action.attachment'
	| 'action.mic'
	| 'action.external'

	// 3. Médias & Création
	| 'media.camera'
	| 'media.image'
	| 'media.video'
	| 'media.carousel'
	| 'media.text'
	| 'media.prev'
	| 'media.next'

	// 4. Statuts & Relations
	| 'status.mute'
	| 'status.visibility'
	| 'status.lock'
	| 'status.tag'
	| 'status.palette'
	| 'status.users'
	| 'status.time'
	| 'status.server'
	| 'source.rss';

export type IconPack = 'original' | 'lucide' | 'sauce';
