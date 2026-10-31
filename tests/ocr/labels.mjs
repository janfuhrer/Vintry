// Synthetic but realistic front labels: typical layouts, fonts and wording of
// French, Swiss, Italian, German and Spanish wines. Each lists what the scan should find.
// Accents in name/producer are compared loosely: OCR often drops them on capitals.
const label = (lines, { w = 1000, h = 1200, bg = '#f7f1e3', ink = '#2a1d16' } = {}) => {
	let y = 0;
	const els = lines
		.map(([text, size, opts = {}]) => {
			y += (opts.gap ?? 40) + size;
			const fam = opts.family ?? 'Georgia, serif';
			const weight = opts.bold ? 700 : 400;
			const ls = opts.spacing ?? 0;
			return `<text x="${w / 2}" y="${y}" font-family="${fam}" font-size="${size}" font-weight="${weight}" letter-spacing="${ls}" text-anchor="middle" fill="${ink}">${text}</text>`;
		})
		.join('\n');
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="${bg}"/><rect x="30" y="30" width="${w - 60}" height="${h - 60}" fill="none" stroke="${ink}" stroke-width="3"/>${els}</svg>`;
};

/** The label as a phone photo would show it: tilted, smaller, on a dark cluttered table */
export function inPhoto(svg, { angle = 4, scale = 0.62 } = {}) {
	const inner = svg.replace('<svg xmlns="http://www.w3.org/2000/svg"', '<svg');
	return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1600">
		<rect width="100%" height="100%" fill="#3b2a20"/>
		<circle cx="200" cy="1400" r="260" fill="#5a4030"/><rect x="1250" y="80" width="300" height="500" rx="40" fill="#22170f"/>
		<g transform="translate(800 800) rotate(${angle}) scale(${scale}) translate(-500 -600)">${inner}</g>
	</svg>`;
}

export const labels = {
	bordeaux: {
		svg: label([
			['GRAND VIN DE BORDEAUX', 28, { spacing: 4, gap: 120 }],
			['CHÂTEAU MONTLAURENT', 52, { bold: true, gap: 80 }],
			['Saint-Émilion Grand Cru', 40, { gap: 60 }],
			['2016', 64, { gap: 120 }],
			['APPELLATION SAINT-ÉMILION GRAND CRU CONTRÔLÉE', 22, { gap: 160 }],
			['Mis en bouteille au château', 24],
			['13,5% vol.        750 ml', 26, { gap: 60 }]
		]),
		expect: {
			vintage: 2016,
			alcohol: 13.5,
			size_ml: 750,
			country: 'FR',
			color: 'red',
			name: 'Château Montlaurent',
			producerHas: 'Montlaurent'
		}
	},
	fendant: {
		svg: label(
			[
				['Cave du Rhône', 34, { gap: 140, family: 'Helvetica, Arial, sans-serif' }],
				['Fendant', 120, { bold: true, gap: 90 }],
				['du Valais AOC', 42, { gap: 50 }],
				['2023', 56, { gap: 140 }],
				['Vin blanc de Suisse', 30, { gap: 200 }],
				['12% vol    75 cl', 28, { gap: 60, family: 'Helvetica, Arial, sans-serif' }]
			],
			{ bg: '#ffffff' }
		),
		expect: {
			vintage: 2023,
			alcohol: 12,
			size_ml: 750,
			country: 'CH',
			region: 'Valais',
			grapes: ['Chasselas'],
			color: 'white',
			name: 'Fendant'
		}
	},
	barolo: {
		svg: label(
			[
				['TENUTA SANTA LUCIA', 36, { spacing: 3, gap: 140 }],
				['BAROLO', 110, { bold: true, gap: 100 }],
				['Denominazione di Origine Controllata e Garantita', 24, { gap: 50 }],
				['2018', 60, { gap: 120 }],
				['Nebbiolo da Barolo', 34, { gap: 80 }],
				['Prodotto in Italia', 26, { gap: 160 }],
				['14,5% vol      0,75 l', 28, { gap: 50 }]
			],
			{ bg: '#1d1a1a', ink: '#e9dcc0' }
		),
		expect: {
			vintage: 2018,
			alcohol: 14.5,
			size_ml: 750,
			country: 'IT',
			region: 'Barolo',
			grapes: ['Nebbiolo'],
			color: 'red',
			name: 'Barolo',
			producerHas: 'Santa Lucia'
		}
	},
	riesling: {
		svg: label([
			['Weingut Hofmann', 40, { gap: 150, family: 'Helvetica, Arial, sans-serif' }],
			['Riesling', 100, { gap: 100 }],
			['trocken', 44, { gap: 40 }],
			['Mosel', 50, { gap: 90, bold: true }],
			['2021', 56, { gap: 110 }],
			['Qualitätswein · Deutschland', 28, { gap: 170 }],
			['alc. 11,5% vol    750 ml', 26, { gap: 50 }]
		]),
		expect: {
			vintage: 2021,
			alcohol: 11.5,
			size_ml: 750,
			country: 'DE',
			region: 'Mosel',
			grapes: ['Riesling'],
			color: 'white',
			name: 'Riesling',
			producerHas: 'Hofmann'
		}
	},
	chianti: {
		// all-caps title starting with the Italian article "I", appellation with DOCG
		svg: label([
			['FATTORIA LE CORTI', 34, { spacing: 3, gap: 150 }],
			['I SODI', 104, { bold: true, gap: 100 }],
			['Chianti Classico DOCG', 40, { gap: 70 }],
			['2019', 56, { gap: 110 }],
			['Sangiovese', 32, { gap: 90 }],
			['13,5% vol    750 ml', 26, { gap: 170 }]
		]),
		expect: {
			vintage: 2019,
			alcohol: 13.5,
			size_ml: 750,
			country: 'IT',
			region: 'Chianti Classico',
			grapes: ['Sangiovese'],
			color: 'red',
			name: 'I Sodi',
			producerHas: 'Le Corti'
		}
	},
	rioja: {
		svg: label([
			['BODEGAS RAMÍREZ', 38, { spacing: 2, gap: 150 }],
			['Viña Alta', 96, { bold: true, gap: 90 }],
			['RESERVA', 44, { spacing: 6, gap: 60 }],
			['Rioja', 52, { gap: 80 }],
			['Denominación de Origen Calificada', 24, { gap: 40 }],
			['2017', 56, { gap: 110 }],
			['Tempranillo · Garnacha', 30, { gap: 90 }],
			['14% vol.  75 cl  Vino tinto · España', 24, { gap: 110 }]
		]),
		expect: {
			vintage: 2017,
			alcohol: 14,
			size_ml: 750,
			country: 'ES',
			region: 'Rioja',
			grapes: ['Tempranillo', 'Grenache'],
			color: 'red',
			name: 'Vina Alta',
			producerHas: 'Ramírez'
		}
	}
};
