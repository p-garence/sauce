import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Charge les clés générées par le setup
const keysFilePath = path.join(process.cwd(), 'tests/e2e/test-keys.json');
const availableKeys = JSON.parse(fs.readFileSync(keysFilePath, 'utf-8'));

test.describe('Authentification et Inscription Utilisateur', () => {
	test('Un visiteur ne peut pas accéder à /admin-setup', async ({ page }) => {
		await page.goto('/admin-setup');
		// On vérifie qu'on est bien redirigé ailleurs (vers login ou accueil)
		await expect(page).not.toHaveURL(/.*\/admin-setup/);
	});

	test('Fuzzing : Inscription avec des données invalides', async ({ page }) => {
		// On prend la première clé pour tester
		const validKey = availableKeys[0];

		await page.goto('/login');
		await page.click('button:has-text("J\'ai une clé")');

		// Cas 1 : Fausse clé
		await page.fill('input[name="inviteKey"]', 'FAUSSE-CLE-123');
		await page.fill('input[name="username"]', `hacker_${Date.now()}`);
		await page.fill('input[name="email"]', `hacker_${Date.now()}@test.com`);
		await page.fill('input[name="password"]', 'password123');
		await page.click('button:has-text("Créer mon compte")');

		await expect(page.locator('.error-box')).toBeVisible();

		// Cas 2 : Nom d'utilisateur déjà pris (l'admin)
		await page.fill('input[name="inviteKey"]', validKey);
		await page.fill('input[name="username"]', 'admin'); // Nom de l'admin
		await page.click('button:has-text("Créer mon compte")');

		await expect(page.locator('.error-box')).toBeVisible();
	});

	test('Inscription complète, Onboarding et arrivée sur le flux', async ({ page }) => {
		// On prend la 2ème clé pour garantir qu'elle est vierge
		const myKey = availableKeys[1];

		// On utilise un timestamp pour garantir des infos uniques
		const uniqueSuffix = Date.now();
		const myUsername = `user_${uniqueSuffix}`;
		const myEmail = `user_${uniqueSuffix}@test.com`;

		// 1. Inscription
		await page.goto('/login');
		await page.click('button:has-text("J\'ai une clé")');

		await page.fill('input[name="inviteKey"]', myKey);
		await page.fill('input[name="username"]', myUsername);
		await page.fill('input[name="email"]', myEmail);
		await page.fill('input[name="password"]', 'MotDePasseSécurisé!');
		await page.click('button:has-text("Créer mon compte")');

		// 2. Onboarding (/setup)
		await page.waitForURL(/.*\/setup/);
		await expect(page.locator('h2')).toContainText('Personnalisez votre profil');

		// On remplit le profil (Étape 1)
		await page.fill('input#name', `John Doe ${uniqueSuffix}`);
		await page.fill('textarea#bio', 'Ceci est ma bio de test E2E.');
		await page.locator('button:has-text("Suivant")').click();

		// Étape 2 (Confidentialité) - On coche "Approuver les abonnés" pour tester
		await expect(page.locator('h2')).toContainText('Confidentialité');
		// En Svelte, cliquer sur le toggle (tu pourrais cibler le label ou l'input checkbox)
		// Adapté selon ton SettingsToggle.svelte :
		await page.locator('label:has-text("Approuver les abonnés")').click();
		await page.locator('button:has-text("Suivant")').click();

		// Étape 3 (Gérer vos flux)
		await expect(page.locator('h2')).toContainText('flux');
		await page.locator('button:has-text("Suivant")').click();

		// Étape 4 (Finalisation)
		await expect(page.locator('h2')).toContainText('Tout est prêt');
		await page.locator('button:has-text("Terminer")').click();

		// 3. Arrivée sur l'application
		await page.waitForURL(/.*\/flux/);

		// Vérification de la Bottom Nav pour confirmer qu'on est bien connecté
		await expect(page.locator('.bottom-nav')).toBeVisible();
	});
});
