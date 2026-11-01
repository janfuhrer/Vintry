// End-to-end tests against the production build and a throwaway PostgreSQL database.
//
//   E2E_DATABASE_URL=postgres://user@localhost:5432/vintry_e2e npm run build && npm run test:e2e
//
// The database is wiped first, so it must be local and used for nothing else.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { run } from 'node:test';
import { spec } from 'node:test/reporters';
import postgres from 'postgres';

const url = process.env.E2E_DATABASE_URL;
if (!url) {
	console.error('Set E2E_DATABASE_URL to an empty local PostgreSQL database.');
	process.exit(2);
}
const host = new URL(url).hostname;
if (!['localhost', '127.0.0.1', '::1', 'postgres'].includes(host)) {
	console.error(`Refusing to wipe a database on "${host}". Use a local test database.`);
	process.exit(2);
}

const sql = postgres(url, { onnotice: () => {} });
await sql`drop schema if exists public cascade`;
await sql`create schema public`;
await sql.end();

// A stand-in for the Claude API and Open Food Facts: answers like the real ones, keeps what it was sent
const claudeCalls = [];
const offCalls = [];
const PRODUCTS = {
	3179071003917: {
		product_name: 'Côtes du Rhône Cuvée 2015',
		brands: 'Cellier des Dauphins',
		categories_tags: ['en:wines', 'en:wines-from-france', 'en:red-wines', 'fr:cotes-du-rhone'],
		quantity: '750 ml'
	},
	4006381333931: { product_name: 'Apple juice', categories_tags: ['en:beverages', 'en:juices'] }
};
const fakeClaude = createServer(async (req, res) => {
	if (req.method === 'GET' && req.url === '/calls') {
		res.setHeader('content-type', 'application/json');
		return res.end(JSON.stringify(claudeCalls));
	}
	// …and for Open Food Facts
	if (req.method === 'GET' && req.url === '/off-calls') {
		res.setHeader('content-type', 'application/json');
		return res.end(JSON.stringify(offCalls));
	}
	const off = req.url.match(/^\/api\/v2\/product\/(\d+)\.json/);
	if (off) {
		offCalls.push({ code: off[1], agent: req.headers['user-agent'] });
		const product = PRODUCTS[off[1]];
		res.statusCode = product ? 200 : 404;
		res.setHeader('content-type', 'application/json');
		return res.end(
			JSON.stringify(product ? { status: 1, product } : { status: 0, status_verbose: 'product not found' })
		);
	}
	let raw = '';
	for await (const chunk of req) raw += chunk;
	const body = JSON.parse(raw);
	claudeCalls.push({
		path: req.url,
		key: req.headers.authorization,
		beta: req.headers['anthropic-beta'],
		body
	});
	const images = body.messages[0].content.filter((c) => c.type === 'image');
	const marker = Buffer.from(images[0].source.data, 'base64').toString('latin1');
	if (marker.includes('SLOW')) await new Promise((resolve) => setTimeout(resolve, 300));
	const reading = marker.includes('NOTLABEL')
		? { ...EMPTY, is_wine_label: false }
		: {
				...EMPTY,
				is_wine_label: true,
				name: 'Chianti Classico Riserva',
				producer: 'Tenuta Poggio ai Mandorli',
				vintage: 2017,
				color: 'red',
				country: 'it',
				region: 'chianti classico',
				grapes: ['sangiovese', 'Merlot', 'sangiovese'],
				// nonsense the server must drop rather than store
				alcohol: images.length > 1 ? 14 : 140,
				size_ml: images.length > 1 ? 750 : null,
				drink_from: 2021,
				drink_to: 2032,
				body: 4,
				acidity: 9
			};
	res.setHeader('content-type', 'application/json');
	res.end(
		JSON.stringify({
			id: 'msg_test',
			type: 'message',
			role: 'assistant',
			model: body.model,
			// a refusal comes as text, not JSON; an answer cut off at max_tokens is broken JSON
			content: [
				{
					type: 'text',
					text: marker.includes('REFUSE')
						? 'I can’t help with that.'
						: JSON.stringify(reading).slice(0, marker.includes('CUTOFF') ? 40 : undefined)
				}
			],
			stop_reason: marker.includes('REFUSE')
				? 'refusal'
				: marker.includes('CUTOFF')
					? 'max_tokens'
					: 'end_turn',
			stop_sequence: null,
			usage: { input_tokens: 3000, output_tokens: 400 }
		})
	);
});
const EMPTY = Object.fromEntries(
	['name', 'producer', 'vintage', 'color', 'country', 'region', 'alcohol', 'size_ml']
		.concat(['drink_from', 'drink_to', 'body', 'acidity', 'tannin', 'sweetness'])
		.map((k) => [k, null])
);
EMPTY.grapes = [];
await new Promise((resolve) => fakeClaude.listen(0, '127.0.0.1', resolve));
const claudeBase = `http://127.0.0.1:${fakeClaude.address().port}`;

const port = 3100 + Math.floor(Math.random() * 500);
const base = `http://localhost:${port}`;
const server = spawn('node', ['build'], {
	env: {
		...process.env,
		DATABASE_URL: url,
		APP_URL: base,
		PORT: String(port),
		PROTOCOL_HEADER: 'x-forwarded-proto',
		ANTHROPIC_API_KEY: 'test-key',
		ANTHROPIC_BASE_URL: claudeBase,
		// 3,400 tokens a scan: six scans, then the allowance is spent
		CLAUDE_MONTHLY_TOKENS: '21000',
		OPEN_FOOD_FACTS_URL: claudeBase
	},
	stdio: ['ignore', 'pipe', 'pipe']
});

let log = '';
const ready = new Promise((resolve, reject) => {
	const timer = setTimeout(() => reject(new Error(`server did not start:\n${log}`)), 20_000);
	const onData = (d) => {
		log += d;
		const invite = log.match(/invite\/([A-Za-z0-9_-]+)/);
		if (invite && log.includes('Listening')) {
			clearTimeout(timer);
			resolve(invite[1]);
		}
	};
	server.stdout.on('data', onData);
	server.stderr.on('data', onData);
	server.on('exit', (code) => reject(new Error(`server exited (${code}):\n${log}`)));
});

let failed = false;
try {
	const invite = await ready;
	process.env.E2E_BASE = base;
	process.env.E2E_INVITE = invite;
	process.env.E2E_CLAUDE = claudeBase;
	const stream = run({ files: [new URL('./flows.test.mjs', import.meta.url).pathname], concurrency: 1 });
	stream.on('test:fail', () => (failed = true));
	// process.stdout never finishes, so drain the reporter instead of piping into it
	for await (const chunk of stream.compose(spec)) process.stdout.write(chunk);
} catch (e) {
	console.error(e.message);
	failed = true;
} finally {
	fakeClaude.close();
	server.kill();
	// a server that ignores SIGTERM would linger after the run; the suite checks it doesn't
	const exited = await new Promise((resolve) => {
		const timer = setTimeout(() => resolve(false), 5000);
		server.once('exit', () => {
			clearTimeout(timer);
			resolve(true);
		});
	});
	if (!exited) {
		server.kill('SIGKILL');
		console.error('✖ the server did not exit within 5 s of SIGTERM');
		failed = true;
	}
}
process.exit(failed ? 1 : 0);
