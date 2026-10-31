// Synthetic but realistic front labels: typical layouts, fonts and wording of
// French, Swiss, Italian, German and Spanish wines. Each lists what the scan should find.
// Accents in name/producer are compared loosely: OCR often drops them on capitals.
const escape = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const label = (lines, { w = 1000, h = 1200, bg = '#f7f1e3', ink = '#2a1d16' } = {}) => {
	let y = 0;
	const els = lines
		.map(([text, size, opts = {}]) => {
			y += (opts.gap ?? 40) + size;
			const fam = opts.family ?? 'Georgia, serif';
			const weight = opts.bold ? 700 : 400;
			const ls = opts.spacing ?? 0;
			return `<text x="${w / 2}" y="${y}" font-family="${fam}" font-size="${size}" font-weight="${weight}" letter-spacing="${ls}" text-anchor="middle" fill="${ink}">${escape(text)}</text>`;
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
	champagne: {
		svg: label(
			[
				['CHAMPAGNE', 90, { bold: true, spacing: 6, gap: 170 }],
				['Maison Delaroche', 46, { gap: 90 }],
				['BRUT RÉSERVE', 40, { spacing: 4, gap: 70 }],
				['Élaboré par Delaroche & Fils, Reims, France', 22, { gap: 260 }],
				['12% vol      75 cl', 26, { gap: 60 }]
			],
			{ bg: '#101820', ink: '#d9c48e' }
		),
		expect: {
			alcohol: 12,
			size_ml: 750,
			country: 'FR',
			region: 'Champagne',
			color: 'sparkling',
			producerHas: 'Delaroche'
		}
	},
	port: {
		svg: label([
			['QUINTA DO VALE', 40, { spacing: 3, gap: 150 }],
			['Porto', 110, { bold: true, gap: 100 }],
			['Tawny 10 Years Old', 44, { gap: 70 }],
			['Product of Portugal', 26, { gap: 180 }],
			['20% vol    75 cl', 26, { gap: 60 }]
		]),
		expect: { alcohol: 20, size_ml: 750, country: 'PT', color: 'fortified', producerHas: 'Vale' }
	},
	sauternes: {
		svg: label([
			['CHÂTEAU LES TILLEULS', 50, { bold: true, gap: 170 }],
			['Sauternes', 64, { gap: 90 }],
			['2015', 56, { gap: 110 }],
			['Appellation Sauternes Contrôlée', 24, { gap: 150 }],
			['13,5% vol    375 ml', 26, { gap: 60 }]
		]),
		expect: {
			vintage: 2015,
			alcohol: 13.5,
			size_ml: 375,
			country: 'FR',
			region: 'Sauternes',
			color: 'sweet',
			name: 'Château Les Tilleuls',
			producerHas: 'Tilleuls'
		}
	},
	blauburgunder: {
		svg: label(
			[
				['Weingut Zum Sternen', 36, { gap: 150, family: 'Helvetica, Arial, sans-serif' }],
				['Blauburgunder', 84, { gap: 100 }],
				['Bündner Herrschaft AOC', 38, { gap: 60 }],
				['2022', 56, { gap: 110 }],
				['Schweizer Rotwein', 30, { gap: 160 }],
				['13% vol    75 cl', 26, { gap: 60, family: 'Helvetica, Arial, sans-serif' }]
			],
			{ bg: '#ffffff' }
		),
		expect: {
			vintage: 2022,
			alcohol: 13,
			size_ml: 750,
			country: 'CH',
			grapes: ['Pinot Noir'],
			color: 'red',
			name: 'Blauburgunder',
			producerHas: 'Sternen'
		}
	},
	gruner: {
		svg: label([
			['WEINGUT BERGER', 36, { spacing: 3, gap: 150 }],
			['Grüner Veltliner', 76, { gap: 100 }],
			['Kamptal DAC', 44, { gap: 70 }],
			['2023', 56, { gap: 110 }],
			['Österreich', 30, { gap: 160 }],
			['12,5% vol    750 ml', 26, { gap: 60 }]
		]),
		expect: {
			vintage: 2023,
			alcohol: 12.5,
			size_ml: 750,
			country: 'AT',
			region: 'Kamptal',
			grapes: ['Grüner Veltliner'],
			color: 'white',
			name: 'Grüner Veltliner',
			producerHas: 'Berger'
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
	},
	napa: {
		svg: label(
			[
				['STAG RIDGE', 84, { bold: true, spacing: 4, gap: 170, family: 'Helvetica, Arial, sans-serif' }],
				['2019', 48, { gap: 80 }],
				['Cabernet Sauvignon', 50, { gap: 70 }],
				['NAPA VALLEY', 34, { spacing: 6, gap: 60 }],
				['Produced and bottled by Stag Ridge Cellars, St. Helena, CA', 20, { gap: 260 }],
				['Alc. 14.5% by vol.    750 ml', 24, { gap: 40, family: 'Helvetica, Arial, sans-serif' }]
			],
			{ bg: '#ffffff', ink: '#111111' }
		),
		expect: {
			vintage: 2019,
			alcohol: 14.5,
			size_ml: 750,
			country: 'US',
			region: 'Napa Valley',
			grapes: ['Cabernet Sauvignon'],
			color: 'red',
			name: 'Stag Ridge'
		}
	},
	marlborough: {
		svg: label(
			[
				['Kowhai Bay', 90, { bold: true, gap: 180, family: 'Helvetica, Arial, sans-serif' }],
				['MARLBOROUGH', 32, { spacing: 8, gap: 80, family: 'Helvetica, Arial, sans-serif' }],
				['Sauvignon Blanc', 54, { gap: 90 }],
				['2024', 44, { gap: 70 }],
				['Wine of New Zealand', 26, { gap: 300 }],
				['13% vol    750ml', 24, { gap: 40, family: 'Helvetica, Arial, sans-serif' }]
			],
			{ bg: '#eef3ef', ink: '#1b3a2f' }
		),
		expect: {
			vintage: 2024,
			alcohol: 13,
			size_ml: 750,
			country: 'NZ',
			region: 'Marlborough',
			grapes: ['Sauvignon Blanc'],
			color: 'white',
			name: 'Kowhai Bay'
		}
	},
	alsace: {
		svg: label([
			['DOMAINE WEINBACH-KLEIN', 30, { spacing: 3, gap: 150 }],
			['Gewurztraminer', 76, { bold: true, gap: 100 }],
			['ALSACE', 40, { spacing: 8, gap: 70 }],
			['Appellation Alsace Contrôlée', 26, { gap: 40 }],
			['2021', 54, { gap: 110 }],
			['Mis en bouteille à la propriété', 24, { gap: 180 }],
			['13,5% vol.    75 cl    Produit de France', 24, { gap: 50 }]
		]),
		expect: {
			vintage: 2021,
			alcohol: 13.5,
			size_ml: 750,
			country: 'FR',
			region: 'Alsace',
			grapes: ['Gewürztraminer'],
			color: 'white',
			name: 'Gewurztraminer',
			producerHas: 'Weinbach'
		}
	},
	mendoza: {
		svg: label(
			[
				['FINCA LOS ANDES', 30, { spacing: 5, gap: 160, family: 'Helvetica, Arial, sans-serif' }],
				['Cumbre Alta', 92, { bold: true, gap: 100 }],
				['MALBEC', 46, { spacing: 10, gap: 80 }],
				['2020', 52, { gap: 90 }],
				['Valle de Uco · Mendoza', 30, { gap: 70 }],
				['Hecho en Argentina', 24, { gap: 220 }],
				['14,5% vol.    750 ml', 24, { gap: 40, family: 'Helvetica, Arial, sans-serif' }]
			],
			{ bg: '#1e1b2e', ink: '#d9c9a3' }
		),
		expect: {
			vintage: 2020,
			alcohol: 14.5,
			size_ml: 750,
			country: 'AR',
			region: 'Mendoza',
			grapes: ['Malbec'],
			color: 'red',
			name: 'Cumbre Alta',
			producerHas: 'Andes'
		}
	}
};
