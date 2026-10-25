import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { getKey, registerNewUser } from '../e2e/helpers';

const REPORTS_DIR = path.resolve(process.cwd(), 'reports/lighthouse');

async function runLighthouseAudit(url: string, reportName: string) {
	// Import dynamique de lighthouse
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const lighthouseModule: any = await import('lighthouse');
	const lighthouse = lighthouseModule.default || lighthouseModule;

	const result = await lighthouse(url, {
		port: 9222,
		output: 'html',
		logLevel: 'error',
		onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo']
	});

	if (result && result.report) {
		if (!fs.existsSync(REPORTS_DIR)) {
			fs.mkdirSync(REPORTS_DIR, { recursive: true });
		}
		const reportPath = path.join(REPORTS_DIR, `${reportName}.html`);
		fs.writeFileSync(reportPath, result.report as string);
		console.log(`\n======================================================`);
		console.log(`📊 Rapport Lighthouse [${reportName}] généré :`);
		console.log(`   Fichier : reports/lighthouse/${reportName}.html`);
		console.log(
			`   - Performance   : ${Math.round((result.lhr.categories.performance?.score || 0) * 100)} / 100`
		);
		console.log(
			`   - Accessibilité : ${Math.round((result.lhr.categories.accessibility?.score || 0) * 100)} / 100`
		);
		console.log(
			`   - Best Practices: ${Math.round((result.lhr.categories['best-practices']?.score || 0) * 100)} / 100`
		);
		console.log(
			`   - SEO           : ${Math.round((result.lhr.categories.seo?.score || 0) * 100)} / 100`
		);
		console.log(`======================================================\n`);
	}

	return result;
}

test.describe.serial('Audit de Performance & Qualité (Lighthouse)', () => {
	let page: Page;

	test.beforeAll(async ({ browser }) => {
		page = await browser.newPage();
	});

	test('1. Audit Lighthouse : Page Vitrine (Public)', async () => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		const result = await runLighthouseAudit('http://localhost:4173/', '1-vitrine');
		expect(result).toBeDefined();
	});

	test('2. Audit Lighthouse : Page Login (Public)', async () => {
		await page.goto('/login');
		await page.waitForLoadState('networkidle');
		const result = await runLighthouseAudit('http://localhost:4173/login', '2-login');
		expect(result).toBeDefined();
	});

	test('3. Connexion utilisateur pour les pages protégées', async () => {
		const userKey = getKey(4);
		await registerNewUser(page, userKey, {
			name: 'Audit Lighthouse'
		});
		await page.waitForURL(/\/flux/);
	});

	test("4. Audit Lighthouse : Fil d'actualité /flux (Authentifié)", async () => {
		await page.goto('/flux');
		await page.waitForLoadState('networkidle');
		const result = await runLighthouseAudit('http://localhost:4173/flux', '3-flux');
		expect(result).toBeDefined();
	});

	test('5. Audit Lighthouse : Page Explorer /explorer (Authentifié)', async () => {
		await page.goto('/explorer');
		await page.waitForLoadState('networkidle');
		const result = await runLighthouseAudit('http://localhost:4173/explorer', '4-explorer');
		expect(result).toBeDefined();
	});

	test('6. Audit Lighthouse : Paramètres /parametres (Authentifié)', async () => {
		await page.goto('/parametres');
		await page.waitForLoadState('networkidle');
		const result = await runLighthouseAudit('http://localhost:4173/parametres', '5-parametres');
		expect(result).toBeDefined();
	});
});
