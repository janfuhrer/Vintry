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
	},
	RECOVERY_USER: {
		description:
			'Name of a user who lost all passkeys. On start, a one-time link to add a device for them is written to the log. Remove it again afterwards.',
		schema: (value) => value?.trim() || undefined
	},
	ANTHROPIC_API_KEY: {
		description:
			'Claude API key. When set, users can choose to have label photos read by Claude instead of on their phone.',
		schema: (value) => value?.trim() || undefined
	},
	CLAUDE_MODEL: {
		description: 'Claude model for reading labels',
		schema: (value) => value?.trim() || 'claude-opus-5-5'
	},
	CLAUDE_MONTHLY_TOKENS: {
		description:
			'Tokens each user may spend on Claude per calendar month (UTC). A label scan takes about 5,000.',
		schema: (value) => {
			const n = Number(value || 250_000);
			if (!Number.isInteger(n) || n < 0) throw new Error('CLAUDE_MONTHLY_TOKENS must be a whole number');
			return n;
		}
	}
});
