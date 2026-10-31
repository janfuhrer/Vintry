import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { ANTHROPIC_API_KEY, CLAUDE_MODEL, CLAUDE_MONTHLY_TOKENS } from '$app/env/private';
import { sql } from './db.ts';
import { LabelReading, SYSTEM_PROMPT } from './claude-label.ts';

export const claudeEnabled = Boolean(ANTHROPIC_API_KEY);
export const monthlyTokens = CLAUDE_MONTHLY_TOKENS;

// a label scan with two photos, before a user has history of their own
const TYPICAL_SCAN = 5_000;
// models that take fallbacks: "default", which re-runs a declined request on another model
const WITH_FALLBACK = ['claude-fable-5-1', 'claude-opus-5-5', 'claude-opus-5', 'claude-sonnet-5-5'];

let client: Anthropic | undefined;
function api() {
	// the key is passed on purpose: the SDK would otherwise pick up other credentials it finds
	return (client ??= new Anthropic({ apiKey: ANTHROPIC_API_KEY, timeout: 90_000, maxRetries: 1 }));
}

export type Reader = 'local' | 'claude';

/** Claude only once the user agreed, and only while the server has a key */
export async function readerOf(userId: string): Promise<Reader> {
	if (!claudeEnabled) return 'local';
	const [row] = await sql<{ label_reader: Reader; claude_consent_at: Date | null }[]>`
		select label_reader, claude_consent_at from users where id = ${userId}
	`;
	return row?.label_reader === 'claude' && row.claude_consent_at ? 'claude' : 'local';
}

export async function setReader(userId: string, reader: Reader) {
	await sql`
		update users set label_reader = ${reader},
			claude_consent_at = case when ${reader} = 'claude' then now() else null end
		where id = ${userId}
	`;
}

const thisMonth = () => sql`date_trunc('month', now() at time zone 'utc')::date`;

export interface Allowance {
	used: number;
	limit: number;
	/** Scans left at the user's own average cost so far */
	scansLeft: number;
}

export async function allowance(userId: string): Promise<Allowance> {
	const [row] = await sql<{ requests: number; tokens: number }[]>`
		select requests, (input_tokens + output_tokens)::int as tokens from claude_usage
		where user_id = ${userId} and month = ${thisMonth()}
	`;
	const used = row?.tokens ?? 0;
	const perScan = row?.requests ? Math.max(1_000, used / row.requests) : TYPICAL_SCAN;
	return { used, limit: monthlyTokens, scansLeft: Math.max(0, Math.floor((monthlyTokens - used) / perScan)) };
}

async function record(userId: string, usage: Anthropic.Beta.BetaUsage) {
	const input =
		usage.input_tokens + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0);
	await sql`
		insert into claude_usage (user_id, month, requests, input_tokens, output_tokens)
		values (${userId}, ${thisMonth()}, 1, ${input}, ${usage.output_tokens})
		on conflict (user_id, month) do update set
			requests = claude_usage.requests + 1,
			input_tokens = claude_usage.input_tokens + excluded.input_tokens,
			output_tokens = claude_usage.output_tokens + excluded.output_tokens
	`;
}

export class LabelError extends Error {
	constructor(readonly code: 'refused' | 'failed') {
		super(code);
	}
}

/**
 * Sends the label photos (JPEG; front first, then the back) to Claude and returns its
 * reading. What it cost is booked to the user even when the answer is unusable.
 */
export async function readLabelPhotos(userId: string, photos: Uint8Array[]): Promise<LabelReading> {
	const content: Anthropic.Beta.BetaContentBlockParam[] = [];
	photos.forEach((photo, i) => {
		content.push({ type: 'text', text: i === 0 ? 'Front label:' : 'Back label:' });
		content.push({
			type: 'image',
			source: { type: 'base64', media_type: 'image/jpeg', data: Buffer.from(photo).toString('base64') }
		});
	});
	content.push({
		type: 'text',
		text: photos.length > 1 ? 'Read both labels of this bottle.' : 'Read this label.'
	});

	const fallback = WITH_FALLBACK.includes(CLAUDE_MODEL);
	const response = await api().beta.messages.parse({
		model: CLAUDE_MODEL,
		max_tokens: 16_000,
		...(fallback ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
		output_config: { effort: 'medium', format: betaZodOutputFormat(LabelReading) },
		system: SYSTEM_PROMPT,
		messages: [{ role: 'user', content }]
	});
	await record(userId, response.usage);
	if (response.stop_reason === 'refusal') throw new LabelError('refused');
	if (!response.parsed_output) throw new LabelError('failed');
	return response.parsed_output;
}
