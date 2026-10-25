import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { getKey, registerNewUser, type RegisteredUser } from './helpers';

test.describe.serial('Messagerie Privée et Discussions de Groupe', () => {
	let contextSender: BrowserContext;
	let contextReceiver: BrowserContext;
	let pageSender: Page;
	let pageReceiver: Page;

	let sender: RegisteredUser;
	let receiver: RegisteredUser;

	test.beforeAll(async ({ browser }) => {
		const keySender = getKey(6);
		const keyReceiver = getKey(7);

		contextSender = await browser.newContext();
		pageSender = await contextSender.newPage();
		sender = await registerNewUser(pageSender, keySender, {
			name: 'Claire Expéditrice'
		});

		contextReceiver = await browser.newContext();
		pageReceiver = await contextReceiver.newPage();
		receiver = await registerNewUser(pageReceiver, keyReceiver, {
			name: 'David Destinataire'
		});
	});

	test.afterAll(async () => {
		await contextSender.close();
		await contextReceiver.close();
	});

	test('1. Claire crée une discussion directe avec David', async () => {
		await pageSender.goto('/creer_discussion');
		await expect(pageSender.locator('h1.header-title')).toContainText('Nouvelle discussion');

		// Recherche de David
		const searchInput = pageSender.locator('.search-input-wrapper input');
		await searchInput.fill(receiver.username);

		// Sélection de David dans les résultats
		const userResult = pageSender.locator(`.user-row:has-text("${receiver.username}")`);
		await expect(userResult).toBeVisible();
		await userResult.click();

		// Arrivée dans la page du chat
		await pageSender.waitForURL(/.*\/chat\/.+/);
		await expect(pageSender.locator('.chat-header')).toContainText(receiver.name);
	});

	test('2. Claire envoie un message privé à David', async () => {
		const messageText = `Bonjour David ! Message de test ${Date.now()}`;

		const messageInput = pageSender.locator('form.message-form .rich-chat-input');
		await messageInput.fill(messageText);
		await pageSender.locator('form.message-form button[type="submit"]').click();

		// Le message envoyé s'affiche dans la vue de Claire
		const sentMessage = pageSender.locator(`.message.sent:has-text("${messageText}")`);
		await expect(sentMessage).toBeVisible();
	});

	test('3. David consulte ses discussions et répond au message', async () => {
		await pageReceiver.goto('/chat');

		// David voit la discussion avec Claire dans sa liste
		const conversationItem = pageReceiver.locator(`.contact-row:has-text("${sender.name}")`);
		await expect(conversationItem).toBeVisible();

		// Clic pour entrer dans le chat
		await conversationItem.locator('a.contact-link').click();
		await pageReceiver.waitForURL(/.*\/chat\/.+/);

		// David voit le message reçu
		await expect(pageReceiver.locator('.message.received')).toBeVisible();

		// David répond à Claire
		const replyText = `Salut Claire, bien reçu ! ${Date.now()}`;
		const replyInput = pageReceiver.locator('form.message-form .rich-chat-input');
		await replyInput.fill(replyText);
		await pageReceiver.locator('form.message-form button[type="submit"]').click();

		// Son message apparaît comme envoyé
		await expect(pageReceiver.locator(`.message.sent:has-text("${replyText}")`)).toBeVisible();
	});

	test("4. Création d'une discussion de groupe avec David", async () => {
		await pageSender.goto('/creer_discussion');

		// Passage en mode Groupe
		await pageSender.locator('.mode-tabs button:has-text("Nouveau Groupe")').click();
		await expect(pageSender.locator('.group-setup')).toBeVisible();

		// Remplissage du nom du groupe
		const groupName = `Groupe Projet ${Date.now()}`;
		await pageSender.fill('input.group-name-input', groupName);

		// Recherche et ajout de David au groupe
		await pageSender.locator('.search-input-wrapper input').fill(receiver.username);
		const userResult = pageSender.locator(`.user-row:has-text("${receiver.username}")`);
		await expect(userResult).toBeVisible();
		await userResult.click();

		// Vérification du chip utilisateur
		await expect(pageSender.locator('.selected-users .user-chip')).toBeVisible();

		// Création du groupe
		await pageSender.locator('button.create-group-btn').click();

		// Arrivée dans le chat de groupe
		await pageSender.waitForURL(/.*\/chat\/.+/);
		await expect(pageSender.locator('.chat-header')).toContainText(groupName);

		// Envoi d'un message dans le groupe
		const groupMsg = 'Bienvenue dans notre groupe !';
		await pageSender.fill('form.message-form .rich-chat-input', groupMsg);
		await pageSender.locator('form.message-form button[type="submit"]').click();

		await expect(pageSender.locator(`.message.sent:has-text("${groupMsg}")`)).toBeVisible();
	});

	test("5. Suppression d'une conversation (Action Menu)", async () => {
		await pageSender.goto('/chat');
		const firstChatRow = pageSender.locator('.contact-row').first();
		await expect(firstChatRow).toBeVisible();

		// Accepte le confirm()
		pageSender.once('dialog', (dialog) => dialog.accept());

		// Ouvrir le menu sur la conversation
		await firstChatRow.locator('button[aria-label="Plus d\'options"]').click();
		await pageSender.locator('.dropdown-menu button.menu-item:has-text("Supprimer")').click();
	});
});
