import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import { getKey, registerNewUser } from './helpers';

test.describe
	.serial('Paramètres : Flux, Groupes de visibilité, Confidentialité et Notifications', () => {
	let page: Page;

	test.beforeAll(async ({ browser }) => {
		page = await browser.newPage();
		const userKey = getKey(8);
		await registerNewUser(page, userKey, {
			name: 'Emma Paramètres'
		});
	});

	test("1. Création, sélection et suppression d'un flux personnalisé", async () => {
		await page.goto('/parametres');
		await expect(page.locator('.page-title')).toContainText('Paramètres');

		// Accéder à l'onglet "Flux"
		await page.locator('.tabs-nav button.tab-btn:has-text("Flux")').click();
		await expect(page.locator('h2:has-text("Gérer mes flux")')).toBeVisible();

		// Ouvrir le formulaire de création
		await page.locator('button.btn-create:has-text("+ Créer un nouveau flux")').click();
		await expect(page.locator('.feed-card.new-feed')).toBeVisible();

		// Remplir et soumettre le nouveau flux
		const feedName = `Tech News ${Date.now()}`;
		await page.fill('.feed-card.new-feed input[name="name"]', feedName);
		await page.locator('.feed-card.new-feed select[name="source"]').selectOption('following');
		await page.locator('.feed-card.new-feed input[name="hideSeen"]').check();
		await page.locator('.feed-card.new-feed button[type="submit"]:has-text("Créer")').click();

		// Vérifier l'apparition de la carte du flux avec ses badges
		const feedCard = page.locator(`.feed-card:has(h3:has-text("${feedName}"))`);
		await expect(feedCard).toBeVisible();
		await expect(feedCard.locator('.badge:has-text("Abonnements")')).toBeVisible();
		await expect(feedCard.locator('.badge-seen')).toBeVisible();

		// Vérifier la disponibilité dans le Feed principal
		await page.goto('/flux');
		const feedSelector = page.locator('select.feed-selector');
		await expect(feedSelector.locator(`option:has-text("${feedName}")`)).toBeAttached();

		// Retourner aux réglages pour supprimer le flux créé
		await page.goto('/parametres');
		await page.locator('.tabs-nav button.tab-btn:has-text("Flux")').click();
		const targetFeedCard = page.locator(`.feed-card:has(h3:has-text("${feedName}"))`);
		await targetFeedCard.locator('button.btn-icon.danger').click();

		// Vérifier que le flux a disparu
		await expect(page.locator(`.feed-card:has(h3:has-text("${feedName}"))`)).toBeHidden();
	});

	test("2. Création et suppression d'un groupe de visibilité", async () => {
		await page.goto('/parametres');

		// Accéder à l'onglet "Groupes"
		await page.locator('.tabs-nav button.tab-btn:has-text("Groupes")').click();
		await expect(page.locator('h2:has-text("Mes groupes de visibilité")')).toBeVisible();

		// Créer un nouveau groupe
		const groupName = `Cercle Proche ${Date.now()}`;
		await page.fill('.create-box input[name="name"]', groupName);
		await page.locator('.create-box button.btn-create:has-text("Créer le groupe")').click();

		// Vérifier la présence du groupe dans la liste
		const groupCard = page.locator(`.group-card:has(.group-name:has-text("${groupName}"))`);
		await expect(groupCard).toBeVisible();

		// Supprimer le groupe
		page.once('dialog', (dialog) => dialog.accept());
		await groupCard.locator('button.btn-delete').click();

		await expect(groupCard).toBeHidden();
	});

	test('3. Configuration de la confidentialité et actions rétroactives', async () => {
		await page.goto('/parametres');

		// Accéder à l'onglet "Vie Privée"
		await page.locator('.tabs-nav button.tab-btn:has-text("Vie Privée")').click();
		await expect(page.locator('h2:has-text("Confidentialité du profil")')).toBeVisible();

		// Basculer un toggle de confidentialité
		const approveFollowersLabel = page.locator('label:has-text("Approuver les abonnés")');
		const approveFollowersCheckbox = approveFollowersLabel.locator('input[type="checkbox"]');
		const initialChecked = await approveFollowersCheckbox.isChecked();
		await approveFollowersLabel.click();

		// Vérifier la prise en compte du clic
		const newChecked = await approveFollowersCheckbox.isChecked();
		expect(newChecked).not.toBe(initialChecked);

		// Vérifier la présence des actions rétroactives de visibilité globale
		await expect(page.locator('#bulk-visibility')).toBeVisible();
		await expect(
			page.locator('button:has-text("Modifier la visibilité de tout mon historique")')
		).toBeVisible();
	});

	test('4. Configuration des notifications', async () => {
		await page.goto('/parametres');

		// Accéder à l'onglet "Notifications"
		await page.locator('.tabs-nav button.tab-btn:has-text("Notifications")').click();
		await expect(page.locator('h2:has-text("Préférences des notifications")')).toBeVisible();

		// Vérifier que les cartes et toggles de préférences sont présents
		await expect(page.locator('h2:has-text("Notifications sur cet appareil")')).toBeVisible();
		await expect(page.locator('label:has-text("Messages")')).toBeVisible();
		await expect(page.locator('label:has-text("Nouveaux abonnés")')).toBeVisible();
		await expect(page.locator('label:has-text("Commentaires")')).toBeVisible();
		await expect(page.locator('label:has-text("Mentions J’aime")')).toBeVisible();
	});

	test("5. Création, sélection, publication et suppression de packs d'émojis et d'icônes", async () => {
		// --- A. PACK D'ÉMOJIS ---
		await page.goto('/parametres?tab=emojis');
		await expect(page.locator('h2:has-text("Créer une collection d\'emojis")')).toBeVisible();

		const emojiPackName = `Chats E2E ${Date.now()}`;
		await page.fill('#emoji_set_name', emojiPackName);
		await page.fill('#emoji_set_desc', 'Collection E2E de test');

		// Téléverser un émoji de test
		const samplePngPath = path.join(process.cwd(), 'tests/fixtures/sample.png');
		await page.locator('.emojis-management-section input[type="file"]').setInputFiles(samplePngPath);
		await expect(page.locator('.emoji-card')).toBeVisible();

		await page.locator('button.btn-save-collection').click();

		// Vérifier que la collection apparaît bien dans la bibliothèque et est active par défaut
		const emojiPackCard = page.locator(`.pack-card:has(.pack-title:has-text("${emojiPackName}"))`);
		await expect(emojiPackCard).toBeVisible();
		await expect(emojiPackCard.locator('.active-badge')).toBeVisible();

		// Désactiver la collection
		await emojiPackCard.locator('button.btn-pack-secondary:has-text("Désactiver")').click();
		await expect(emojiPackCard.locator('.active-badge')).toBeHidden();

		// Réactiver la collection
		await emojiPackCard.locator('button.btn-pack-primary:has-text("Activer")').click();
		await expect(emojiPackCard.locator('.active-badge')).toBeVisible();

		// Publier la collection sur le flux
		await emojiPackCard.locator('button.btn-pack-publish:has-text("Publier")').click();
		await expect(page).toHaveURL(/\/publier\?emojiSetId=/);
		await expect(page.locator('.attached-card')).toContainText(emojiPackName);
		await page.locator('button.btn-publish').click();
		await expect(page).toHaveURL(/\/flux/);
		await expect(
			page.locator(`.asset-post-card:has(.asset-post-title:has-text("${emojiPackName}"))`)
		).toBeVisible();

		// Supprimer la collection depuis la bibliothèque
		await page.goto('/parametres?tab=emojis');
		await expect(emojiPackCard).toBeVisible();
		page.once('dialog', (dialog) => dialog.accept());
		await emojiPackCard.locator('button.btn-pack-delete:has-text("Supprimer")').click();
		await expect(emojiPackCard).toBeHidden();

		// --- B. PACK D'ICÔNES ---
		await page.goto('/parametres?tab=icons');
		await page.evaluate(() => {
			localStorage.setItem(
				'custom_icons_data',
				JSON.stringify({
					'nav.feed':
						'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
				})
			);
			localStorage.setItem('icon_pack', 'sauce');
		});
		await page.reload();

		await page.locator('button.theme-option:has-text("custom")').click();
		const iconPackName = `Icones E2E ${Date.now()}`;
		await page.fill('input[placeholder*="Nom du pack"]', iconPackName);
		await page.locator('button.btn-save-pack').click();

		// Vérifier que le pack d'icônes apparaît dans la bibliothèque et est actif par défaut
		const iconPackCard = page.locator(`.pack-card:has(.pack-title:has-text("${iconPackName}"))`);
		await expect(iconPackCard).toBeVisible();
		await expect(iconPackCard.locator('.active-badge')).toBeVisible();

		// Désactiver puis réactiver le pack
		await iconPackCard.locator('button.btn-pack-secondary:has-text("Désactiver")').click();
		await expect(iconPackCard.locator('.active-badge')).toBeHidden();

		await iconPackCard.locator('button.btn-pack-primary:has-text("Activer")').click();
		await expect(iconPackCard.locator('.active-badge')).toBeVisible();

		// Publier le pack d'icônes sur le flux
		await iconPackCard.locator('button.btn-pack-publish:has-text("Publier")').click();
		await expect(page).toHaveURL(/\/publier\?iconSetId=/);
		await expect(page.locator('.attached-card')).toContainText(iconPackName);
		await page.locator('button.btn-publish').click();
		await expect(page).toHaveURL(/\/flux/);
		await expect(
			page.locator(`.asset-post-card:has(.asset-post-title:has-text("${iconPackName}"))`)
		).toBeVisible();

		// Supprimer le pack d'icônes
		await page.goto('/parametres?tab=icons');
		await expect(iconPackCard).toBeVisible();
		page.once('dialog', (dialog) => dialog.accept());
		await iconPackCard.locator('button.btn-pack-delete:has-text("Supprimer")').click();
		await expect(iconPackCard).toBeHidden();
	});
});
