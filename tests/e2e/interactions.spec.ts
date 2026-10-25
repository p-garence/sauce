import { test, expect, type Page } from '@playwright/test';
import { getKey, registerNewUser } from './helpers';

test.describe.serial('Interactions sur les Posts (Likes, Commentaires, Actions)', () => {
	let page: Page;
	let userKey: string;
	let createdPostId: string | null = null;
	const postContent = `Post interactif E2E - ${Date.now()}`;

	test.beforeAll(async ({ browser }) => {
		page = await browser.newPage();
		userKey = getKey(3);
		await registerNewUser(page, userKey, {
			name: 'Utilisateur Interactif'
		});
	});

	test('1. Création du post de test', async () => {
		await page.goto('/publier');
		await page.fill('.text-slide-input', postContent);
		await page.locator('button:has-text("Publier")').click();

		await page.goto('/flux');
		const postElement = page.locator(`article.post:has-text("${postContent}")`).first();
		await expect(postElement).toBeVisible();

		const domId = await postElement.getAttribute('id');
		expect(domId).not.toBeNull();
		createdPostId = domId?.replace('post-', '') || null;
	});

	test('2. Liker et unliker un post avec mise à jour optimiste', async () => {
		test.skip(!createdPostId, 'Post non créé');

		const postLocator = page.locator(`#post-${createdPostId}`);
		const likeGroup = postLocator.locator('.like-button-group');
		const likeBtn = likeGroup.locator('button.action-btn');

		// Vérification initiale : non liké (0 likes)
		await expect(likeBtn).not.toHaveClass(/active/);
		await expect(likeGroup).toContainText('0');

		// 1. Clic pour Liker
		await likeBtn.click();
		await expect(likeBtn).toHaveClass(/active/);
		await expect(likeGroup).toContainText('1');

		// 2. Clic pour Unliker
		await likeBtn.click();
		await expect(likeBtn).not.toHaveClass(/active/);
		await expect(likeGroup).toContainText('0');
	});

	test('3. Commenter, répondre et liker un commentaire', async () => {
		test.skip(!createdPostId, 'Post non créé');

		const postLocator = page.locator(`#post-${createdPostId}`);

		// Ouvrir la section de commentaires (bouton accessible Commentaires)
		const commentToggleBtn = postLocator.locator('button[aria-label^="Commentaires"]');
		await commentToggleBtn.click();

		const commentSection = postLocator.locator('.comment-section');
		await expect(commentSection).toBeVisible();

		// Ajouter un commentaire principal
		const commentText = `Superbe publication ! ${Date.now()}`;
		const inputComment = commentSection.locator(`#comment-input-${createdPostId}`);
		await inputComment.fill(commentText);
		await commentSection.locator('button[type="submit"]:has-text("Publier")').click();

		// Vérifier l'apparition du commentaire
		const commentRow = commentSection.locator(`.comment-row:has-text("${commentText}")`);
		await expect(commentRow).toBeVisible();

		// Liker le commentaire
		const commentLikeBtn = commentRow.locator('.comment-actions button.like-btn').first();
		await commentLikeBtn.click();
		await expect(commentLikeBtn).toHaveClass(/liked/);
		await expect(commentLikeBtn.locator('.count')).toContainText('1');

		// Répondre au commentaire
		await commentRow.locator('button.action-text-btn:has-text("Répondre")').first().click();
		await expect(commentSection.locator('.reply-indicator')).toBeVisible();

		const replyText = 'Merci pour ce retour !';
		await inputComment.fill(replyText);
		await commentSection.locator('button[type="submit"]:has-text("Publier")').click();

		// Vérifier l'indicateur de réponses
		await expect(commentRow.locator('.toggle-replies-btn')).toBeVisible();
	});

	test('4. Masquer et restaurer un post (Action Menu)', async () => {
		test.skip(!createdPostId, 'Post non créé');

		const postLocator = page.locator(`#post-${createdPostId}`);

		// Ouvrir le menu d'actions (•••) de l'en-tête du post
		await postLocator.locator('.post-header button[aria-label="Plus d\'options"]').click();
		await page.locator('.dropdown-menu button.menu-item:has-text("Masquer")').click();

		// Vérifier le message de post masqué
		await expect(page.locator('.hidden-post')).toBeVisible();
		await expect(page.locator('.hidden-post p')).toContainText('Post masqué');

		// Annuler le masquage
		await page.locator('.hidden-post button.btn-undo').click();
		await expect(postLocator).toBeVisible();
	});

	test('5. Modifier le contenu du post', async () => {
		test.skip(!createdPostId, 'Post non créé');

		const postLocator = page.locator(`#post-${createdPostId}`);

		// Ouvrir le menu d'actions et cliquer sur Modifier
		await postLocator.locator('.post-header button[aria-label="Plus d\'options"]').click();
		await page.locator('.dropdown-menu button.menu-item:has-text("Modifier")').click();

		// Page de modification
		await page.waitForURL(new RegExp(`/modifier_post/${createdPostId}`));
		await expect(page.locator('h1.header-title')).toContainText('Modifier le post');

		const updatedText = `Texte mis à jour ${Date.now()}`;
		await page.fill('.text-slide-input', updatedText);
		await page.click('button.header-save-btn:has-text("Enregistrer")');

		// Retour automatique après enregistrement
		await page.waitForURL(new RegExp(`/post/${createdPostId}|/flux`));
		await expect(page.locator('body')).toContainText(updatedText);
	});

	test('6. Supprimer le post', async () => {
		test.skip(!createdPostId, 'Post non créé');

		// On navigue sur la page dédiée du post
		await page.goto(`/post/${createdPostId}`);

		// On accepte la boîte de dialogue native confirm()
		page.once('dialog', (dialog) => dialog.accept());

		// Ouvrir le menu et cliquer sur Supprimer
		await page.locator('.post-header button[aria-label="Plus d\'options"]').click();
		await page.locator('.dropdown-menu button.menu-item:has-text("Supprimer")').click();

		// Vérification du message de suppression
		await expect(page.locator('.deleted-message')).toBeVisible();
		await expect(page.locator('.deleted-message p')).toContainText('Post supprimé');
	});
});
