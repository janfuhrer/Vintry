import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { crc32 } from 'node:zlib';
import { describe, expect, test } from 'vitest';
import { zipStream, type ZipEntry } from './zip';

async function zip(entries: ZipEntry[]) {
	async function* gen() {
		yield* entries;
	}
	return Buffer.from(await new Response(zipStream(gen())).arrayBuffer());
}

/** Reads the central directory back: name, size and CRC per entry */
function list(buf: Buffer) {
	const end = buf.length - 22;
	expect(buf.readUInt32LE(end)).toBe(0x06054b50);
	const count = buf.readUInt16LE(end + 10);
	let p = buf.readUInt32LE(end + 16);
	const out = [];
	for (let i = 0; i < count; i++) {
		expect(buf.readUInt32LE(p)).toBe(0x02014b50);
		const nameLen = buf.readUInt16LE(p + 28);
		const local = buf.readUInt32LE(p + 42);
		const size = buf.readUInt32LE(p + 24);
		const data = buf.subarray(
			local + 30 + buf.readUInt16LE(local + 26),
			local + 30 + buf.readUInt16LE(local + 26) + size
		);
		out.push({
			name: buf.toString('utf8', p + 46, p + 46 + nameLen),
			size,
			crcOk: crc32(data) === buf.readUInt32LE(p + 16)
		});
		p += 46 + nameLen;
	}
	return out;
}

describe('zipStream', () => {
	const date = new Date(2026, 9, 31, 20, 15, 42);

	test('entries come back with their names, sizes and checksums', async () => {
		const buf = await zip([
			{ name: 'Château Montlaurent-2015.jpg', data: Buffer.from('first'), date },
			{ name: 'b.jpg', data: Buffer.alloc(1000, 7), date }
		]);
		expect(list(buf)).toEqual([
			{ name: 'Château Montlaurent-2015.jpg', size: 5, crcOk: true },
			{ name: 'b.jpg', size: 1000, crcOk: true }
		]);
	});

	test('an empty archive is valid', async () => {
		expect(list(await zip([]))).toEqual([]);
	});

	test('unzip reads it, where available', async () => {
		let unzip = true;
		try {
			execFileSync('unzip', ['-v'], { stdio: 'ignore' });
		} catch {
			unzip = false;
		}
		if (!unzip) return;
		const dir = mkdtempSync(join(tmpdir(), 'vintry-zip-'));
		const file = join(dir, 'test.zip');
		writeFileSync(file, await zip([{ name: 'Weißburgunder.jpg', data: Buffer.from('x'.repeat(50)), date }]));
		expect(execFileSync('unzip', ['-t', file]).toString()).toMatch(/No errors detected/);
	});
});
