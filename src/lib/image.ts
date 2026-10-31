/** Downscale to a JPEG blob; the longest side is at most `max` px */
export async function resizeImage(file: Blob, max: number, quality = 0.82): Promise<Blob> {
	const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
	const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
	const w = Math.round(bitmap.width * scale);
	const h = Math.round(bitmap.height * scale);
	const canvas = document.createElement('canvas');
	canvas.width = w;
	canvas.height = h;
	const ctx = canvas.getContext('2d')!;
	ctx.drawImage(bitmap, 0, 0, w, h);
	bitmap.close();
	return encode(canvas, quality);
}

/**
 * JPEG-encodes and then frees the canvas. iOS Safari counts canvas memory against a total cap
 * until garbage collection, so a few scans in a row could make toBlob fail otherwise.
 */
export function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
	return new Promise((resolve, reject) =>
		canvas.toBlob(
			(b) => {
				canvas.width = canvas.height = 0;
				if (b) resolve(b);
				else reject(new Error('encode failed'));
			},
			'image/jpeg',
			quality
		)
	);
}

export async function preparePhoto(file: Blob) {
	// decode the (possibly 48 MP) original once; two parallel decodes can crash a Safari tab
	const image = await resizeImage(file, 1280);
	const thumb = await resizeImage(image, 320, 0.75);
	return { image, thumb };
}

/**
 * Stored photo plus a sharper copy for text recognition. On a phone photo the label fills
 * only part of the frame, so at 1280 px the small print is ~10–15 px tall, too small for
 * tesseract. The OCR copy is used once and never uploaded.
 */
export async function preparePhotoForScan(file: Blob) {
	const ocr = await resizeImage(file, 2200, 0.9);
	const image = await resizeImage(ocr, 1280);
	const thumb = await resizeImage(image, 320, 0.75);
	return { photo: { image, thumb }, ocr };
}
