import { browser } from '$app/environment';
import type { IconId, IconPack } from '$lib/icons/types';

class IconThemeState {
	pack = $state<IconPack>('lucide');
	fallback = $state<'lucide' | 'original'>('lucide');
	customIcons = $state<Record<string, string>>({});
	activeIconSetId = $state<string | null>(null);
	activeIconSetName = $state<string | null>(null);

	constructor() {
		if (browser) {
			this.activeIconSetId = localStorage.getItem('active_icon_set_id');
			this.activeIconSetName = localStorage.getItem('active_icon_set_name');

			const saved = localStorage.getItem('icon_pack');
			if (saved === 'original' || saved === 'lucide' || saved === 'sauce') {
				this.pack = saved as IconPack;
			} else if (saved === 'custom') {
				this.pack = 'sauce';
			} else {
				this.pack = 'lucide';
			}

			const savedFallback = localStorage.getItem('icon_fallback');
			if (savedFallback === 'original' || savedFallback === 'lucide') {
				this.fallback = savedFallback;
			} else {
				this.fallback = 'lucide';
			}

			try {
				const savedCustom = localStorage.getItem('custom_icons_data');
				if (savedCustom) {
					this.customIcons = JSON.parse(savedCustom);
				}
			} catch (e) {
				console.error('Error loading custom icons', e);
			}
		}
	}

	setPack(newPack: IconPack) {
		this.pack = newPack;
		if (browser) {
			localStorage.setItem('icon_pack', newPack);
		}
	}

	setFallback(newFallback: 'lucide' | 'original') {
		this.fallback = newFallback;
		if (browser) {
			localStorage.setItem('icon_fallback', newFallback);
		}
	}

	setCustomIcon(id: IconId, dataUrl: string) {
		this.customIcons = { ...this.customIcons, [id]: dataUrl };
		if (browser) {
			try {
				localStorage.setItem('custom_icons_data', JSON.stringify(this.customIcons));
			} catch (e) {
				console.error('Error saving custom icon to localStorage', e);
				alert('Stockage local saturé ou erreur lors de l’enregistrement de l’icône.');
			}
		}
	}

	removeCustomIcon(id: IconId) {
		const next = { ...this.customIcons };
		delete next[id];
		this.customIcons = next;
		if (browser) {
			localStorage.setItem('custom_icons_data', JSON.stringify(this.customIcons));
		}
	}

	clearAllCustomIcons() {
		this.customIcons = {};
		if (browser) {
			localStorage.removeItem('custom_icons_data');
		}
	}

	getCustomIcon(id: IconId): string | null {
		return this.customIcons[id] || null;
	}

	applyServerIconSet(
		set: { id: string; name: string; icons: Record<string, string>; fallback?: string } | null
	) {
		if (set) {
			this.activeIconSetId = set.id;
			this.activeIconSetName = set.name;
			this.customIcons = set.icons || {};
			this.fallback = (set.fallback as 'lucide' | 'original') || 'lucide';
			this.setPack('sauce');
			if (browser) {
				localStorage.setItem('active_icon_set_id', set.id);
				localStorage.setItem('active_icon_set_name', set.name);
				localStorage.setItem('custom_icons_data', JSON.stringify(this.customIcons));
			}
		} else {
			this.revertToDefault();
		}
	}

	revertToDefault() {
		if (
			!this.activeIconSetId &&
			this.pack === 'lucide' &&
			Object.keys(this.customIcons).length === 0
		) {
			return;
		}
		this.activeIconSetId = null;
		this.activeIconSetName = null;
		this.customIcons = {};
		this.setPack('lucide');
		if (browser) {
			localStorage.removeItem('active_icon_set_id');
			localStorage.removeItem('active_icon_set_name');
			localStorage.removeItem('custom_icons_data');
		}
	}
}

export const iconTheme = new IconThemeState();
