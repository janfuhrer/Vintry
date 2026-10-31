// Validation of the wine form. Kept free of database imports so it can be unit-tested.
import { COLORS, canonicalGrape, type Color } from '#lib/wine.ts';
import type { WineInput } from './wines';

const MAX_PHOTO = 1_500_000;
const MAX_THUMB = 200_000;

export type FieldErrors = Partial<Record<keyof WineInput | 'photo', string>>;

function str(fd: FormData, key: string, max = 200): string | null {
	const v = fd.get(key);
	if (typeof v !== 'string') return null;
	const s = v.trim().slice(0, max);
	return s || null;
}

function int(fd: FormData, key: string, min: number, max: number, errors: FieldErrors): number | null {
	const s = str(fd, key);
	if (s === null) return null;
	const n = Number(s);
	if (!Number.isInteger(n) || n < min || n > max) {
		errors[key as keyof FieldErrors] = 'invalid';
		return null;
	}
	return n;
}

function decimal(fd: FormData, key: string, max: number, errors: FieldErrors): number | null {
	const s = str(fd, key);
	if (s === null) return null;
	const n = Number(s.replace(',', '.'));
	if (!Number.isFinite(n) || n < 0 || n > max) {
		errors[key as keyof FieldErrors] = 'invalid';
		return null;
	}
	return Math.round(n * 100) / 100;
}

export function parseWineForm(fd: FormData): { input: WineInput; errors: FieldErrors } {
	const errors: FieldErrors = {};
	const name = str(fd, 'name');
	if (!name) errors.name = 'required';

	const colorRaw = str(fd, 'color');
	const color = (COLORS as readonly string[]).includes(colorRaw ?? '') ? (colorRaw as Color) : 'red';

	// validate before truncating: 'XYZ' must not become 'XY'
	const countryRaw = str(fd, 'country', 10);
	const country = countryRaw && /^[A-Z]{2}$/i.test(countryRaw) ? countryRaw.toUpperCase() : null;

	const grapes = [
		...new Set(
			fd
				.getAll('grapes')
				.filter((g): g is string => typeof g === 'string')
				.map((g) => canonicalGrape(g.slice(0, 60)))
				.filter(Boolean)
		)
	].slice(0, 12);

	const year = new Date().getFullYear();
	const purchasedOn = str(fd, 'purchased_on', 10);
	if (purchasedOn && !/^\d{4}-\d{2}-\d{2}$/.test(purchasedOn)) errors.purchased_on = 'invalid';

	const input: WineInput = {
		name: name ?? '',
		producer: str(fd, 'producer'),
		vintage: int(fd, 'vintage', 1800, year + 1, errors),
		color,
		country,
		region: str(fd, 'region', 100),
		grapes,
		alcohol: decimal(fd, 'alcohol', 99, errors),
		size_ml: int(fd, 'size_ml', 1, 30_000, errors),
		quantity: int(fd, 'quantity', 0, 9999, errors) ?? 0,
		drink_from: int(fd, 'drink_from', 1800, 2300, errors),
		drink_to: int(fd, 'drink_to', 1800, 2300, errors),
		body: int(fd, 'body', 1, 5, errors),
		acidity: int(fd, 'acidity', 1, 5, errors),
		tannin: int(fd, 'tannin', 1, 5, errors),
		sweetness: int(fd, 'sweetness', 1, 5, errors),
		rating: int(fd, 'rating', 1, 5, errors),
		notes: str(fd, 'notes', 5000),
		purchased_on: purchasedOn && !errors.purchased_on ? purchasedOn : null,
		purchased_at: str(fd, 'purchased_at'),
		price: decimal(fd, 'price', 99_999_999, errors),
		gifted_by: str(fd, 'gifted_by'),
		location: str(fd, 'location', 100),
		ocr_text: str(fd, 'ocr_text', 5000)
	};
	if (input.drink_from && input.drink_to && input.drink_from > input.drink_to) errors.drink_to = 'invalid';
	return { input, errors };
}

const isJpeg = (b: Uint8Array) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;

/** `undefined`: keep the current photo, `null`: remove it */
export async function parsePhoto(
	fd: FormData,
	errors: FieldErrors
): Promise<{ image: Buffer; thumb: Buffer } | null | undefined> {
	if (fd.get('remove_photo') === '1') return null;
	const image = fd.get('photo');
	const thumb = fd.get('thumb');
	if (!(image instanceof File) || !image.size) return undefined;
	if (!(thumb instanceof File) || !thumb.size) {
		errors.photo = 'invalid';
		return undefined;
	}
	if (image.size > MAX_PHOTO || thumb.size > MAX_THUMB) {
		errors.photo = 'too_large';
		return undefined;
	}
	const [a, b] = await Promise.all([image.arrayBuffer(), thumb.arrayBuffer()]);
	const img = Buffer.from(a);
	const th = Buffer.from(b);
	if (!isJpeg(img) || !isJpeg(th)) {
		errors.photo = 'invalid';
		return undefined;
	}
	return { image: img, thumb: th };
}
