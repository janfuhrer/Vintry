// The cellar as an MCP server (Streamable HTTP, stateless, JSON responses): Claude and other
// apps can look wines up and add many at once, acting for the user whose token they hold.
import { APP_URL } from '$app/env/private';
import { COLORS, countryName, normalize, windowStatus } from '#lib/wine.ts';
import { parseWineForm, withSuggestions } from './wine-form.ts';
import { createWine, findDuplicate, listWines, restock } from './wines.ts';

export const PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26'];
const MAX_WINES = 200;

const INSTRUCTIONS = `Vintry is the user's private wine cellar. Use it to look up wines they have and to add wines, for example from photos of labels, a receipt or a wine list.

- Before adding, search for wines that may already be there. add_wines adds bottles to a wine already in the cellar (same name, producer and vintage) instead of a second entry.
- name is the wine as a buyer would name it, without producer and vintage. producer is the winery in normal capitalisation.
- Values you send are stored as given; drinking window and taste values you leave out are suggested from vintage, region, grapes and the label's words. Send them when you know them well, for example from the producer's notes.
- Fill in only what you can see or know well. Never invent a vintage, alcohol or bottle size; leave fields out instead. Grapes, region and country may come from what is well known about the appellation.
- country is an ISO 3166-1 alpha-2 code. color is one of ${COLORS.join(', ')}: sparkling, sweet and fortified wines take that style whatever their colour.
- Tell the user what was added, with the links from the result, and mention entries that were rejected.`;

const wineSchema = {
	type: 'object',
	properties: {
		name: { type: 'string', description: 'The wine, without producer and vintage' },
		producer: { type: 'string' },
		vintage: { type: 'integer' },
		color: { type: 'string', enum: [...COLORS] },
		country: { type: 'string', description: 'ISO 3166-1 alpha-2, e.g. "IT"' },
		region: { type: 'string', description: 'Region or appellation, e.g. "Chianti Classico"' },
		grapes: { type: 'array', items: { type: 'string' } },
		alcohol: { type: 'number', description: '% vol' },
		size_ml: { type: 'integer', description: 'Bottle size, default 750' },
		quantity: { type: 'integer', minimum: 0, description: 'Bottles, default 1' },
		location: { type: 'string', description: 'Where in the cellar' },
		price: { type: 'number', description: 'Price per bottle' },
		purchased_on: { type: 'string', description: 'YYYY-MM-DD' },
		purchased_at: { type: 'string', description: 'Shop or winery it was bought from' },
		gifted_by: { type: 'string' },
		drink_from: {
			type: 'integer',
			description: 'Year; suggested from vintage, region and grapes if left out'
		},
		drink_to: { type: 'integer' },
		body: { type: 'integer', minimum: 1, maximum: 5, description: '1 light … 5 full' },
		acidity: { type: 'integer', minimum: 1, maximum: 5 },
		tannin: { type: 'integer', minimum: 1, maximum: 5 },
		sweetness: { type: 'integer', minimum: 1, maximum: 5, description: '1 dry … 5 very sweet' },
		rating: { type: 'integer', minimum: 1, maximum: 5, description: "The user's own rating, if they gave one" },
		notes: { type: 'string' },
		wishlist: { type: 'boolean', description: 'Wanted, not bought yet' }
	},
	required: ['name'],
	additionalProperties: false
};

const TOOLS = [
	{
		name: 'search_wines',
		title: 'Search the cellar',
		description:
			'Finds wines in the cellar by name, producer, region, country, grape, location or note. Without a query, lists the cellar.',
		inputSchema: {
			type: 'object',
			properties: {
				query: { type: 'string' },
				include_finished: { type: 'boolean', description: 'Also wines with no bottles left' },
				include_wishlist: { type: 'boolean', description: 'Also wines wanted but not bought' },
				limit: { type: 'integer', minimum: 1, maximum: 200, description: 'Default 50' }
			},
			additionalProperties: false
		},
		annotations: { readOnlyHint: true }
	},
	{
		name: 'add_wines',
		title: 'Add wines',
		description: `Adds up to ${MAX_WINES} wines in one go. A wine already in the cellar gets the bottles added (if_exists "add_bottles", the default), is left alone ("skip"), or gets a second entry ("new_entry"). Every wine is checked like the app's own form; invalid ones are reported and not stored.`,
		inputSchema: {
			type: 'object',
			properties: {
				wines: { type: 'array', items: wineSchema, minItems: 1, maxItems: MAX_WINES },
				if_exists: { type: 'string', enum: ['add_bottles', 'skip', 'new_entry'] }
			},
			required: ['wines'],
			additionalProperties: false
		},
		annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false }
	}
];

type Json = Record<string, unknown>;

class ToolError extends Error {}

const link = (id: string) => `${APP_URL}/wine/${id}`;

/** A wine as the tool got it → the form fields the app validates */
function toForm(w: Json): FormData {
	const fd = new FormData();
	for (const [k, v] of Object.entries(w)) {
		if (v === null || v === undefined) continue;
		if (k === 'wishlist') {
			if (v === true) fd.set('wishlist', 'on');
		} else if (Array.isArray(v)) {
			for (const x of v) if (typeof x === 'string') fd.append(k, x);
		} else if (typeof v === 'string' || typeof v === 'number') fd.set(k, String(v));
	}
	if (!fd.has('quantity')) fd.set('quantity', '1');
	if (!fd.has('size_ml')) fd.set('size_ml', '750');
	return fd;
}

async function addWines(userId: string, args: Json) {
	const wines = args.wines;
	if (!Array.isArray(wines) || !wines.length) throw new ToolError('wines must be a non-empty list');
	if (wines.length > MAX_WINES) throw new ToolError(`at most ${MAX_WINES} wines per call`);
	const ifExists = args.if_exists ?? 'add_bottles';
	if (!['add_bottles', 'skip', 'new_entry'].includes(ifExists as string))
		throw new ToolError('invalid if_exists');

	const results = [];
	const count = { added: 0, bottles_added_to_existing: 0, skipped: 0, rejected: 0 };
	// one after the other: a wine listed twice adds to the entry made for it a moment earlier
	for (const w of wines) {
		const label = typeof w?.name === 'string' ? w.name : '(no name)';
		if (!w || typeof w !== 'object' || Array.isArray(w)) {
			results.push({ name: label, status: 'rejected', reason: 'not an object' });
			count.rejected++;
			continue;
		}
		const { input, errors } = parseWineForm(toForm(w as Json));
		if (Object.keys(errors).length) {
			results.push({ name: label, status: 'rejected', reason: `invalid ${Object.keys(errors).join(', ')}` });
			count.rejected++;
			continue;
		}
		const wine = withSuggestions(input);
		const existing = ifExists === 'new_entry' ? null : await findDuplicate(userId, wine);
		if (existing && ifExists === 'skip') {
			results.push({
				name: wine.name,
				vintage: wine.vintage,
				status: 'skipped',
				reason: 'already there',
				url: link(existing.id)
			});
			count.skipped++;
		} else if (existing && wine.quantity > 0 && !wine.wishlist) {
			await restock(userId, existing.id, undefined, wine.quantity, wine);
			results.push({
				name: wine.name,
				vintage: wine.vintage,
				status: 'bottles_added',
				bottles: wine.quantity,
				url: link(existing.id)
			});
			count.bottles_added_to_existing++;
		} else if (existing) {
			// a wish, or a wine without bottles, adds nothing to an entry that exists
			results.push({
				name: wine.name,
				vintage: wine.vintage,
				status: 'skipped',
				reason: 'already there',
				url: link(existing.id)
			});
			count.skipped++;
		} else {
			const id = await createWine(userId, wine, null);
			results.push({
				name: wine.name,
				vintage: wine.vintage,
				status: 'added',
				bottles: wine.quantity,
				url: link(id)
			});
			count.added++;
		}
	}
	return { ...count, results };
}

async function searchWines(userId: string, args: Json) {
	const q = typeof args.query === 'string' ? normalize(args.query) : '';
	const limit = Math.min(200, Math.max(1, Number.isInteger(args.limit) ? (args.limit as number) : 50));
	const year = new Date().getFullYear();
	const all = await listWines(userId);
	const found = all.filter((w) => {
		if (w.wishlist && !args.include_wishlist) return false;
		if (!w.wishlist && w.quantity === 0 && !args.include_finished) return false;
		if (!q) return true;
		const text = [
			w.name,
			w.producer,
			w.region,
			w.country && countryName(w.country, 'en'),
			w.location,
			w.notes,
			...w.grapes
		]
			.filter(Boolean)
			.join(' ');
		return q.split(' ').every((word) => normalize(text).includes(word));
	});
	return {
		total: found.length,
		wines: found.slice(0, limit).map((w) => ({
			name: w.name,
			producer: w.producer,
			vintage: w.vintage,
			color: w.color,
			region: w.region,
			country: w.country,
			grapes: w.grapes,
			bottles: w.quantity,
			location: w.location,
			drink_from: w.drink_from,
			drink_to: w.drink_to,
			status: w.wishlist ? 'wishlist' : windowStatus(w.drink_from, w.drink_to, year),
			rating: w.rating,
			url: link(w.id)
		}))
	};
}

const rpcError = (id: unknown, code: number, message: string) => ({
	jsonrpc: '2.0',
	id: id ?? null,
	error: { code, message }
});

/** One JSON-RPC message → its answer, or null for a notification */
export async function handleMessage(userId: string, msg: unknown): Promise<Json | null> {
	if (!msg || typeof msg !== 'object' || (msg as Json).jsonrpc !== '2.0')
		return rpcError(null, -32600, 'Invalid Request');
	const { id, method, params = {} } = msg as { id?: unknown; method?: unknown; params?: Json };
	// a notification (no id) gets no answer; the only ones we expect are lifecycle notices
	if (id === undefined) return null;
	if (typeof method !== 'string') return rpcError(id, -32600, 'Invalid Request');
	const result = (r: unknown) => ({ jsonrpc: '2.0', id, result: r });

	switch (method) {
		case 'initialize': {
			const asked = typeof params.protocolVersion === 'string' ? params.protocolVersion : '';
			return result({
				protocolVersion: PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0],
				capabilities: { tools: { listChanged: false } },
				serverInfo: { name: 'vintry', title: 'Vintry', version: '1.0.0' },
				instructions: INSTRUCTIONS
			});
		}
		case 'ping':
			return result({});
		case 'tools/list':
			return result({ tools: TOOLS });
		case 'tools/call': {
			const args = (params.arguments ?? {}) as Json;
			const run =
				params.name === 'add_wines' ? addWines : params.name === 'search_wines' ? searchWines : null;
			if (!run) return rpcError(id, -32602, `Unknown tool: ${String(params.name)}`);
			try {
				const out = await run(userId, args);
				return result({
					content: [{ type: 'text', text: JSON.stringify(out, null, 1) }],
					structuredContent: out
				});
			} catch (e) {
				// errors in using the tool go back to the model, which can correct the call
				if (e instanceof ToolError)
					return result({ content: [{ type: 'text', text: e.message }], isError: true });
				throw e;
			}
		}
		default:
			return rpcError(id, -32601, `Method not found: ${method}`);
	}
}
