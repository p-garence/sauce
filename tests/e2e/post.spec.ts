import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const keysFilePath = path.join(process.cwd(), 'tests/e2e/test-keys.json');
let availableKeys: string[] = [];
try {
	availableKeys = JSON.parse(fs.readFileSync(keysFilePath, 'utf-8'));
} catch (e) {
	console.error('Impossible de lire les clés. Le setup a-t-il été lancé ?', e);
}

test.describe.serial('Création de Posts et Affichage Individuel', () => {
	let page: Page;
	let createdPostId: string | null = null; // Pour stocker l'ID et tester /post/[id]

	test.beforeAll(async ({ browser }) => {
		page = await browser.newPage();
		const myKey = availableKeys[2];
		const uniqueSuffix = Date.now();

		await page.goto('/login');
		await page.click('button:has-text("J\'ai une clé")');
		await page.fill('input[name="inviteKey"]', myKey);
		await page.fill('input[name="username"]', `auteur_${uniqueSuffix}`);
		await page.fill('input[name="email"]', `auteur_${uniqueSuffix}@test.com`);
		await page.fill('input[name="password"]', 'password123');
		await page.click('button:has-text("Créer mon compte")');

		await page.waitForURL(/.*\/setup/);
		await page.fill('input#name', 'Auteur Testeur');
		await page.locator('button:has-text("Suivant")').click();
		await page.locator('button:has-text("Suivant")').click();
		await page.locator('button:has-text("Terminer")').click();

		await page.waitForURL(/.*\/flux/);
	});

	test.beforeEach(async () => {
		await page.goto('/publier');
	});

	test('1. Validation : Impossible de publier un post vide', async () => {
		const publishBtn = page.locator('button:has-text("Publier")');
		await expect(publishBtn).toBeDisabled();
		await page.fill('.text-slide-input', '   ');
		await expect(publishBtn).toBeDisabled();
	});

	test("2. Création et vérification d'un post simple sur le flux", async () => {
		const postContent = `Mon super post de test - ${Date.now()}`;

		// Création
		await page.fill('.text-slide-input', postContent);
		await page.locator('button:has-text("Publier")').click();

		// Le composant clearProfileState puis on reste / on est redirigé
		// Ton form action redirige potentiellement ou met juste à jour l'UI.
		// On s'assure d'aller sur le flux pour voir le post :
		await page.goto('/flux');

		// On cherche le post dans le flux (le premier qui contient le texte)
		const postElement = page.locator(`article.post:has-text("${postContent}")`).first();
		await expect(postElement).toBeVisible();

		// On récupère l'ID du DOM (tu as id="post-{post.id}" dans Post.svelte)
		const domId = await postElement.getAttribute('id'); // ex: "post-uuid-1234"
		expect(domId).not.toBeNull();
		createdPostId = domId?.replace('post-', '') || null;
	});

	test('3. Affichage individuel du post via /post/[id]', async () => {
		// Sécurité si le test précédent a échoué
		test.skip(
			!createdPostId,
			"Impossible de tester la page individuelle car aucun post n'a été créé"
		);

		// On va sur la page dédiée
		await page.goto(`/post/${createdPostId}`);

		// Vérifications de l'UI (PageHeader + Post.svelte)
		await expect(page.locator('h1.header-title')).toContainText('Publication'); // Le PageHeader
		await expect(page.locator('article.post')).toBeVisible(); // Le composant Post

		// Vérifie que l'auteur est bien nous
		await expect(page.locator('.author-info strong')).toContainText('Auteur Testeur');
	});

	test("4. Affichage du message 'Introuvable' sur une fausse ID", async () => {
		// On va sur un UUID valide qui n'existe pas
		await page.goto('/post/00000000-0000-0000-0000-000000000000');

		// On vérifie que l'erreur 404 / introuvable est affichée
		await expect(page.locator('body')).toContainText(/introuvable/i);
	});

	test("5. Création d'un carrousel Multi-textes", async () => {
		await page.fill('.text-slide-input', 'Slide 1: Intro');
		await page.locator('button:has-text("Ajouter panneau texte")').click();
		await expect(page.locator('.editor-container')).toHaveClass(/is-carousel/);
		await page.fill('.text-slide-input', 'Slide 2: Fin');

		await page.fill('.caption-rich-input', 'Ma légende globale');
		await page.locator('select').selectOption('private');
		await page.locator('button:has-text("Publier")').click();

		// On attend que le chargement soit fini
		await expect(page.locator('button:has-text("Publication...")')).toBeHidden();
	});
});
