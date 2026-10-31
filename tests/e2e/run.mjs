// End-to-end tests against the production build and a throwaway PostgreSQL database.
//
//   E2E_DATABASE_URL=postgres://user@localhost:5432/vintry_e2e npm run build && npm run test:e2e
//
// The database is wiped first, so it must be local and used for nothing else.
import { spawn } from 'node:child_process';
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

const port = 3100 + Math.floor(Math.random() * 500);
const base = `http://localhost:${port}`;
const server = spawn('node', ['build'], {
	env: {
		...process.env,
		DATABASE_URL: url,
		APP_URL: base,
		PORT: String(port),
		PROTOCOL_HEADER: 'x-forwarded-proto'
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
	const stream = run({ files: [new URL('./flows.test.mjs', import.meta.url).pathname], concurrency: 1 });
	stream.on('test:fail', () => (failed = true));
	// process.stdout never finishes, so drain the reporter instead of piping into it
	for await (const chunk of stream.compose(spec)) process.stdout.write(chunk);
} catch (e) {
	console.error(e.message);
	failed = true;
} finally {
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
