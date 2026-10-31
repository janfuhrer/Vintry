// Country outlines for the small maps, from Natural Earth via world-atlas (public domain).
// Run after changing the country list; the output is committed.
//
//   node scripts/map.mjs
//
// Each country is drawn on its own: an equirectangular projection around its middle latitude,
// fitted to SIZE units, simplified to what a phone shows, far-off islands left out.
import { readFileSync, writeFileSync } from 'node:fs';
import { feature } from 'topojson-client';

const SIZE = 300;
// Douglas–Peucker tolerance and smallest island kept, in map units
const TOLERANCE = 0.6;
const MIN_AREA = 3;

// ISO 3166-1 alpha-2 → numeric, as world-atlas names its features
const NUMERIC = {
	AR: '032',
	AT: '040',
	AU: '036',
	BG: '100',
	BR: '076',
	CA: '124',
	CH: '756',
	CL: '152',
	CN: '156',
	CZ: '203',
	DE: '276',
	ES: '724',
	FR: '250',
	GB: '826',
	GE: '268',
	GR: '300',
	HR: '191',
	HU: '348',
	IL: '376',
	IT: '380',
	JP: '392',
	LB: '422',
	LU: '442',
	MD: '498',
	MX: '484',
	NZ: '554',
	PT: '620',
	RO: '642',
	RS: '688',
	SI: '705',
	SK: '703',
	TR: '792',
	US: '840',
	UY: '858',
	ZA: '710'
};
// [west, south, east, north] where "the largest part and what lies near it" gets it wrong:
// Alaska and Hawaii, the Chatham Islands across the date line
const MAINLAND = { US: [-125, 24, -66, 50], NZ: [165, -48, 179, -34] };

const root = new URL('..', import.meta.url);
const topo = JSON.parse(readFileSync(new URL('node_modules/world-atlas/countries-50m.json', root)));
const features = feature(topo, topo.objects.countries).features;

const ringBox = (ring) => {
	const lons = ring.map((p) => p[0]);
	const lats = ring.map((p) => p[1]);
	return [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)];
};
const ringArea = (ring) => {
	let a = 0;
	for (let i = 0, j = ring.length - 1; i < ring.length; j = i++)
		a += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
	return Math.abs(a / 2);
};
const centre = (b) => [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
const inside = ([x, y], b) => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3];

function simplify(points, tolerance) {
	if (points.length < 3) return points;
	const keep = new Uint8Array(points.length);
	keep[0] = keep[points.length - 1] = 1;
	const stack = [[0, points.length - 1]];
	while (stack.length) {
		const [a, b] = stack.pop();
		const [ax, ay] = points[a];
		const [bx, by] = points[b];
		const len = Math.hypot(bx - ax, by - ay) || 1;
		let worst = 0;
		let at = -1;
		for (let i = a + 1; i < b; i++) {
			const d = Math.abs((bx - ax) * (ay - points[i][1]) - (ax - points[i][0]) * (by - ay)) / len;
			if (d > worst) [worst, at] = [d, i];
		}
		if (worst > tolerance) {
			keep[at] = 1;
			stack.push([a, at], [at, b]);
		}
	}
	return points.filter((_, i) => keep[i]);
}

// a closed ring starts and ends on the same point, which leaves nothing to measure against:
// split it at the point farthest from the start and simplify both halves
function simplifyRing(ring, tolerance) {
	const open = ring.slice(0, -1);
	let far = 0;
	open.forEach(([x, y], i) => {
		if (
			Math.hypot(x - open[0][0], y - open[0][1]) >
			Math.hypot(open[far][0] - open[0][0], open[far][1] - open[0][1])
		)
			far = i;
	});
	const first = simplify(open.slice(0, far + 1), tolerance);
	const second = simplify([...open.slice(far), open[0]], tolerance);
	return [...first, ...second.slice(1)];
}

const out = {};
for (const [code, id] of Object.entries(NUMERIC)) {
	const f = features.find((x) => x.id === id);
	if (!f) throw new Error(`no outline for ${code}`);
	const polygons = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
	// outer rings only: lakes and enclaves are noise at this size
	const rings = polygons.map((p) => p[0]);
	let area = MAINLAND[code];
	if (!area) {
		const largest = rings.reduce((a, b) => (ringArea(b) > ringArea(a) ? b : a));
		const [w, s, e, n] = ringBox(largest);
		const mx = (e - w) * 0.3;
		const my = (n - s) * 0.3;
		area = [w - mx, s - my, e + mx, n + my];
	}
	const kept = rings.filter((r) => inside(centre(ringBox(r)), area));
	const box = kept
		.map(ringBox)
		.reduce((a, b) => [
			Math.min(a[0], b[0]),
			Math.min(a[1], b[1]),
			Math.max(a[2], b[2]),
			Math.max(a[3], b[3])
		]);
	const cos = Math.cos((((box[1] + box[3]) / 2) * Math.PI) / 180);
	const k = SIZE / Math.max((box[2] - box[0]) * cos, box[3] - box[1]);
	const project = ([lon, lat]) => [(lon - box[0]) * cos * k, (box[3] - lat) * k];
	const paths = [];
	for (const ring of kept) {
		const points = simplifyRing(ring.map(project), TOLERANCE);
		if (points.length < 4 || ringArea(points) < MIN_AREA) continue;
		paths.push('M' + points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L') + 'Z');
	}
	const r = (n, d = 4) => Number(n.toFixed(d));
	out[code] = {
		d: paths.join(''),
		west: r(box[0]),
		north: r(box[3]),
		kx: r(cos * k, 5),
		ky: r(k, 5),
		w: r((box[2] - box[0]) * cos * k, 1),
		h: r((box[3] - box[1]) * k, 1)
	};
}

const body = Object.entries(out)
	.map(([code, s]) => `\t${code}: ${JSON.stringify(s)}`)
	.join(',\n');
writeFileSync(
	new URL('src/lib/data/shapes.ts', root),
	`// Generated by scripts/map.mjs from Natural Earth (public domain) via world-atlas. Don't edit.
import type { Shape } from './types';

export const shapes: Record<string, Shape> = {
${body}
};
`
);
console.log(
	Object.entries(out)
		.map(([c, s]) => `${c} ${(s.d.length / 1024).toFixed(1)}k`)
		.join(', ')
);
