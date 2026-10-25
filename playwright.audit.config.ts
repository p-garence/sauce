import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const TEST_DATABASE_URL = (process.env.DATABASE_URL || '').replace('/social', '/social_test');

export default defineConfig({
	testDir: './tests/audit',
	timeout: 180 * 1000,
	workers: 1, // 1 seul worker pour que le port CDP 9222 ne soit pas en conflit

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

	projects: [
		{
			name: 'setup',
			testDir: './tests/e2e',
			testMatch: /admin\.setup\.ts/
		},
		{
			name: 'lighthouse',
			use: {
				...devices['Desktop Chrome'],
				launchOptions: {
					args: ['--remote-debugging-port=9222']
				}
			},
			dependencies: ['setup']
		}
	]
});
