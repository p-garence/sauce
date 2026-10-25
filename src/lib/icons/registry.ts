import type { Component } from 'svelte';
import type { IconId } from './types';
import {
	House,
	PlusSquare,
	MessageCircle,
	Compass,
	Bell,
	Settings,
	Heart,
	MessageSquare,
	Ellipsis,
	Pencil,
	Trash,
	X,
	ChevronLeft,
	ChevronRight,
	Search,
	Plus,
	Check,
	Link,
	Mail,
	ArrowUp,
	Download,
	Camera,
	Image,
	Video,
	Layers,
	Type,
	VolumeX,
	Eye,
	Lock,
	Tag,
	Palette,
	Users,
	Clock,
	Server,
	Paperclip,
	Mic,
	Rss,
	ExternalLink
} from '@lucide/svelte';

/**
 * Mappage du pack "Original" : émojis et symboles natifs textuels
 */
export const ORIGINAL_ICONS: Record<IconId, string> = {
	// 1. Navigation
	'nav.feed': '🏠',
	'nav.publish': '➕',
	'nav.chat': '💬',
	'nav.explore': '🔍',
	'nav.notifications': '🔔',
	'nav.settings': '⚙️',

	// 2. Actions & Interactions
	'action.like': '❤️',
	'action.like_outline': '🤍',
	'action.comment': '💬',
	'action.menu': '⋯',
	'action.edit': '✏️',
	'action.delete': '🗑️',
	'action.close': '✕',
	'action.back': '←',
	'action.search': '🔍',
	'action.add': '➕',
	'action.check': '✓',
	'action.copy_link': '🔗',
	'action.message': '✉️',
	'action.up': '⬆️',
	'action.download': '⬇️',
	'action.attachment': '📎',
	'action.mic': '🎤',
	'action.external': '↗️',

	// 3. Médias & Création
	'media.camera': '📷',
	'media.image': '🖼️',
	'media.video': '🎥',
	'media.carousel': '📑',
	'media.text': '🔤',
	'media.prev': '‹',
	'media.next': '›',

	// 4. Statuts & Relations
	'status.mute': '🔇',
	'status.visibility': '👁️',
	'status.lock': '🔒',
	'status.tag': '🏷️',
	'status.palette': '🎨',
	'status.users': '👥',
	'status.time': '⏳',
	'status.server': '🖥️',
	'source.rss': '📡'
};

/**
 * Mappage du pack "Lucide" : composants vectoriels modernes (@lucide/svelte)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const LUCIDE_ICONS: Record<IconId, Component<any>> = {
	// 1. Navigation
	'nav.feed': House,
	'nav.publish': PlusSquare,
	'nav.chat': MessageCircle,
	'nav.explore': Compass,
	'nav.notifications': Bell,
	'nav.settings': Settings,

	// 2. Actions & Interactions
	'action.like': Heart,
	'action.like_outline': Heart,
	'action.comment': MessageSquare,
	'action.menu': Ellipsis,
	'action.edit': Pencil,
	'action.delete': Trash,
	'action.close': X,
	'action.back': ChevronLeft,
	'action.search': Search,
	'action.add': Plus,
	'action.check': Check,
	'action.copy_link': Link,
	'action.message': Mail,
	'action.up': ArrowUp,
	'action.download': Download,
	'action.attachment': Paperclip,
	'action.mic': Mic,
	'action.external': ExternalLink,

	// 3. Médias & Création
	'media.camera': Camera,
	'media.image': Image,
	'media.video': Video,
	'media.carousel': Layers,
	'media.text': Type,
	'media.prev': ChevronLeft,
	'media.next': ChevronRight,

	// 4. Statuts & Relations
	'status.mute': VolumeX,
	'status.visibility': Eye,
	'status.lock': Lock,
	'status.tag': Tag,
	'status.palette': Palette,
	'status.users': Users,
	'status.time': Clock,
	'status.server': Server,
	'source.rss': Rss
};

/**
 * Convertit un identifiant d'icône (ex: "action.like") en nom de fichier SVG pour le pack Sauce (ex: "action_like")
 */
export function getSauceIconBaseName(id: IconId): string {
	return id.replace(/\./g, '_');
}

export const getCustomIconBaseName = getSauceIconBaseName;
