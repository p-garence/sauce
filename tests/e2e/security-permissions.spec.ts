import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { getKey, registerNewUser, type RegisteredUser } from './helpers';

test.describe.serial("Sécurité, Contrôle d'accès et Permissions négatives", () => {
	let contextA: BrowserContext;
	let contextB: BrowserContext;
	let pageA: Page;
	let pageB: Page;

	let userA: RegisteredUser;
	let userB: RegisteredUser;

	let userAPostId: string | null = null;
	let userAPrivatePostId: string | null = null;

	test.beforeAll(async ({ browser }) => {
		const keyA = getKey(11);
		const keyB = getKey(12);

		contextA = await browser.newContext();
		pageA = await contextA.newPage();
		userA = await registerNewUser(pageA, keyA, { name: 'Victor Propriétaire' });

		contextB = await browser.newContext();
		pageB = await contextB.newPage();
		userB = await registerNewUser(pageB, keyB, { name: 'Inès Tiers' });
	});

	test.afterAll(async () => {
		await contextA.close();
		await contextB.close();
	});

	test('1. Visiteur non connecté : Redirection obligatoire des routes protégées', async ({
		browser
	}) => {
		const guestContext = await browser.newContext();
		const guestPage = await guestContext.newPage();

		const protectedRoutes = ['/flux', '/publier', '/parametres', '/chat', '/modifier_profil'];

		for (const route of protectedRoutes) {
			await guestPage.goto(route);
			// Doit être redirigé vers l'accueil ou le login
			await expect(guestPage).not.toHaveURL(new RegExp(`.*${route}`));
		}

		await guestContext.close();
	});

	test('2. Visiteur non connecté : Rejet des endpoints API sensibles (401)', async ({
		request
	}) => {
		// Tentative d'upload sans session
		const resUpload = await request.post('/api/upload');
		expect(resUpload.status()).toBe(401);

		// Tentative de suppression d'un post sans session
		const resDelete = await request.delete('/api/posts/00000000-0000-0000-0000-000000000000');
		expect(resDelete.status()).toBe(401);

		// Tentative de gestion de follow sans session
		const resFollow = await request.post('/api/follow/manage', {
			data: { followerId: 'fake-id', action: 'accept' }
		});
		expect(resFollow.status()).toBe(401);
	});

	test('3. Création des posts par Victor (1 public, 1 privé)', async () => {
		// Post 1 : Public
		await pageA.goto('/publier');
		await pageA.fill('.text-slide-input', 'Post Public de Victor');
		await pageA.locator('button:has-text("Publier")').click();
		await pageA.goto('/flux');
		const publicPost = pageA.locator('article.post:has-text("Post Public de Victor")').first();
		const domIdA = await publicPost.getAttribute('id');
		userAPostId = domIdA?.replace('post-', '') || null;

		// Post 2 : Privé
		await pageA.goto('/publier');
		await pageA.fill('.text-slide-input', 'Post Ultra Secret de Victor');
		// Choix visibilité privée via le sélecteur
		const selectVis = pageA.locator('.setting-row select, select[name="visibility"]').first();
		if (await selectVis.isVisible()) {
			await selectVis.selectOption('private');
		}
		await pageA.locator('button:has-text("Publier")').click();
		await pageA.goto('/flux');
		const privatePost = pageA
			.locator('article.post:has-text("Post Ultra Secret de Victor")')
			.first();
		const domIdB = await privatePost.getAttribute('id');
		userAPrivatePostId = domIdB?.replace('post-', '') || null;
	});

	test('4. Inès ne peut pas supprimer le post de Victor (IDOR)', async () => {
		test.skip(!userAPostId, 'Post public non créé');

		// Inès appelle directement l'API de suppression avec sa session légitime mais sur le post de Victor
		const response = await pageB.request.delete(`/api/posts/${userAPostId}`);

		// Le serveur doit rejeter l'opération (404 Not Found / non autorisé pour empêcher l'IDOR)
		expect([403, 404]).toContain(response.status());

		// On vérifie que le post de Victor est toujours bien vivant
		await pageA.goto(`/post/${userAPostId}`);
		await expect(pageA.locator('article.post')).toBeVisible();
	});

	test('5. Inès ne peut pas accéder au post privé de Victor', async () => {
		test.skip(!userAPrivatePostId, 'Post privé non créé');

		// Inès tente d'accéder au post privé
		await pageB.goto(`/post/${userAPrivatePostId}`);

		// Doit afficher que le post est introuvable ou restreint
		await expect(pageB.locator('body')).toContainText(/introuvable|n'existe pas|supprimée/i);
	});

	test("6. Inès ne peut pas manipuler les groupes d'audience de Victor (IDOR)", async () => {
		// Inès tente d'ajouter un membre dans un groupe arbitraire non autorisé
		const response = await pageB.request.post('/api/groups/members', {
			data: {
				groupId: '00000000-0000-0000-0000-000000000000',
				targetId: '00000000-0000-0000-0000-000000000001'
			}
		});
		// Rejet strict avec 403 Forbidden
		expect(response.status()).toBe(403);
	});

	test('7. Inès ne peut pas aimer (liker) un post privé de Victor', async () => {
		test.skip(!userAPrivatePostId, 'Post privé non créé');

		// Inès tente de liker le post privé de Victor via l'API
		const response = await pageB.request.post('/api/like', {
			data: { postId: userAPrivatePostId, action: 'like' }
		});
		// Le serveur vérifie assertCanSeePost et rejette
		expect([403, 404]).toContain(response.status());
	});

	test("8. Prévention du Path Traversal sur l'accès aux fichiers médias", async ({ request }) => {
		// Tentative de traversal
		const resTraversal = await request.get('/media/..%2f..%2fetc%2fpasswd');
		expect([400, 404]).toContain(resTraversal.status());

		// Fichier inexistant
		const resNotFound = await request.get('/media/non-existent-secret-file.webp');
		expect(resNotFound.status()).toBe(404);
	});
});
