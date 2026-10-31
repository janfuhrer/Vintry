// A cookie-keeping HTTP client and a software passkey authenticator for end-to-end tests.
import { createHash, generateKeyPairSync, randomBytes, sign } from 'node:crypto';

const b64u = (b) => Buffer.from(b).toString('base64url');
const sha = (b) => createHash('sha256').update(b).digest();

/** Minimal CBOR encoder: unsigned/negative ints, byte and text strings, maps */
function cbor(v) {
	const head = (major, n) =>
		n < 24
			? Buffer.from([(major << 5) | n])
			: n < 256
				? Buffer.from([(major << 5) | 24, n])
				: Buffer.from([(major << 5) | 25, n >> 8, n & 255]);
	if (typeof v === 'number') return v >= 0 ? head(0, v) : head(1, -1 - v);
	if (Buffer.isBuffer(v)) return Buffer.concat([head(2, v.length), v]);
	if (typeof v === 'string') {
		const b = Buffer.from(v);
		return Buffer.concat([head(3, b.length), b]);
	}
	if (v instanceof Map)
		return Buffer.concat([head(5, v.size), ...[...v].flatMap(([k, x]) => [cbor(k), cbor(x)])]);
	throw new Error(`cbor: unsupported ${typeof v}`);
}

export class Client {
	jar = new Map();

	constructor(base) {
		this.base = base;
	}

	/** Same-origin request; `form` posts as a native form would, `json` as fetch would */
	async req(path, { method = 'GET', json, form, body, headers = {}, page = false } = {}) {
		const h = {
			'x-forwarded-proto': 'http',
			origin: this.base,
			cookie: [...this.jar].map(([k, v]) => `${k}=${v}`).join('; '),
			...(page ? { accept: 'text/html' } : {}),
			...headers
		};
		if (json !== undefined) {
			h['content-type'] = 'application/json';
			body = JSON.stringify(json);
		}
		if (form) {
			body = form instanceof FormData ? form : new URLSearchParams(form);
		}
		const res = await fetch(this.base + path, { method, body, headers: h, redirect: 'manual' });
		for (const c of res.headers.getSetCookie()) {
			const [kv] = c.split(';');
			const i = kv.indexOf('=');
			const [k, v] = [kv.slice(0, i), kv.slice(i + 1)];
			if (v) this.jar.set(k, v);
			else this.jar.delete(k);
		}
		return res;
	}

	/** Calls a form action the way `use:enhance` does and returns the ActionResult */
	async action(path, form) {
		const res = await this.req(path, {
			method: 'POST',
			form,
			headers: { 'x-sveltekit-action': 'true', accept: 'application/json' }
		});
		return res.json();
	}
}

export class Authenticator {
	counter = 0;
	userHandle = null;

	constructor(rpId) {
		this.rpId = rpId;
		const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
		const jwk = publicKey.export({ format: 'jwk' });
		this.privateKey = privateKey;
		this.id = randomBytes(16);
		this.cose = cbor(
			new Map([
				[1, 2],
				[3, -7],
				[-1, 1],
				[-2, Buffer.from(jwk.x, 'base64url')],
				[-3, Buffer.from(jwk.y, 'base64url')]
			])
		);
	}

	async register(client, token, name) {
		const r = await client.req('/api/auth/register/options', { method: 'POST', json: { token, name } });
		const opts = await r.json();
		if (!r.ok) return { ok: false, status: r.status, body: opts };
		this.userHandle = opts.user.id;
		const clientData = Buffer.from(
			JSON.stringify({ type: 'webauthn.create', challenge: opts.challenge, origin: client.base })
		);
		const idLen = Buffer.alloc(2);
		idLen.writeUInt16BE(this.id.length);
		const authData = Buffer.concat([
			sha(this.rpId),
			Buffer.from([0x45]), // user present + verified + attested credential data
			Buffer.alloc(4),
			Buffer.alloc(16),
			idLen,
			this.id,
			this.cose
		]);
		const attestation = cbor(
			new Map([
				['fmt', 'none'],
				['attStmt', new Map()],
				['authData', authData]
			])
		);
		const v = await client.req('/api/auth/register/verify', {
			method: 'POST',
			json: {
				id: b64u(this.id),
				rawId: b64u(this.id),
				type: 'public-key',
				clientExtensionResults: {},
				response: {
					clientDataJSON: b64u(clientData),
					attestationObject: b64u(attestation),
					transports: ['internal']
				}
			}
		});
		return { ok: v.ok, status: v.status, body: await v.json() };
	}

	async login(client) {
		const opts = await (await client.req('/api/auth/login/options', { method: 'POST' })).json();
		const clientData = Buffer.from(
			JSON.stringify({ type: 'webauthn.get', challenge: opts.challenge, origin: client.base })
		);
		const ctr = Buffer.alloc(4);
		ctr.writeUInt32BE(++this.counter);
		const authData = Buffer.concat([sha(this.rpId), Buffer.from([0x05]), ctr]);
		const signature = sign('sha256', Buffer.concat([authData, sha(clientData)]), this.privateKey);
		const v = await client.req('/api/auth/login/verify', {
			method: 'POST',
			json: {
				id: b64u(this.id),
				rawId: b64u(this.id),
				type: 'public-key',
				clientExtensionResults: {},
				response: {
					clientDataJSON: b64u(clientData),
					authenticatorData: b64u(authData),
					signature: b64u(signature),
					userHandle: this.userHandle
				}
			}
		});
		return v.ok;
	}
}
