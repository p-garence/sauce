import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const TEST_DATABASE_URL = (process.env.DATABASE_URL || '').replace('/social', '/social_test');

export default defineConfig({
	testDir: './tests/e2e',

	// On réactive le parallélisme complet !
	fullyParallel: true,
	// On utilise tous les cœurs de ton processeur (ou 1 en CI si c'est limité)
	workers: process.env.CI ? 1 : undefined,

	// On garde le nettoyage de la BDD au tout début
	globalSetup: './tests/e2e/global-setup.ts',

	use: {
		baseURL: 'http://localhost:4173',
		trace: 'on-first-retry'
	},

	webServer: {
		command: 'npm run build && npm run preview',
		port: 4173,
		timeout: 120 * 1000,
		reuseExistingServer: !process.env.CI,
		stdout: 'ignore',
		stderr: 'pipe',
		env: { DATABASE_URL: TEST_DATABASE_URL }
	},

	// LA MAGIE EST ICI : On sépare en deux projets
	projects: [
		{
			// 1. Le projet de Setup
			name: 'setup',
			testMatch: /.*\.setup\.ts/ // Ne lance que les fichiers finissant par .setup.ts
		},
		{
			// 2. Les tests normaux
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
			dependencies: ['setup'], // Attend OBLIGATOIREMENT que 'setup' soit fini
			// Ignore les fichiers de setup pour ne pas les relancer
			testIgnore: /.*\.setup\.ts/
		}
	]
});
