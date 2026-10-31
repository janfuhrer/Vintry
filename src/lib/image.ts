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
	return new Promise((resolve, reject) =>
		canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/jpeg', quality)
	);
}

export async function preparePhoto(file: Blob) {
	// decode the (possibly 48 MP) original once; two parallel decodes can crash a Safari tab
	const image = await resizeImage(file, 1280);
	const thumb = await resizeImage(image, 320, 0.75);
	return { image, thumb };
}
