import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { getKey, registerNewUser, type RegisteredUser } from './helpers';

test.describe.serial("Relations Sociales (Abonnements, Demandes d'approbation, En commun)", () => {
	let contextA: BrowserContext;
	let contextB: BrowserContext;
	let pageA: Page;
	let pageB: Page;

	let userA: RegisteredUser;
	let userB: RegisteredUser; // Compte avec demande d'abonnement requise

	test.beforeAll(async ({ browser }) => {
		const keyA = getKey(4);
		const keyB = getKey(5);

		// Contexte User A (Public)
		contextA = await browser.newContext();
		pageA = await contextA.newPage();
		userA = await registerNewUser(pageA, keyA, {
			name: 'Alice Publique'
		});

		// Contexte User B (Privé avec approbation obligatoire)
		contextB = await browser.newContext();
		pageB = await contextB.newPage();
		userB = await registerNewUser(pageB, keyB, {
			name: 'Bob Privé',
			requireFollowRequest: true
		});
	});

	test.afterAll(async () => {
		await contextA.close();
		await contextB.close();
	});

	test("1. Alice envoie une demande d'abonnement à Bob (compte privé)", async () => {
		await pageA.goto(`/profil/${userB.username}`);
		await expect(pageA.locator('h2.display-name')).toContainText(userB.name);

		const followBtn = pageA.locator('.follow-container button.btn-action');
		await expect(followBtn).toContainText("S'abonner");

		// Alice clique pour s'abonner
		await followBtn.click();

		// Comme Bob nécessite approbation, le statut devient "Demande envoyée"
		await expect(followBtn).toContainText('Demande envoyée');
	});

	test("2. Bob voit et accepte la demande d'abonnement", async () => {
		// Bob va sur la page de ses demandes en attente
		await pageB.goto(`/profil/${userB.username}/invites`);

		// Vérification de la présence de la demande d'Alice
		const requestRow = pageB.locator(`.request-row:has-text("${userA.username}")`);
		await expect(requestRow).toBeVisible();

		// Bob confirme la demande
		await requestRow.locator('button.btn.accept:has-text("Confirmer")').click();

		// La liste devient vide
		await expect(pageB.locator('.empty-state')).toBeVisible();
	});

	test('3. Alice est maintenant abonnée et peut se désabonner', async () => {
		await pageA.goto(`/profil/${userB.username}`);
		const followBtn = pageA.locator('.follow-container button.btn-action');

		// Le bouton indique maintenant qu'elle est abonnée
		await expect(followBtn).toContainText('Abonné(e)');

		// Vérification de l'incrémentation du nombre d'abonnés de Bob
		const followersBox = pageA.locator('.stat-box:has(.stat-label:has-text("Abonnés"))');
		await expect(followersBox.locator('.stat-number')).toContainText('1');

		// Alice clique sur le bouton pour se désabonner
		await followBtn.click();

		// Le statut redevient "S'abonner" et le compteur retombe à 0
		await expect(followBtn).toContainText("S'abonner");
		await expect(followersBox.locator('.stat-number')).toContainText('0');
	});

	test("4. Bob s'abonne directement à Alice (compte public)", async () => {
		await pageB.goto(`/profil/${userA.username}`);

		const followBtn = pageB.locator('.follow-container button.btn-action');
		await expect(followBtn).toContainText("S'abonner");

		// Comme Alice est publique, l'abonnement est direct
		await followBtn.click();
		await expect(followBtn).toContainText('Abonné(e)');

		// Vérification des stats chez Alice
		const followersBox = pageB.locator('.stat-box:has(.stat-label:has-text("Abonnés"))');
		await expect(followersBox.locator('.stat-number')).toContainText('1');
	});
});
