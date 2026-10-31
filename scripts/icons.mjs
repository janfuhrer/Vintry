// Renders static/logo.svg to the PNG app icons. Run after changing the logo: npm run icons
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'node:fs';

const svg = readFileSync('static/logo.svg', 'utf8');
// maskable: full-bleed background, artwork inside the 80% safe zone
const maskable = svg
	.replace('rx="112"', 'rx="0"')
	.replace(/(<rect[^>]*\/>)/, '$1<g transform="translate(51.2 51.2) scale(0.8)">')
	.replace('</svg>', '</g></svg>');

const render = (source, size, out) => {
	const png = new Resvg(source, { fitTo: { mode: 'width', value: size } }).render().asPng();
	writeFileSync(out, png);
	console.log(`wrote ${out}`);
};

render(svg, 192, 'static/icons/icon-192.png');
render(svg, 512, 'static/icons/icon-512.png');
render(maskable, 512, 'static/icons/maskable-512.png');
// iOS adds its own rounded corners and ignores transparency
render(maskable, 180, 'static/icons/apple-touch-icon.png');
