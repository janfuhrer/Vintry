// Runs in order and shares state: each step builds on the previous one.
// Started by run.mjs, which provides E2E_BASE and E2E_INVITE.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { describe, test } from 'node:test';
import * as devalue from 'devalue';
import { Authenticator, Client } from './client.mjs';

const base = process.env.E2E_BASE;
const rpId = new URL(base).hostname;
const inviteFrom = (s) => s.match(/invite\/([A-Za-z0-9_-]+)/)[1];
const jpeg = () => new Blob([Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), randomBytes(200)])]);

const alice = new Client(base);
const aliceKey = new Authenticator(rpId);
const bob = new Client(base);
let wineUrl;
let wineId;

describe('auth', () => {
	test('admin signs up with the bootstrap invite', async () => {
		const r = await aliceKey.register(alice, process.env.E2E_INVITE, 'Alice');
		assert.equal(r.ok, true, JSON.stringify(r.body));
		assert.equal((await alice.req('/', { page: true })).status, 200);
	});

	test('the bootstrap invite works only once', async () => {
		const r = await new Authenticator(rpId).register(new Client(base), process.env.E2E_INVITE, 'Mallory');
		assert.equal(r.ok, false);
		assert.equal(r.body.error, 'invite');
	});

	test('passkey login on a new device session', async () => {
		const c = new Client(base);
		assert.equal(await aliceKey.login(c), true);
		assert.equal((await c.req('/history', { page: true })).status, 200);
	});

	test('a tampered signature is rejected', async () => {
		const evil = new Authenticator(rpId);
		evil.id = aliceKey.id; // claims Alice's credential, signs with another key
		evil.userHandle = aliceKey.userHandle;
		assert.equal(await evil.login(new Client(base)), false);
	});

	test('signed-out requests are redirected or refused', async () => {
		const anon = new Client(base);
		const page = await anon.req('/', { page: true });
		assert.equal(page.status, 303);
		assert.equal(page.headers.get('location'), '/login');
		assert.equal((await anon.req(`/photo/${'0'.repeat(8)}-0000-0000-0000-${'0'.repeat(12)}`)).status, 401);
	});

	test('security headers are set', async () => {
		const res = await new Client(base).req('/login'); // signed in, /login would redirect
		assert.match(res.headers.get('content-security-policy') ?? '', /default-src 'self'/);
		assert.equal(res.headers.get('x-frame-options'), 'DENY');
		assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
	});
});

describe('cellar', () => {
	test('add a wine with a photo', async () => {
		const fd = new FormData();
		const fields = {
			name: 'Cornalin Test',
			producer: 'Domaine X',
			vintage: '2019',
			color: 'red',
			country: 'CH',
			region: 'Valais',
			quantity: '3',
			size_ml: '750',
			drink_from: '2022',
			drink_to: '2030',
			body: '4',
			price: '32.50',
			purchased_on: '2024-05-01'
		};
		for (const [k, v] of Object.entries(fields)) fd.append(k, v);
		fd.append('grapes', 'cornalin');
		fd.append('grapes', 'Humagne rouge');
		fd.append('photo', jpeg(), 'p.jpg');
		fd.append('thumb', jpeg(), 't.jpg');
		const r = await alice.req('/add', { method: 'POST', form: fd, page: true });
		assert.equal(r.status, 303);
		wineUrl = r.headers.get('location');
		assert.match(wineUrl, /^\/wine\/[0-9a-f-]{36}$/);
		wineId = wineUrl.split('/').pop();
		const html = await (await alice.req(wineUrl, { page: true })).text();
		assert.ok(html.includes('Cornalin Test'));
		assert.ok(html.includes('Humagne Rouge'), 'grape names are canonicalised');
	});

	test('invalid input is reported, not stored', async () => {
		const r = await alice.action('/add', { name: '', vintage: 'abc' });
		assert.equal(r.type, 'failure');
	});

	test('drink one logs it and takes a bottle out', async () => {
		const r = await alice.action(`${wineUrl}?/drink`, {
			drunk_on: '2026-10-30',
			rating: '5',
			note: 'lovely'
		});
		assert.equal(r.type, 'success');
		assert.match(devalue.parse(r.data).drunk, /^[0-9a-f-]{36}$/, 'the page gets the id to offer an undo');
		const data = await (await alice.req(`${wineUrl}/__data.json`)).text();
		assert.ok(data.includes('lovely'));
		const html = await (await alice.req('/history', { page: true })).text();
		assert.ok(html.includes('Cornalin Test'));
	});

	test('undo puts the bottle and the earlier rating back', async () => {
		const wine = async () =>
			(await (await alice.req('/export/vintry.json')).json()).wines.find((w) => w.name === 'Cornalin Test');
		const before = await wine();
		const r = devalue.parse(
			(await alice.action(`${wineUrl}?/drink`, { drunk_on: '2026-10-31', rating: '2' })).data
		);
		assert.equal(r.ratingBefore, before.rating);
		assert.equal((await wine()).rating, 2, 'a drink rating rates the wine');
		await alice.action(`${wineUrl}?/undoDrink`, { id: r.drunk, rating_before: String(r.ratingBefore ?? '') });
		const after = await wine();
		assert.deepEqual([after.quantity, after.rating], [before.quantity, before.rating]);
	});

	test('"buy again" opens a pre-filled form without purchase details', async () => {
		const html = await (await alice.req(`/add?from=${wineId}`, { page: true })).text();
		assert.match(html, /name="name"[^>]*value="Cornalin Test"/);
		assert.match(html, /name="quantity"[^>]*value="1"/);
		assert.doesNotMatch(html, /value="32.5"/, 'price is not copied');
		assert.equal(
			(await bob.req(`/add?from=${wineId}`, { page: true })).status,
			303,
			'signed-out (Bob has no session yet)'
		);
	});

	test('earlier shops are suggested in the form', async () => {
		const fd = new FormData();
		for (const [k, v] of Object.entries({
			name: 'Shop test',
			color: 'white',
			quantity: '1',
			purchased_at: 'Weinhandlung Muster'
		}))
			fd.append(k, v);
		await alice.req('/add', { method: 'POST', form: fd, page: true });
		// the add page starts with the scan choice; the edit form renders the datalists directly
		const html = await (await alice.req(`${wineUrl}/edit`, { page: true })).text();
		assert.match(html, /<datalist id="shop-list">[\s\S]*Weinhandlung Muster/);
	});

	test('wishlist: a wanted wine stays out of the cellar until bought', async () => {
		const fd = new FormData();
		for (const [k, v] of Object.entries({ name: 'Dream Wine', color: 'red', quantity: '3', wishlist: 'on' }))
			fd.append(k, v);
		const r = await alice.req('/add', { method: 'POST', form: fd, page: true });
		const url = r.headers.get('location');
		const wish = (await (await alice.req('/export/vintry.json')).json()).wines.find(
			(w) => w.name === 'Dream Wine'
		);
		assert.equal(wish.wishlist, true);
		assert.equal(wish.quantity, 0, 'a wish has no bottles, whatever the form said');
		assert.match(await (await alice.req(url, { page: true })).text(), /\?\/bought/);
		assert.equal((await alice.action(`${url}?/bought`, {})).type, 'success');
		const owned = (await (await alice.req('/export/vintry.json')).json()).wines.find(
			(w) => w.name === 'Dream Wine'
		);
		assert.deepEqual([owned.wishlist, owned.quantity], [false, 1]);
	});

	test('restock after a scan: one more bottle, the label photo only if there was none', async () => {
		const add = async (fields) => {
			const fd = new FormData();
			for (const [k, v] of Object.entries(fields)) fd.append(k, v);
			return (await alice.req('/add', { method: 'POST', form: fd, page: true })).headers.get('location');
		};
		const find = async (name) =>
			(await (await alice.req('/export/vintry.json')).json()).wines.find((w) => w.name === name);
		const withPhoto = (fd = new FormData()) => {
			fd.append('photo', jpeg(), 'p.jpg');
			fd.append('thumb', jpeg(), 't.jpg');
			return fd;
		};

		const url = await add({ name: 'Restock Red', color: 'red', quantity: '2' });
		assert.equal((await alice.action(`${url}?/restock`, withPhoto())).type, 'success');
		let w = await find('Restock Red');
		assert.deepEqual([w.quantity, w.has_photo], [3, true]);
		const photo = await (await alice.req(`/photo/${w.id}`)).arrayBuffer();
		// a second scan adds a bottle but keeps the photo the wine already has
		await alice.action(`${url}?/restock`, withPhoto());
		w = await find('Restock Red');
		assert.equal(w.quantity, 4);
		assert.deepEqual(
			Buffer.from(await (await alice.req(`/photo/${w.id}`)).arrayBuffer()),
			Buffer.from(photo)
		);

		const wish = await add({ name: 'Restock Wish', color: 'white', wishlist: 'on' });
		await alice.action(`${wish}?/restock`, new FormData());
		w = await find('Restock Wish');
		assert.deepEqual([w.wishlist, w.quantity, w.has_photo], [false, 1, false]);

		// not Alice: nothing changes
		assert.notEqual((await bob.action(`${url}?/restock`, new FormData())).type, 'success');
		assert.equal((await find('Restock Red')).quantity, 4);
	});

	test('history stats per year count every drink of that year', async () => {
		const add = async (fields) => {
			const fd = new FormData();
			for (const [k, v] of Object.entries(fields)) for (const x of [v].flat()) fd.append(k, x);
			return (await alice.req('/add', { method: 'POST', form: fd, page: true })).headers.get('location');
		};
		const pinot = await add({
			name: 'Stats Pinot',
			color: 'red',
			country: 'CH',
			grapes: ['Pinot Noir', 'Gamay'],
			quantity: '5'
		});
		const merlot = await add({
			name: 'Stats Merlot',
			color: 'red',
			country: 'FR',
			grapes: 'Merlot',
			quantity: '5'
		});
		const drink = (url, drunk_on, rating) =>
			alice.action(`${url}?/drink`, { drunk_on, ...(rating ? { rating } : {}) });
		await drink(pinot, '2019-10-01', '4');
		await drink(pinot, '2019-03-12', '5');
		await drink(merlot, '2019-01-02');
		await drink(merlot, '2018-12-31', '1');
		// a tie between Merlot and Pinot Noir in 2017 goes to the most recent drink
		await drink(merlot, '2017-04-01');
		await drink(pinot, '2017-05-01');

		const json = await (await alice.req('/history/__data.json')).json();
		const page = devalue.unflatten(json.nodes.at(-1).data);
		const year = (y) => page.years.find((s) => s.year === y);
		assert.deepEqual(year(2019), {
			year: 2019,
			bottles: 3,
			avgRating: 4.5,
			topGrape: 'Pinot Noir',
			topCountry: 'CH'
		});
		assert.deepEqual(year(2018), {
			year: 2018,
			bottles: 1,
			avgRating: 1,
			topGrape: 'Merlot',
			topCountry: 'FR'
		});
		assert.equal(year(2017).topCountry, 'CH');
		assert.equal(year(2017).topGrape, 'Pinot Noir');
	});

	test('renaming a storage location moves all its wines', async () => {
		for (const name of ['Loc A', 'Loc B']) {
			const fd = new FormData();
			for (const [k, v] of Object.entries({ name, color: 'red', quantity: '1', location: 'Old Rack' }))
				fd.append(k, v);
			await alice.req('/add', { method: 'POST', form: fd, page: true });
		}
		const where = async () =>
			(await (await alice.req('/export/vintry.json')).json()).wines
				.filter((w) => w.name.startsWith('Loc '))
				.map((w) => w.location);
		assert.equal(
			(await alice.action('/settings?/renameLocation', { from: 'Old Rack', to: ' Basement ' })).type,
			'success'
		);
		assert.deepEqual(await where(), ['Basement', 'Basement']);
		await alice.action('/settings?/renameLocation', { from: 'Basement', to: '' });
		assert.deepEqual(await where(), [null, null], 'empty removes the place');
	});

	test('removing a drink entry puts the bottle back', async () => {
		const qty = async () => {
			const html = await (await alice.req(wineUrl, { page: true })).text();
			return Number(html.match(/class="qty[^"]*"[^>]*>(\d+)</)[1]);
		};
		const before = await qty();
		await alice.action(`${wineUrl}?/drink`, { drunk_on: '2026-10-31', note: 'oops' });
		assert.equal(await qty(), before - 1);
		const html = await (await alice.req(wineUrl, { page: true })).text();
		const id = html.match(/data-drink="([0-9a-f-]{36})"/)[1];
		assert.equal((await alice.action(`${wineUrl}?/deleteDrink`, { id })).type, 'success');
		assert.equal(await qty(), before);
	});

	test('malformed ids and impossible dates are refused cleanly, never a 500', async () => {
		for (const action of ['rate', 'quantity', 'drink']) {
			const r = await alice.action(`/wine/not-a-uuid?/${action}`, {
				rating: '3',
				delta: '1',
				drunk_on: '2026-10-31'
			});
			assert.notEqual(r.type, 'error', `${action}: ${JSON.stringify(r)}`);
		}
		const r = await alice.action(`${wineUrl}?/drink`, { drunk_on: '2026-02-30' });
		assert.equal(r.type, 'failure');
		assert.equal((await alice.req('/wine/not-a-uuid', { page: true })).status, 404);
	});

	test('a drink entry can be corrected', async () => {
		// newest date, so it is the first entry on the page
		await alice.action(`${wineUrl}?/drink`, { drunk_on: '2026-10-31', note: 'first try' });
		const html = await (await alice.req(wineUrl, { page: true })).text();
		const id = html.match(/data-drink="([0-9a-f-]{36})"/)[1];
		const r = await alice.action(`${wineUrl}?/editDrink`, {
			id,
			drunk_on: '2026-10-28',
			rating: '4',
			note: 'corrected'
		});
		assert.equal(r.type, 'success');
		const after = await (await alice.req(wineUrl, { page: true })).text();
		assert.ok(after.includes('corrected'));
		assert.equal(
			(await alice.action(`${wineUrl}?/editDrink`, { id, drunk_on: '2026-13-01' })).type,
			'failure'
		);
		assert.equal(
			(await bob.action(`${wineUrl}?/editDrink`, { id, drunk_on: '2026-10-01', note: 'x' })).type,
			'redirect',
			'Bob is signed out here'
		);
	});

	test('quantity never goes below zero', async () => {
		for (let i = 0; i < 4; i++) await alice.action(`${wineUrl}?/quantity`, { delta: '-1' });
		const r = await alice.action(`${wineUrl}?/drink`, { drunk_on: '2026-10-31' });
		assert.equal(r.type, 'failure', 'cannot drink from an empty cellar');
	});

	test('the photo is served to its owner, privately cached', async () => {
		const r = await alice.req(`/photo/${wineId}?s=t&v=1`);
		assert.equal(r.status, 200);
		assert.equal(r.headers.get('content-type'), 'image/jpeg');
		assert.match(r.headers.get('cache-control'), /private/);
	});
});

describe('people', () => {
	let bobKey;

	test('an admin invites someone', async () => {
		const r = await alice.action('/settings?/invite', { note: 'Bob' });
		assert.equal(r.type, 'success');
		bobKey = new Authenticator(rpId);
		const reg = await bobKey.register(bob, inviteFrom(r.data), 'Bob');
		assert.equal(reg.ok, true);
	});

	test("cellars are private: Bob can't see Alice's wine or photo", async () => {
		assert.equal((await bob.req(wineUrl, { page: true })).status, 404);
		assert.equal((await bob.req(`/photo/${wineId}?s=t`)).status, 404);
		assert.equal((await bob.action(`${wineUrl}?/delete`, {})).type, 'redirect');
		assert.equal((await alice.req(wineUrl, { page: true })).status, 200, "Bob's delete did nothing");
	});

	test('grape pages list only your own wines', async () => {
		const mine = await (await alice.req('/grapes/cornalin', { page: true })).text();
		assert.ok(mine.includes('Cornalin Test'));
		const theirs = await (await bob.req('/grapes/cornalin', { page: true })).text();
		assert.ok(!theirs.includes('Cornalin Test'));
		assert.equal((await alice.req('/grapes/not-a-grape', { page: true })).status, 404);
		assert.equal((await alice.req('/grapes', { page: true })).status, 200);
	});

	test('region pages match any spelling and list only your own wines', async () => {
		const mine = await (await alice.req('/regions/valais', { page: true })).text();
		assert.ok(mine.includes('Cornalin Test'), 'region stored as "Valais"');
		const theirs = await (await bob.req('/regions/valais', { page: true })).text();
		assert.ok(!theirs.includes('Cornalin Test'));
		assert.equal((await alice.req('/regions/atlantis', { page: true })).status, 404);
	});

	test('the history shows the cellar value', async () => {
		// an earlier test emptied this wine; the value only counts bottles still in the cellar
		await alice.action(`${wineUrl}?/quantity`, { delta: '1' });
		const html = await (await alice.req('/history', { page: true })).text();
		assert.ok(/Cellar value|Kellerwert/.test(html));
	});

	test('a non-admin cannot invite', async () => {
		assert.equal((await bob.action('/settings?/invite', { note: 'x' })).type, 'error');
	});

	test('add a device with a one-time link', async () => {
		const r = await bob.action('/settings?/addDevice', {});
		const phone = new Authenticator(rpId);
		assert.equal((await phone.register(new Client(base), inviteFrom(r.data), 'ignored')).ok, true);
		assert.equal(await phone.login(new Client(base)), true);
	});

	test('an admin can create a device link for someone who lost their phone', async () => {
		const html = await (await alice.req('/settings', { page: true })).text();
		const bobId = html.match(/action="\?\/deviceLinkFor"[\s\S]*?name="id" value="([0-9a-f-]{36})"/)[1];
		const r = await alice.action('/settings?/deviceLinkFor', { id: bobId });
		assert.equal(r.type, 'success');
		const newPhone = new Authenticator(rpId);
		assert.equal((await newPhone.register(new Client(base), inviteFrom(r.data), 'ignored')).ok, true);
		const c = new Client(base);
		assert.equal(await newPhone.login(c), true);
		assert.match(await (await c.req('/settings', { page: true })).text(), /Bob/);
		assert.equal((await bob.action('/settings?/deviceLinkFor', { id: bobId })).type, 'error', 'admins only');
	});

	test('the last passkey cannot be deleted', async () => {
		const c = new Client(base);
		const solo = new Authenticator(rpId);
		const r = await alice.action('/settings?/invite', { note: 'Carol' });
		await solo.register(c, inviteFrom(r.data), 'Carol');
		const res = await c.action('/settings?/deletePasskey', {
			id: Buffer.from(solo.id).toString('base64url')
		});
		assert.equal(res.type, 'failure');
		assert.equal(await solo.login(new Client(base)), true);
	});
});

describe('your data', () => {
	test('export: cellar CSV, history CSV and JSON contain only your own wines', async () => {
		// Response.text() strips the BOM, so look at the bytes
		const bytes = Buffer.from(await (await alice.req('/export/wines.csv')).arrayBuffer());
		assert.deepEqual([...bytes.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'UTF-8 BOM for Excel');
		const csv = bytes.toString('utf8');
		assert.ok(csv.includes('name,producer'));
		assert.ok(csv.includes('Cornalin Test'));
		const drinks = await (await alice.req('/export/drinks.csv')).text();
		assert.ok(drinks.includes('lovely'));
		const json = await (await alice.req('/export/vintry.json')).json();
		assert.ok(json.wines.some((w) => w.name === 'Cornalin Test'));
		assert.ok(!JSON.stringify(json).includes('image'), 'no photo bytes in the export');
		const bobCsv = await (await bob.req('/export/wines.csv')).text();
		assert.ok(!bobCsv.includes('Cornalin Test'), "Bob's export has no Alice wines");
		assert.equal((await alice.req('/export/secrets.txt')).status, 404);
	});

	test('import wines from a spreadsheet; invalid rows are skipped', async () => {
		const rows = [
			{ name: 'Imported Merlot', vintage: '2020', color: 'red', grapes: ['merlot'], quantity: '6' },
			{ name: 'Imported Riesling', country: 'DE', purchased_on: '2024-05-01' },
			{ name: 'Broken vintage', vintage: 'next year' },
			{ vintage: '2019' }
		];
		const r = await alice.action('/settings?/import', { rows: JSON.stringify(rows) });
		assert.equal(r.type, 'success');
		const data = devalue.parse(r.data);
		assert.equal(data.imported, 2);
		assert.deepEqual(data.rejected, [4, 5], 'spreadsheet rows: header is row 1');
		const html = await (await alice.req('/', { page: true })).text();
		assert.ok(html.includes('Imported Merlot') && html.includes('Imported Riesling'));
		assert.ok(!html.includes('Broken vintage'));
		// the form suggests window and taste in the browser; imported rows get them on the server
		const merlot = (await (await alice.req('/export/vintry.json')).json()).wines.find(
			(w) => w.name === 'Imported Merlot'
		);
		assert.ok(merlot.drink_from >= 2020 && merlot.drink_to > merlot.drink_from, JSON.stringify(merlot));
		assert.ok(merlot.body !== null);
		const bad = await alice.action('/settings?/import', { rows: 'not json' });
		assert.equal(bad.type, 'failure');
	});

	test('a formula in a wine name stays text in the CSV', async () => {
		const fd = new FormData();
		fd.append('name', '=HYPERLINK("http://evil.example")');
		fd.append('color', 'red');
		fd.append('quantity', '1');
		await bob.req('/add', { method: 'POST', form: fd, page: true });
		const csv = await (await bob.req('/export/wines.csv')).text();
		assert.ok(csv.includes(`"'=HYPERLINK`), csv);
	});

	test('rename a passkey', async () => {
		const html = await (await bob.req('/settings', { page: true })).text();
		const id = html.match(/action="\?\/deletePasskey"[\s\S]*?name="id" value="([^"]+)"/)[1];
		assert.equal(
			(await bob.action('/settings?/renamePasskey', { id, label: 'Work laptop' })).type,
			'success'
		);
		assert.ok((await (await bob.req('/settings', { page: true })).text()).includes('Work laptop'));
	});

	test('the only admin cannot delete the account while others remain', async () => {
		const r = await alice.action('/settings?/deleteAccount', { confirm: 'Alice' });
		assert.equal(r.type, 'failure');
		assert.match(r.data, /lastAdmin/); // action data arrives devalue-serialised
	});

	test('deleting an account needs the exact name and removes everything', async () => {
		assert.match((await bob.action('/settings?/deleteAccount', { confirm: 'bob' })).data, /confirm/);
		const r = await bob.req('/settings?/deleteAccount', {
			method: 'POST',
			form: { confirm: 'Bob' },
			page: true
		});
		assert.equal(r.status, 303);
		assert.equal((await bob.req('/', { page: true })).status, 303, 'session is gone');
		const html = await (await alice.req('/settings', { page: true })).text();
		assert.ok(!html.includes('>Bob'), 'Bob is no longer listed');
	});

	test('an admin can make someone admin', async () => {
		const html = await (await alice.req('/settings', { page: true })).text();
		const id = html.match(/action="\?\/makeAdmin"[\s\S]*?name="id" value="([0-9a-f-]{36})"/)[1];
		assert.equal((await alice.action('/settings?/makeAdmin', { id })).type, 'success');
		assert.ok(!(await (await alice.req('/settings', { page: true })).text()).includes('?/makeAdmin'));
	});
});

describe('session', () => {
	test('signed-in devices: list them and sign out the others', async () => {
		const tablet = new Client(base);
		assert.equal(
			await aliceKey.login(tablet, {
				'user-agent': 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) Safari/604.1'
			}),
			true
		);
		const html = await (await alice.req('/settings', { page: true })).text();
		assert.ok(html.includes('iPad'), 'the tablet is listed by device');
		assert.equal((await alice.action('/settings?/revokeOtherSessions', {})).type, 'success');
		assert.equal((await tablet.req('/', { page: true })).status, 303, 'tablet is signed out');
		assert.equal((await alice.req('/', { page: true })).status, 200, 'this device stays signed in');
	});

	test('cross-origin form posts are blocked', async () => {
		const r = await alice.req('/settings?/signOut', {
			method: 'POST',
			form: {},
			headers: { origin: 'https://evil.example' }
		});
		assert.equal(r.status, 403);
	});

	test('sign out ends the session', async () => {
		const r = await alice.req('/settings?/signOut', { method: 'POST', form: {}, page: true });
		assert.equal(r.status, 303);
		assert.equal((await alice.req('/', { page: true })).status, 303);
	});
});

describe('operations', () => {
	test('health and readiness endpoints are public and cheap', async () => {
		const anon = new Client(base);
		const live = await anon.req('/healthz');
		assert.equal(live.status, 200);
		assert.equal(await live.text(), 'ok');
		const ready = await anon.req('/readyz');
		assert.equal(ready.status, 200);
		assert.equal(ready.headers.get('cache-control'), 'no-store');
	});

	test('pages are gzipped for GET only', async () => {
		const anon = new Client(base);
		const gz = { 'accept-encoding': 'gzip' };
		const page = await anon.req('/login', { page: true, headers: gz });
		assert.equal(page.headers.get('content-encoding'), 'gzip');
		assert.match(page.headers.get('vary') ?? '', /accept-encoding/i);
		assert.match(await page.text(), /<\/html>/, 'and it decodes to the whole page');
		const post = await anon.req('/api/auth/login/options', { method: 'POST', headers: gz });
		assert.equal(post.headers.get('content-encoding'), null);
	});
});
