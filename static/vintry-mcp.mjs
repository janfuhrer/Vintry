#!/usr/bin/env node
// Vintry for Claude Desktop and other apps that start MCP servers as local programs.
// It passes the app's messages on to your Vintry server and the answers back. Node 18 or later,
// nothing to install.
//
//   VINTRY_URL    your Vintry address, e.g. https://vintry.example.com
//   VINTRY_TOKEN  a personal access token from Vintry → Settings → Connect Claude
import { createInterface } from 'node:readline';

const base = process.env.VINTRY_URL?.replace(/\/+$/, '');
const token = process.env.VINTRY_TOKEN;
if (!base || !token) {
	console.error('Set VINTRY_URL and VINTRY_TOKEN.');
	process.exit(1);
}
const endpoint = `${base}/api/mcp`;

const send = (msg) => process.stdout.write(JSON.stringify(msg) + '\n');

async function forward(line) {
	let msg;
	try {
		msg = JSON.parse(line);
	} catch {
		return send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
	}
	try {
		const res = await fetch(endpoint, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				accept: 'application/json, text/event-stream',
				authorization: `Bearer ${token}`
			},
			body: JSON.stringify(msg)
		});
		if (res.status === 202) return;
		const text = await res.text();
		if (res.headers.get('content-type')?.includes('application/json')) {
			const answer = JSON.parse(text);
			if (answer.jsonrpc) return send(answer);
			// an HTTP error without a JSON-RPC answer, e.g. a wrong token; a notification gets none
			if (msg.id === undefined) return;
			return send({
				jsonrpc: '2.0',
				id: msg.id,
				error: { code: -32000, message: answer.error ?? res.statusText }
			});
		}
		if (msg.id !== undefined)
			send({ jsonrpc: '2.0', id: msg.id, error: { code: -32000, message: `Vintry answered ${res.status}` } });
	} catch (e) {
		if (msg.id !== undefined)
			send({
				jsonrpc: '2.0',
				id: msg.id,
				error: { code: -32000, message: `Vintry unreachable: ${e.message}` }
			});
	}
}

// one message after the other, so answers keep their order
let queue = Promise.resolve();
createInterface({ input: process.stdin }).on('line', (line) => {
	if (line.trim()) queue = queue.then(() => forward(line));
});
