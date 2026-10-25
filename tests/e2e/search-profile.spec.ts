import { test, expect, type Page } from '@playwright/test';
import { getKey, registerNewUser, type RegisteredUser } from './helpers';

test.describe.serial('Profil Utilisateur, Recherche (Explorer) et Notifications', () => {
	let page: Page;
	let currentUser: RegisteredUser;

	test.beforeAll(async ({ browser }) => {
		page = await browser.newPage();
		const userKey = getKey(9);
		currentUser = await registerNewUser(page, userKey, {
			name: 'Félix Explorateur',
			bio: 'Bio originale'
		});
	});

	test('1. Modification du profil (Nom, Bio, Site Web)', async () => {
		await page.goto(`/profil/${currentUser.username}`);
		await expect(page.locator('h2.display-name')).toContainText(currentUser.name);

		// Clic sur le bouton Modifier
		await page.locator('a.btn-action.edit:has-text("Modifier")').click();
		await page.waitForURL(/.*\/modifier_profil/);
		await expect(page.locator('h1.header-title')).toContainText(currentUser.name);

		// Mise à jour des informations
		const updatedBio = `Bio mise à jour avec succès ${Date.now()}`;
		const updatedSite = 'https://monportail-test.com';

		await page.fill('textarea#bio', updatedBio);
		await page.locator('input[name="show_bio"]').setChecked(true);

		await page.fill('input#site', updatedSite);
		await page.locator('input[name="show_site"]').setChecked(true);

		// Sauvegarde
		await page.locator('button.header-save-btn:has-text("Enregistrer")').click();

		// Redirection vers le profil
		await page.waitForURL(new RegExp(`/profil/${currentUser.username}`));

		// Vérification de la nouvelle bio et du site web
		await expect(page.locator('.profile-bio')).toContainText(updatedBio);
		await expect(page.locator('.profile-links a[href*="monportail-test.com"]')).toBeVisible();
	});

	test('2. Navigation entre les onglets du profil (Publications et Favoris)', async () => {
		await page.goto(`/profil/${currentUser.username}`);

		// Vérification des deux onglets
		const postsTab = page.locator('.profile-tabs button.tab-btn:has-text("Publications")');
		const likesTab = page.locator('.profile-tabs button.tab-btn:has-text("Favoris")');

		await expect(postsTab).toHaveClass(/active/);
		await expect(likesTab).toBeVisible();

		// Clic sur l'onglet Favoris
		await likesTab.click();
		await expect(likesTab).toHaveClass(/active/);
		await expect(postsTab).not.toHaveClass(/active/);

		// Retour sur Publications
		await postsTab.click();
		await expect(postsTab).toHaveClass(/active/);
	});

	test("3. Recherche d'utilisateurs dans la page Explorer", async () => {
		await page.goto('/explorer');
		await expect(page.locator('.page-title')).toContainText('Explorer');

		// Basculer sur l'onglet Personnes
		const peopleTab = page.locator('.tabs button.tab:has-text("Personnes")');
		await peopleTab.click();
		await expect(peopleTab).toHaveClass(/active/);

		// Recherche d'un autre utilisateur (le compte admin créé à l'initialisation)
		const searchInput = page.locator('.search-input-wrapper input');
		await searchInput.fill('admin');

		// Attendre l'apparition du résultat (admin)
		const userResult = page.locator('.user-row:has-text("admin")');
		await expect(userResult).toBeVisible({ timeout: 10000 });

		// Clic sur l'utilisateur trouvé
		await userResult.click();
		await page.waitForURL(/\/profil\/admin/);
		await expect(page.locator('h2.display-name')).toContainText('Admin Boss');
	});

	test('4. Recherche de publications dans la page Explorer', async () => {
		await page.goto('/explorer');

		// Basculer sur l'onglet Publications
		await page.locator('.tabs button.tab:has-text("Publications")').click();
		await expect(page.locator('.tabs button.tab:has-text("Publications")')).toHaveClass(/active/);

		// Vérification du champ de recherche de posts
		const postSearchInput = page.locator('.post-search-component input');
		await expect(postSearchInput).toBeVisible();

		// Saisie d'une requête de recherche
		await postSearchInput.fill('test');

		// Le composant gère les résultats ou l'état vide sans erreur
		await expect(page.locator('.post-search-component')).toBeVisible();
	});

	test('5. Menu des notifications dans le bandeau supérieur', async () => {
		await page.goto('/flux');

		// Clic sur la cloche de notification
		const notifBtn = page.locator('button.notif-button[aria-label="Notifications"]');
		await expect(notifBtn).toBeVisible();
		await notifBtn.click();

		// Le panneau déroulant s'ouvre
		const dropdown = page.locator('.dropdown');
		await expect(dropdown).toBeVisible();
		await expect(dropdown.locator('h3')).toContainText('Notifications');

		// Fermeture du menu en cliquant sur l'overlay
		await page.locator('.overlay').click();
		await expect(dropdown).toBeHidden();
	});
});
