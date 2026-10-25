import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import { getKey, registerNewUser, type RegisteredUser } from './helpers';

test.describe.serial('Upload et Traitement des Médias (Images réelles, Modal de recadrage)', () => {
	let page: Page;
	let currentUser: RegisteredUser;

	const samplePngPath = path.join(process.cwd(), 'tests/fixtures/sample.png');
	const sampleJpgPath = path.join(process.cwd(), 'tests/fixtures/sample.jpg');

	test.beforeAll(async ({ browser }) => {
		page = await browser.newPage();
		const userKey = getKey(10);
		currentUser = await registerNewUser(page, userKey, {
			name: 'Marc Photographe'
		});
	});

	test("1. Publication d'un post avec image réelle et validation du modal de crop", async () => {
		await page.goto('/publier');

		// 1. Injection du fichier image dans l'input masqué
		const fileInput = page.locator('input[type="file"][accept*="image"]');
		await fileInput.setInputFiles(samplePngPath);

		// 2. Le modal de recadrage doit s'ouvrir automatiquement
		const cropModal = page.locator('.overlay .modal');
		await expect(cropModal).toBeVisible();
		await expect(cropModal.locator('h3')).toContainText('Recadrer');
		await expect(cropModal.locator('.crop-area img')).toBeVisible();

		// 3. Validation du recadrage (bouton "Suivant")
		await cropModal.locator('button.btn.save:has-text("Suivant")').click();

		// 4. Le modal se ferme et le média est injecté dans l'éditeur
		await expect(cropModal).toBeHidden();
		await expect(page.locator('.media-slide img')).toBeVisible();

		// 5. Ajout d'une légende
		const captionText = `Photo test E2E ${Date.now()}`;
		// Si carrousel, textarea pour légende
		if (await page.locator('.caption-section textarea').isVisible()) {
			await page.locator('.caption-section textarea').fill(captionText);
		}

		// 6. Publication du post
		const publishBtn = page.locator('button.btn-publish:has-text("Publier")');
		await expect(publishBtn).toBeEnabled();
		await publishBtn.click();

		// 7. Attente de la redirection vers le flux suite à l'upload et au traitement
		await page.waitForURL(/\/flux/, { timeout: 15000 });
		const postWithMedia = page.locator(
			'article.post:has(.carousel-item img, .carousel-item video)'
		);
		await expect(postWithMedia.first()).toBeVisible({ timeout: 10000 });
	});

	test('2. Changement de photo de profil (Avatar) avec recadrage 1:1', async () => {
		await page.goto('/modifier_profil');

		// 1. Injection de la nouvelle photo d'avatar
		const avatarInput = page.locator('input[type="file"][accept*="image"]');
		await avatarInput.setInputFiles(sampleJpgPath);

		// 2. Modal de crop 1:1
		const cropModal = page.locator('.overlay .modal');
		await expect(cropModal).toBeVisible();
		await cropModal.locator('button.btn.save:has-text("Suivant")').click();
		await expect(cropModal).toBeHidden();

		// 3. Vérification de la preview mise à jour
		await expect(page.locator('.avatar-img')).toBeVisible();

		// 4. Enregistrement des modifications
		await page.locator('button.header-save-btn:has-text("Enregistrer")').click();

		// 5. Redirection vers le profil et validation de l'avatar
		await page.waitForURL(new RegExp(`/profil/${currentUser.username}`));
		await expect(page.locator('.avatar-container img, .avatar-inner img')).toBeVisible();
	});
});
