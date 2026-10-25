import { defineConfig } from 'vitest/config';
import type { PluginOption } from 'vite';
import { playwright } from '@vitest/browser-playwright';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';

const plugins: PluginOption[] = [
	sveltekit({
		compilerOptions: {
			// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
			runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
		},

		// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
		// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
		// See https://svelte.dev/docs/kit/adapters for more information about adapters.
		adapter: adapter(),

		typescript: {
			config: (config) => {
				config.include.push('../drizzle.config.ts');
			}
		}
	})
];

if (process.env.ANALYZE === 'true') {
	const { visualizer } = await import('rollup-plugin-visualizer');
	plugins.push(
		visualizer({
			filename: 'reports/bundle-stats.html',
			open: false,
			gzipSize: true,
			brotliSize: true
		}) as unknown as PluginOption
	);
}

export default defineConfig({
	plugins,
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},

			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
