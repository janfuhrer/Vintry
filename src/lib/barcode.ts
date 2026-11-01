// Finds the retail barcode on a label photo, on the phone. Browser-only, loaded on demand.
import { prepareZXingModule, readBarcodes } from 'zxing-wasm/reader';
import { normalizeGtin } from './gtin.ts';

let prepared = false;

/** The bottle's EAN/UPC if the photo shows one, else null; never throws */
export async function readBarcode(image: Blob): Promise<string | null> {
	try {
		if (!prepared) {
			// the engine is self-hosted next to the OCR engine; by default it would come from a CDN
			prepareZXingModule({
				overrides: {
					locateFile: (path: string, prefix: string) =>
						path.endsWith('.wasm') ? '/ocr/zxing_reader.wasm' : prefix + path
				}
			});
			prepared = true;
		}
		const results = await readBarcodes(image, {
			formats: ['EAN13', 'EAN8', 'UPCA', 'UPCE'],
			tryHarder: true,
			maxNumberOfSymbols: 1
		});
		for (const r of results) {
			const code = r.isValid ? normalizeGtin(r.text) : null;
			if (code) return code;
		}
	} catch (err) {
		console.error(err);
	}
	return null;
}
