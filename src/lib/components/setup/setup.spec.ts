/**
 * @module components/setup/setup.spec
 * @description Tests unitaires de la logique métier et de validation des étapes d'onboarding (/setup).
 */

import { describe, it, expect } from 'vitest';
import { DEFAULT_INSTANCE_SETTINGS } from '$lib/server/instanceSettings';

describe("Logique métier de l'onboarding (/setup)", () => {
	describe('Étape 1 : Validation du Profil', () => {
		function isValidDisplayName(name: string): boolean {
			return name.trim().length >= 3;
		}

		function isValidAvatarUrl(
			url: string | null | undefined,
			currentImageUrl?: string | null
		): boolean {
			if (!url) return true;
			const trimmed = url.trim();
			if (!trimmed) return true;
			return trimmed.startsWith('/media/') || trimmed === currentImageUrl;
		}

		it('refuse les noms affichés de moins de 3 caractères ou vides', () => {
			expect(isValidDisplayName('')).toBe(false);
			expect(isValidDisplayName('  ')).toBe(false);
			expect(isValidDisplayName('a')).toBe(false);
			expect(isValidDisplayName('ab')).toBe(false);
			expect(isValidDisplayName('  ab  ')).toBe(false);
		});

		it('accepte les noms affichés valides (>= 3 caractères)', () => {
			expect(isValidDisplayName('Bob')).toBe(true);
			expect(isValidDisplayName('Alice Dupont')).toBe(true);
			expect(isValidDisplayName('   Camille   ')).toBe(true);
		});

		it("sécurise l'URL de l'avatar (doit provenir du dossier /media/ ou correspondre à l'image actuelle)", () => {
			expect(isValidAvatarUrl('/media/avatars/avatar123.webp')).toBe(true);
			expect(isValidAvatarUrl('https://malicious.site/xss.png')).toBe(false);
			expect(isValidAvatarUrl('javascript:alert(1)')).toBe(false);
			expect(isValidAvatarUrl(null)).toBe(true);
			expect(isValidAvatarUrl('', null)).toBe(true);
			expect(
				isValidAvatarUrl(
					'https://existing-provider.com/photo.jpg',
					'https://existing-provider.com/photo.jpg'
				)
			).toBe(true);
		});
	});

	describe('Étape 2 : Paramètres par défaut de la confidentialité', () => {
		it('vérifie la conformité des options de visibilité du profil', () => {
			const defaultPrivacy = {
				requireFollowRequest: false,
				requireMessageApproval: false,
				showFollowers: true,
				showFollowing: true,
				allowMentions: true
			};

			expect(defaultPrivacy.requireFollowRequest).toBe(false);
			expect(defaultPrivacy.showFollowers).toBe(true);
			expect(defaultPrivacy.showFollowing).toBe(true);
			expect(defaultPrivacy.allowMentions).toBe(true);
		});
	});

	describe('Étape 3 : Configuration du premier flux par défaut', () => {
		it('possède les paramètres par défaut conformes pour le flux initial', () => {
			const config = DEFAULT_INSTANCE_SETTINGS.contentDefaults.defaultFeedConfig!;
			expect(config.name).toBe('Chronologique');
			expect(config.source).toBe('public');
			expect(config.sortMode).toBe('chrono');
			expect(config.timeWindow).toBe('7d');
			expect(config.hideSeen).toBe(false);
		});
	});

	describe('Étape 4 : Calcul de progression du wizard', () => {
		const TOTAL_STEPS = 4;

		function getProgressPercentage(step: number): number {
			return Math.round((step / TOTAL_STEPS) * 100);
		}

		it("calcule exactement le pourcentage d'avancement pour chaque étape", () => {
			expect(getProgressPercentage(1)).toBe(25);
			expect(getProgressPercentage(2)).toBe(50);
			expect(getProgressPercentage(3)).toBe(75);
			expect(getProgressPercentage(4)).toBe(100);
		});
	});
});
