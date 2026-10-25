import { expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const keysFilePath = path.join(process.cwd(), 'tests/e2e/test-keys.json');

export function getAvailableKeys(): string[] {
	try {
		return JSON.parse(fs.readFileSync(keysFilePath, 'utf-8'));
	} catch (e) {
		console.error('Impossible de lire test-keys.json :', e);
		return [];
	}
}

export function getKey(index: number): string {
	const keys = getAvailableKeys();
	if (!keys[index]) {
		throw new Error(`Clé d'invitation à l'index ${index} non trouvée`);
	}
	return keys[index];
}

export interface RegisteredUser {
	username: string;
	email: string;
	password: string;
	name: string;
}

export async function registerNewUser(
	page: Page,
	key: string,
	options: {
		username?: string;
		name?: string;
		bio?: string;
		requireFollowRequest?: boolean;
	} = {}
): Promise<RegisteredUser> {
	const suffix = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
	const username = options.username || `usr_${suffix}`;
	const email = `${username}@test.com`;
	const password = 'Password123!';
	const name = options.name || `User ${suffix}`;

	await page.goto('/login');
	await page.click('button:has-text("J\'ai une clé")');

	await page.fill('input#inviteKey', key);
	await page.fill('input#username', username);
	await page.fill('input#email', email);
	await page.fill('input#password', password);
	await page.click('button:has-text("Créer mon compte")');

	// Étape 1 : Onboarding profil
	await page.waitForURL(/.*\/setup/);
	await page.fill('input#name', name);
	if (options.bio) {
		await page.fill('textarea#bio', options.bio);
	}
	await page.locator('button:has-text("Suivant")').click();

	// Étape 2 : Confidentialité
	await page.waitForSelector('h2:has-text("Confidentialité")');
	if (options.requireFollowRequest) {
		await page.locator('label:has-text("Approuver les abonnés")').click();
	}
	await page.locator('button:has-text("Suivant")').click();

	// Étape 3 : Finalisation
	await page.waitForSelector('h2:has-text("Tout est prêt")');
	await page.locator('button:has-text("Terminer")').click();

	await page.waitForURL(/.*\/flux/);
	await expect(page.locator('.bottom-nav')).toBeVisible();

	return { username, email, password, name };
}

export async function loginUser(
	page: Page,
	email: string,
	password = 'Password123!'
): Promise<void> {
	await page.goto('/login');
	await page.fill('input#identifier', email);
	await page.fill('input#secretKey', password);
	await page.click('button[type="submit"]:has-text("Se connecter")');
	await page.waitForURL(/.*(\/flux|\/)/);
}
