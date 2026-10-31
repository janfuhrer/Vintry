import { crc32 } from 'node:zlib';

export interface ZipEntry {
	name: string;
	data: Uint8Array;
	date: Date;
}

/** MS-DOS date and time, as ZIP stores them (local time, two-second steps) */
function dosDateTime(d: Date) {
	const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
	const date = ((Math.max(1980, d.getFullYear()) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
	return { time, date };
}

// bit 11: names are UTF-8
const FLAGS = 0x0800;

/**
 * Streams a ZIP of stored (uncompressed) entries: photos are JPEGs, which don't shrink.
 * Each entry is written as soon as it arrives, so a large export never sits in memory.
 * No ZIP64: an archive past 4 GB fails rather than coming out corrupt.
 */
export function zipStream(entries: AsyncIterable<ZipEntry>): ReadableStream<Uint8Array> {
	const central: Buffer[] = [];
	let offset = 0;
	let count = 0;
	const iterator = entries[Symbol.asyncIterator]();

	return new ReadableStream({
		async pull(controller) {
			try {
				await write(controller);
			} catch (e) {
				// an errored stream gets no cancel(): end the source here, or a database
				// cursor would hold its connection forever
				await iterator.return?.();
				throw e;
			}
		},
		async cancel() {
			await iterator.return?.();
		}
	});

	async function write(controller: ReadableStreamDefaultController<Uint8Array>) {
		const next = await iterator.next();
		if (!next.done) {
			const { name, data, date } = next.value;
			const file = Buffer.from(name, 'utf8');
			const crc = crc32(data);
			const { time, date: day } = dosDateTime(date);
			if (offset + 30 + file.length + data.length > 0xffffffff || count === 0xffff)
				throw new Error('zip too large');

			const local = Buffer.alloc(30);
			local.writeUInt32LE(0x04034b50, 0);
			local.writeUInt16LE(20, 4); // version needed
			local.writeUInt16LE(FLAGS, 6);
			local.writeUInt16LE(0, 8); // stored
			local.writeUInt16LE(time, 10);
			local.writeUInt16LE(day, 12);
			local.writeUInt32LE(crc, 14);
			local.writeUInt32LE(data.length, 18);
			local.writeUInt32LE(data.length, 22);
			local.writeUInt16LE(file.length, 26);
			local.writeUInt16LE(0, 28); // extra

			const entry = Buffer.alloc(46);
			entry.writeUInt32LE(0x02014b50, 0);
			entry.writeUInt16LE(20, 4); // made by
			entry.writeUInt16LE(20, 6); // needed
			entry.writeUInt16LE(FLAGS, 8);
			entry.writeUInt16LE(0, 10);
			entry.writeUInt16LE(time, 12);
			entry.writeUInt16LE(day, 14);
			entry.writeUInt32LE(crc, 16);
			entry.writeUInt32LE(data.length, 20);
			entry.writeUInt32LE(data.length, 24);
			entry.writeUInt16LE(file.length, 28);
			// extra, comment, disk, internal and external attributes stay 0
			entry.writeUInt32LE(offset, 42);
			central.push(entry, file);

			controller.enqueue(Buffer.concat([local, file]));
			controller.enqueue(data);
			offset += 30 + file.length + data.length;
			count++;
			return;
		}

		const directory = Buffer.concat(central);
		const end = Buffer.alloc(22);
		end.writeUInt32LE(0x06054b50, 0);
		end.writeUInt16LE(count, 8);
		end.writeUInt16LE(count, 10);
		end.writeUInt32LE(directory.length, 12);
		end.writeUInt32LE(offset, 16);
		controller.enqueue(Buffer.concat([directory, end]));
		controller.close();
	}
}
