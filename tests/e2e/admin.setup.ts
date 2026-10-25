import { test as setup, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

setup("Test de l'Admin-setup, Onboarding et génération des clés", async ({ page }) => {
	// ==============================================================
	// ÉTAPE 1 : VÉRIFICATION DE LA REDIRECTION INITIALE
	// ==============================================================
	await page.goto('/');

	// On doit être redirigé vers admin-setup si la DB est vide
	await expect(page).toHaveURL(/.*\/admin-setup/);
	await expect(page.locator('h1')).toContainText('Initialisation du serveur');

	// ==============================================================
	// ÉTAPE 2 : FUZZING DU FORMULAIRE ADMIN
	// ==============================================================
	await page.fill('input[name="username"]', 'admin');
	await page.fill('input[name="identifier"]', 'admin@admin.com');

	// Test : mot de passe trop court (< 8 caractères)
	await page.fill('input[name="secretKey"]', '12345');
	await page.click('button[type="submit"]');

	// On vérifie qu'on est bloqué sur la page (le navigateur bloque la soumission via minlength="8")
	await expect(page).toHaveURL(/.*\/admin-setup/);

	// ==============================================================
	// ÉTAPE 3 : CRÉATION VALIDE ET REDIRECTION VERS LE SETUP
	// ==============================================================
	await page.fill('input[name="secretKey"]', 'password123'); // Bon mot de passe
	await page.click('button[type="submit"]');

	// On attend la redirection vers le flux ou le setup de complétion de profil
	await page.waitForURL(/.*(\/setup|\/flux)/);

	if (page.url().includes('/setup')) {
		// ==============================================================
		// ÉTAPE 4 : FUZZING DE L'ONBOARDING (Setup Profil)
		// ==============================================================
		await expect(page.locator('h2')).toContainText('Personnalisez votre profil');

		const nameInput = page.locator('input#name');
		const nextBtn = page.locator('button:has-text("Suivant")');

		// Test : nom trop court
		await nameInput.fill('ab');
		// Ton UI désactive le bouton "Suivant" si le nom fait moins de 3 caractères
		await expect(nextBtn).toBeDisabled();

		// Remplissage valide
		await nameInput.fill('Admin Boss');
		await expect(nextBtn).toBeEnabled();
		await nextBtn.click();

		// Étape Confidentialité
		await expect(page.locator('h2')).toContainText('Confidentialité');
		await page.locator('button:has-text("Suivant")').click();

		// Étape Finalisation
		await expect(page.locator('h2')).toContainText('Tout est prêt');
		await page.locator('button:has-text("Terminer")').click();

		// Redirection finale vers le flux
		await page.waitForURL(/.*\/flux/);
	}

	// On s'assure qu'on a bien atterri sur le flux
	await expect(page).toHaveURL(/.*\/flux/);

	// ==============================================================
	// ÉTAPE 5 : GÉNÉRATION DES CLÉS POUR LES TESTS PARALLÈLES
	// ==============================================================

	// On navigue vers les paramètres via la barre de navigation
	await page.locator('.bottom-nav a.nav-item:has-text("Réglages")').click();
	await expect(page).toHaveURL(/.*\/parametres/);

	// On clique sur l'onglet Parrainage
	await page.locator('button.tab-btn:has-text("Parrainage")').click();
	await expect(page.locator('h2:has-text("Mes Clés de Parrainage")')).toBeVisible();

	const generateBtn = page.locator('button:has-text("+ Générer une clé")');

	// On génère 10 clés
	for (let i = 0; i < 10; i++) {
		await generateBtn.click();
		// On attend que le compteur se mette à jour pour éviter de cliquer trop vite
		await expect(page.locator('.keys-stats')).toContainText(`${i + 1} / 10 clés générées`);
	}

	// Le bouton doit maintenant être désactivé
	await expect(generateBtn).toBeDisabled();

	// On récupère les 10 clés et on les sauvegarde
	const keyElements = await page.locator('.key-code').allTextContents();

	// Insertion de clés additionnelles en BDD pour alimenter les suites étendues
	try {
		const postgresModule = await import('postgres');
		const postgres = postgresModule.default;
		const testDbUrl = (process.env.DATABASE_URL || '').replace('/social', '/social_test');
		const sql = postgres(testDbUrl);
		const [adminUser] = await sql`SELECT id FROM "user" WHERE role = 'admin' LIMIT 1`;
		if (adminUser) {
			for (let j = 1; j <= 10; j++) {
				const extraKey = `INV-EXT${j}-${Date.now().toString(36).toUpperCase()}`;
				await sql`INSERT INTO invite_keys ("key", created_by) VALUES (${extraKey}, ${adminUser.id})`;
				keyElements.push(extraKey);
			}
		}
		await sql.end();
	} catch (err) {
		console.warn('Génération clés additionnelles :', err);
	}

	const keysFilePath = path.join(process.cwd(), 'tests/e2e/test-keys.json');
	fs.writeFileSync(keysFilePath, JSON.stringify(keyElements));

	console.log(
		`✅ Setup terminé : Admin créé, testé avec succès, et ${keyElements.length} clés sauvegardées.`
	);
});
