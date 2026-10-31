import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Unit tests cover plain TypeScript modules, so SvelteKit's Vite plugin is left out.
// The generated tsconfig extends `$app/tsconfig`, which Vite's transformer can't resolve,
// hence the minimal config next to this file.
export default defineConfig({
	tsconfig: fileURLToPath(new URL('./tsconfig.vitest.json', import.meta.url)),
	test: {
		include: ['src/**/*.test.ts'],
		environment: 'node'
	}
});
