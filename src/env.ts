import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	DATABASE_URL: {
		description: 'Postgres connection string',
		// optional at build time; the database module fails on first use instead
		schema: (value) => value || undefined
	},
	APP_URL: {
		description: 'Public origin, e.g. https://vintry.example.com. WebAuthn RP ID and expected origin.',
		schema: (value) => {
			const url = new URL(value || 'http://localhost:5173');
			return url.origin;
		}
	}
});
