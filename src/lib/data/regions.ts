import type { Region } from './types';

export const regions: Region[] = [
	// ── Switzerland ────────────────────────────────────────────────────
	{
		name: 'Valais',
		at: [46.23, 7.36],
		synonyms: ['Wallis', 'Vallese'],
		country: 'CH',
		grapes: [
			'Chasselas',
			'Pinot Noir',
			'Gamay',
			'Petite Arvine',
			'Cornalin',
			'Humagne Rouge',
			'Syrah',
			'Savagnin',
			'Marsanne',
			'Silvaner',
			'Diolinoir'
		]
	},
	{
		name: 'Vaud',
		at: [46.55, 6.6],
		synonyms: ['Waadt', 'Waadtland'],
		country: 'CH',
		grapes: ['Chasselas', 'Pinot Noir', 'Gamay', 'Gamaret', 'Garanoir']
	},
	{
		name: 'Lavaux',
		at: [46.49, 6.73],
		synonyms: ['Dézaley', 'Epesses', 'Saint-Saphorin', 'St-Saphorin', 'Calamin'],
		country: 'CH',
		grapes: ['Chasselas'],
		color: 'white'
	},
	{
		name: 'La Côte',
		at: [46.47, 6.35],
		synonyms: [],
		country: 'CH',
		grapes: ['Chasselas', 'Pinot Noir', 'Gamay', 'Gamaret']
	},
	{
		name: 'Chablais',
		at: [46.32, 6.97],
		synonyms: ['Aigle', 'Yvorne'],
		country: 'CH',
		grapes: ['Chasselas', 'Pinot Noir']
	},
	{
		name: 'Genève',
		at: [46.2, 6.05],
		synonyms: ['Geneva', 'Genf', 'Ginevra'],
		country: 'CH',
		grapes: ['Chasselas', 'Gamay', 'Pinot Noir', 'Gamaret', 'Garanoir']
	},
	{
		name: 'Ticino',
		at: [46.2, 8.95],
		synonyms: ['Tessin'],
		country: 'CH',
		grapes: ['Merlot']
	},
	{
		name: 'Neuchâtel',
		at: [46.98, 6.85],
		synonyms: ['Neuenburg'],
		country: 'CH',
		grapes: ['Chasselas', 'Pinot Noir', 'Pinot Gris', 'Chardonnay']
	},
	{
		name: 'Bündner Herrschaft',
		at: [47.01, 9.53],
		synonyms: ['Graubünden', 'Grisons', 'Grigioni', 'Maienfeld', 'Malans', 'Jenins', 'Fläsch'],
		country: 'CH',
		grapes: ['Pinot Noir', 'Completer', 'Müller-Thurgau', 'Chardonnay', 'Pinot Blanc']
	},
	{
		name: 'Zürich',
		at: [47.45, 8.65],
		synonyms: ['Zürichsee', 'Zurigo'],
		country: 'CH',
		grapes: ['Pinot Noir', 'Müller-Thurgau', 'Räuschling']
	},
	{
		name: 'Schaffhausen',
		at: [47.68, 8.55],
		synonyms: ['Schaffhouse', 'Sciaffusa'],
		country: 'CH',
		grapes: ['Pinot Noir', 'Müller-Thurgau']
	},
	{
		name: 'Aargau',
		at: [47.45, 8.15],
		synonyms: ['Argovie', 'Argovia'],
		country: 'CH',
		grapes: ['Pinot Noir', 'Müller-Thurgau']
	},
	{
		name: 'Bielersee',
		at: [47.1, 7.17],
		synonyms: ['Lac de Bienne'],
		country: 'CH',
		grapes: ['Chasselas', 'Pinot Noir']
	},
	{
		name: 'Thurgau',
		at: [47.6, 9.0],
		synonyms: ['Thurgovie', 'Turgovia'],
		country: 'CH',
		grapes: ['Müller-Thurgau', 'Pinot Noir']
	},

	// ── France ─────────────────────────────────────────────────────────
	{
		name: 'Bordeaux',
		at: [44.84, -0.58],
		synonyms: ['Bordeaux Supérieur'],
		country: 'FR',
		grapes: [
			'Merlot',
			'Cabernet Sauvignon',
			'Cabernet Franc',
			'Petit Verdot',
			'Malbec',
			'Sauvignon Blanc',
			'Sémillon'
		],
		age: [4, 15]
	},
	{
		name: 'Médoc',
		at: [45.15, -0.8],
		synonyms: [
			'Haut-Médoc',
			'Pauillac',
			'Margaux',
			'Saint-Julien',
			'St-Julien',
			'Saint-Estèphe',
			'St-Estèphe'
		],
		country: 'FR',
		grapes: ['Cabernet Sauvignon', 'Merlot', 'Cabernet Franc', 'Petit Verdot'],
		age: [6, 25],
		color: 'red'
	},
	{
		name: 'Saint-Émilion',
		at: [44.89, -0.16],
		synonyms: ['St-Émilion', 'St. Émilion'],
		country: 'FR',
		grapes: ['Merlot', 'Cabernet Franc'],
		age: [5, 20],
		color: 'red'
	},
	{
		name: 'Pomerol',
		at: [44.93, -0.2],
		synonyms: [],
		country: 'FR',
		grapes: ['Merlot', 'Cabernet Franc'],
		age: [5, 20],
		color: 'red'
	},
	{
		name: 'Graves',
		at: [44.65, -0.45],
		synonyms: ['Pessac-Léognan'],
		country: 'FR',
		grapes: ['Cabernet Sauvignon', 'Merlot', 'Sauvignon Blanc', 'Sémillon'],
		age: [5, 20]
	},
	{
		name: 'Sauternes',
		at: [44.53, -0.34],
		synonyms: ['Barsac'],
		country: 'FR',
		grapes: ['Sémillon', 'Sauvignon Blanc'],
		age: [5, 30],
		color: 'sweet'
	},
	{
		name: 'Burgundy',
		at: [47.05, 4.8],
		synonyms: ['Bourgogne', 'Burgund', 'Borgogna', 'Borgoña', "Côte d'Or", 'Côte de Nuits', 'Côte de Beaune'],
		country: 'FR',
		grapes: ['Pinot Noir', 'Chardonnay']
	},
	{
		name: 'Chablis',
		at: [47.81, 3.8],
		synonyms: [],
		country: 'FR',
		grapes: ['Chardonnay'],
		color: 'white'
	},
	{
		name: 'Beaujolais',
		at: [46.1, 4.6],
		synonyms: ['Morgon', 'Fleurie', 'Moulin-à-Vent', 'Brouilly'],
		country: 'FR',
		grapes: ['Gamay'],
		color: 'red'
	},
	{
		name: 'Champagne',
		at: [49.05, 4.0],
		synonyms: ['Champagner'],
		country: 'FR',
		grapes: ['Chardonnay', 'Pinot Noir', 'Pinot Meunier'],
		age: [1, 8],
		color: 'sparkling'
	},
	{
		name: 'Alsace',
		at: [48.1, 7.3],
		synonyms: ['Elsass', 'Alsazia', 'Alsacia'],
		country: 'FR',
		grapes: ['Riesling', 'Gewürztraminer', 'Pinot Gris', 'Pinot Blanc', 'Muscat', 'Silvaner'],
		color: 'white'
	},
	{
		name: 'Loire',
		at: [47.35, 0.3],
		synonyms: ['Loire Valley', 'Val de Loire', 'Vallée de la Loire', 'Loiretal'],
		country: 'FR',
		grapes: ['Chenin Blanc', 'Sauvignon Blanc', 'Cabernet Franc', 'Melon de Bourgogne']
	},
	{
		name: 'Sancerre',
		at: [47.33, 2.84],
		synonyms: [],
		country: 'FR',
		grapes: ['Sauvignon Blanc'],
		color: 'white'
	},
	{
		name: 'Pouilly-Fumé',
		at: [47.29, 2.96],
		synonyms: ['Pouilly Fumé', 'Blanc Fumé de Pouilly'],
		country: 'FR',
		grapes: ['Sauvignon Blanc'],
		color: 'white'
	},
	{
		name: 'Vouvray',
		at: [47.41, 0.8],
		synonyms: [],
		country: 'FR',
		grapes: ['Chenin Blanc'],
		color: 'white'
	},
	{
		name: 'Rhône',
		at: [44.5, 4.8],
		synonyms: ['Côtes du Rhône', 'Rhône Valley', 'Vallée du Rhône', 'Rhonetal'],
		country: 'FR',
		grapes: ['Syrah', 'Grenache', 'Mourvèdre', 'Cinsault', 'Viognier', 'Marsanne', 'Roussanne']
	},
	{
		name: 'Châteauneuf-du-Pape',
		at: [44.06, 4.83],
		synonyms: ['Châteauneuf du Pape'],
		country: 'FR',
		grapes: ['Grenache', 'Syrah', 'Mourvèdre', 'Cinsault'],
		age: [4, 15],
		color: 'red'
	},
	{
		name: 'Côte-Rôtie',
		at: [45.48, 4.8],
		synonyms: ['Côte Rôtie'],
		country: 'FR',
		grapes: ['Syrah', 'Viognier'],
		age: [5, 20],
		color: 'red'
	},
	{
		name: 'Provence',
		at: [43.45, 6.0],
		synonyms: ['Côtes de Provence', 'Provenza'],
		country: 'FR',
		grapes: ['Grenache', 'Cinsault', 'Syrah', 'Mourvèdre'],
		color: 'rose'
	},
	{
		name: 'Languedoc',
		at: [43.4, 3.2],
		synonyms: ['Languedoc-Roussillon', 'Roussillon'],
		country: 'FR',
		grapes: ['Grenache', 'Syrah', 'Carignan', 'Mourvèdre', 'Cinsault']
	},
	{
		name: 'Cahors',
		at: [44.45, 1.44],
		synonyms: [],
		country: 'FR',
		grapes: ['Malbec'],
		color: 'red'
	},

	// ── Italy ──────────────────────────────────────────────────────────
	{
		name: 'Piemonte',
		at: [44.75, 8.1],
		synonyms: ['Piedmont', 'Piemont', 'Langhe'],
		country: 'IT',
		grapes: ['Nebbiolo', 'Barbera', 'Dolcetto', 'Muscat']
	},
	{
		name: 'Barolo',
		at: [44.61, 7.94],
		synonyms: [],
		country: 'IT',
		grapes: ['Nebbiolo'],
		age: [8, 25],
		color: 'red'
	},
	{
		name: 'Barbaresco',
		at: [44.72, 8.08],
		synonyms: [],
		country: 'IT',
		grapes: ['Nebbiolo'],
		age: [6, 20],
		color: 'red'
	},
	{
		name: 'Toscana',
		at: [43.4, 11.1],
		synonyms: ['Tuscany', 'Toskana', 'Toscane'],
		country: 'IT',
		grapes: ['Sangiovese', 'Cabernet Sauvignon', 'Merlot', 'Trebbiano']
	},
	{
		name: 'Chianti',
		at: [43.55, 11.2],
		synonyms: [],
		country: 'IT',
		grapes: ['Sangiovese'],
		color: 'red'
	},
	{
		name: 'Chianti Classico',
		at: [43.52, 11.33],
		synonyms: [],
		country: 'IT',
		grapes: ['Sangiovese'],
		color: 'red'
	},
	{
		name: 'Brunello di Montalcino',
		at: [43.06, 11.49],
		synonyms: ['Montalcino'],
		country: 'IT',
		grapes: ['Sangiovese'],
		age: [6, 25],
		color: 'red'
	},
	{
		name: 'Vino Nobile di Montepulciano',
		at: [43.09, 11.78],
		synonyms: ['Vino Nobile'],
		country: 'IT',
		grapes: ['Sangiovese'],
		age: [4, 15],
		color: 'red'
	},
	{
		name: 'Bolgheri',
		at: [43.23, 10.61],
		synonyms: [],
		country: 'IT',
		grapes: ['Cabernet Sauvignon', 'Merlot', 'Cabernet Franc'],
		age: [5, 20],
		color: 'red'
	},
	{
		name: 'Valpolicella',
		at: [45.53, 10.9],
		synonyms: ['Ripasso', 'Valpolicella Ripasso'],
		country: 'IT',
		grapes: ['Corvina'],
		color: 'red'
	},
	{
		name: 'Amarone',
		at: [45.55, 10.88],
		synonyms: ['Amarone della Valpolicella'],
		country: 'IT',
		grapes: ['Corvina'],
		age: [5, 20],
		color: 'red'
	},
	{
		name: 'Soave',
		at: [45.42, 11.25],
		synonyms: [],
		country: 'IT',
		grapes: ['Garganega'],
		color: 'white'
	},
	{
		name: 'Prosecco',
		at: [45.88, 12.1],
		synonyms: ['Conegliano Valdobbiadene', 'Valdobbiadene'],
		country: 'IT',
		grapes: ['Glera'],
		color: 'sparkling'
	},
	{
		name: 'Franciacorta',
		at: [45.62, 10.0],
		synonyms: [],
		country: 'IT',
		grapes: ['Chardonnay', 'Pinot Noir', 'Pinot Blanc'],
		age: [1, 8],
		color: 'sparkling'
	},
	{
		name: 'Alto Adige',
		at: [46.5, 11.35],
		synonyms: ['Südtirol', 'South Tyrol', 'Haut-Adige'],
		country: 'IT',
		grapes: [
			'Pinot Gris',
			'Gewürztraminer',
			'Pinot Blanc',
			'Lagrein',
			'Pinot Noir',
			'Chardonnay',
			'Sauvignon Blanc'
		]
	},
	{
		name: 'Abruzzo',
		at: [42.3, 14.0],
		synonyms: ['Abruzzen', 'Abruzzes', 'Abruzos'],
		country: 'IT',
		grapes: ['Montepulciano', 'Trebbiano']
	},
	{
		name: 'Campania',
		at: [41.0, 14.8],
		synonyms: ['Kampanien', 'Campanie', 'Taurasi'],
		country: 'IT',
		grapes: ['Aglianico']
	},
	{
		name: 'Puglia',
		at: [40.6, 17.3],
		synonyms: ['Apulia', 'Apulien', 'Pouilles'],
		country: 'IT',
		grapes: ['Zinfandel', 'Negroamaro']
	},
	{
		name: 'Etna',
		at: [37.75, 15.0],
		synonyms: [],
		country: 'IT',
		grapes: ['Nerello Mascalese', 'Carricante']
	},
	{
		name: 'Sicilia',
		at: [37.6, 14.0],
		synonyms: ['Sicily', 'Sizilien', 'Sicile'],
		country: 'IT',
		grapes: ["Nero d'Avola", 'Nerello Mascalese', 'Grillo', 'Carricante', 'Syrah']
	},
	{
		name: 'Sardegna',
		at: [40.1, 9.0],
		synonyms: ['Sardinia', 'Sardinien', 'Sardaigne', 'Cerdeña'],
		country: 'IT',
		grapes: ['Grenache', 'Vermentino', 'Carignan']
	},

	// ── Spain ──────────────────────────────────────────────────────────
	{
		name: 'Rioja',
		at: [42.45, -2.45],
		synonyms: ['La Rioja', 'Rioja Alta', 'Rioja Alavesa'],
		country: 'ES',
		grapes: ['Tempranillo', 'Grenache', 'Carignan', 'Macabeo'],
		age: [3, 15]
	},
	{
		name: 'Ribera del Duero',
		at: [41.65, -3.7],
		synonyms: [],
		country: 'ES',
		grapes: ['Tempranillo'],
		age: [4, 15],
		color: 'red'
	},
	{
		name: 'Priorat',
		at: [41.2, 0.8],
		synonyms: ['Priorato'],
		country: 'ES',
		grapes: ['Grenache', 'Carignan', 'Syrah', 'Cabernet Sauvignon'],
		age: [5, 20],
		color: 'red'
	},
	{
		name: 'Toro',
		at: [41.52, -5.4],
		synonyms: [],
		country: 'ES',
		grapes: ['Tempranillo'],
		age: [3, 12],
		color: 'red'
	},
	{
		name: 'Bierzo',
		at: [42.6, -6.7],
		synonyms: [],
		country: 'ES',
		grapes: ['Mencía', 'Godello']
	},
	{
		name: 'Jumilla',
		at: [38.47, -1.33],
		synonyms: [],
		country: 'ES',
		grapes: ['Mourvèdre'],
		color: 'red'
	},
	{
		name: 'Rías Baixas',
		at: [42.4, -8.7],
		synonyms: [],
		country: 'ES',
		grapes: ['Albariño'],
		color: 'white'
	},
	{
		name: 'Rueda',
		at: [41.4, -4.95],
		synonyms: [],
		country: 'ES',
		grapes: ['Verdejo', 'Sauvignon Blanc'],
		color: 'white'
	},
	{
		name: 'Penedès',
		at: [41.35, 1.7],
		synonyms: [],
		country: 'ES',
		grapes: ['Xarel·lo', 'Macabeo', 'Parellada', 'Tempranillo', 'Cabernet Sauvignon']
	},
	{
		name: 'Cava',
		at: [41.42, 1.82],
		synonyms: [],
		country: 'ES',
		grapes: ['Macabeo', 'Xarel·lo', 'Parellada', 'Chardonnay'],
		color: 'sparkling'
	},
	{
		name: 'Jerez',
		at: [36.68, -6.13],
		synonyms: ['Sherry', 'Xérès', 'Jerez-Xérès-Sherry', 'Manzanilla', 'Sanlúcar de Barrameda'],
		country: 'ES',
		grapes: ['Palomino'],
		color: 'fortified'
	},

	// ── Portugal ───────────────────────────────────────────────────────
	{
		name: 'Douro',
		at: [41.16, -7.5],
		synonyms: ['Duero'],
		country: 'PT',
		grapes: ['Touriga Nacional', 'Touriga Franca', 'Tempranillo']
	},
	{
		name: 'Porto',
		at: [41.13, -8.61],
		synonyms: ['Port', 'Oporto', 'Portwein', 'Vinho do Porto', 'Port Wine'],
		country: 'PT',
		grapes: ['Touriga Nacional', 'Touriga Franca', 'Tempranillo'],
		age: [5, 30],
		color: 'fortified'
	},
	{
		name: 'Vinho Verde',
		at: [41.7, -8.4],
		synonyms: [],
		country: 'PT',
		grapes: ['Loureiro', 'Albariño'],
		color: 'white'
	},
	{
		name: 'Dão',
		at: [40.55, -7.9],
		synonyms: [],
		country: 'PT',
		grapes: ['Touriga Nacional'],
		color: 'red'
	},
	{
		name: 'Alentejo',
		at: [38.6, -7.9],
		synonyms: ['Alentejano'],
		country: 'PT',
		grapes: ['Tempranillo', 'Touriga Nacional', 'Syrah']
	},

	// ── Germany ────────────────────────────────────────────────────────
	{
		name: 'Mosel',
		at: [49.9, 6.95],
		synonyms: ['Mosel-Saar-Ruwer', 'Moselle', 'Saar', 'Ruwer'],
		country: 'DE',
		grapes: ['Riesling'],
		age: [2, 20],
		color: 'white'
	},
	{
		name: 'Rheingau',
		at: [50.0, 8.0],
		synonyms: [],
		country: 'DE',
		grapes: ['Riesling', 'Pinot Noir'],
		age: [2, 20]
	},
	{
		name: 'Nahe',
		at: [49.8, 7.75],
		synonyms: [],
		country: 'DE',
		grapes: ['Riesling', 'Silvaner', 'Müller-Thurgau']
	},
	{
		name: 'Pfalz',
		at: [49.3, 8.15],
		synonyms: ['Palatinate', 'Palatinat'],
		country: 'DE',
		grapes: ['Riesling', 'Pinot Noir', 'Pinot Gris', 'Pinot Blanc', 'Dornfelder']
	},
	{
		name: 'Rheinhessen',
		at: [49.85, 8.2],
		synonyms: ['Rhinehessen', 'Hesse rhénane'],
		country: 'DE',
		grapes: ['Riesling', 'Silvaner', 'Müller-Thurgau', 'Dornfelder', 'Pinot Noir']
	},
	{
		name: 'Baden',
		at: [48.2, 7.8],
		synonyms: ['Kaiserstuhl', 'Markgräflerland'],
		country: 'DE',
		grapes: ['Pinot Noir', 'Pinot Gris', 'Pinot Blanc', 'Müller-Thurgau', 'Chasselas']
	},
	{
		name: 'Franken',
		at: [49.8, 10.1],
		synonyms: ['Franconia', 'Franconie'],
		country: 'DE',
		grapes: ['Silvaner', 'Müller-Thurgau', 'Riesling'],
		color: 'white'
	},
	{
		name: 'Württemberg',
		at: [49.0, 9.2],
		synonyms: [],
		country: 'DE',
		grapes: ['Blaufränkisch', 'Pinot Meunier', 'Riesling', 'Pinot Noir']
	},
	{
		name: 'Ahr',
		at: [50.53, 7.05],
		synonyms: [],
		country: 'DE',
		grapes: ['Pinot Noir'],
		color: 'red'
	},

	// ── Austria ────────────────────────────────────────────────────────
	{
		name: 'Wachau',
		at: [48.38, 15.42],
		synonyms: [],
		country: 'AT',
		grapes: ['Grüner Veltliner', 'Riesling'],
		color: 'white'
	},
	{
		name: 'Kamptal',
		at: [48.48, 15.65],
		synonyms: [],
		country: 'AT',
		grapes: ['Grüner Veltliner', 'Riesling'],
		color: 'white'
	},
	{
		name: 'Weinviertel',
		at: [48.6, 16.3],
		synonyms: [],
		country: 'AT',
		grapes: ['Grüner Veltliner'],
		color: 'white'
	},
	{
		name: 'Burgenland',
		at: [47.7, 16.7],
		synonyms: ['Neusiedlersee', 'Mittelburgenland'],
		country: 'AT',
		grapes: ['Blaufränkisch', 'Zweigelt', 'Saint Laurent']
	},
	{
		name: 'Steiermark',
		at: [46.7, 15.5],
		synonyms: ['Styria', 'Südsteiermark', 'Styrie'],
		country: 'AT',
		grapes: ['Sauvignon Blanc', 'Chardonnay', 'Muscat'],
		color: 'white'
	},

	// ── Hungary, Greece, Georgia, Lebanon ──────────────────────────────
	{
		name: 'Tokaj',
		at: [48.12, 21.4],
		synonyms: ['Tokaji', 'Tokay', 'Tokaj-Hegyalja'],
		country: 'HU',
		grapes: ['Furmint', 'Hárslevelű', 'Muscat'],
		age: [3, 30],
		color: 'sweet'
	},
	{
		name: 'Santorini',
		at: [36.4, 25.43],
		synonyms: [],
		country: 'GR',
		grapes: ['Assyrtiko'],
		color: 'white'
	},
	{
		name: 'Naoussa',
		at: [40.63, 22.07],
		synonyms: ['Naousa'],
		country: 'GR',
		grapes: ['Xinomavro'],
		color: 'red'
	},
	{
		name: 'Kakheti',
		at: [41.9, 45.7],
		synonyms: ['Kachetien', 'Kakhétie'],
		country: 'GE',
		grapes: ['Saperavi']
	},
	{
		name: 'Bekaa Valley',
		at: [33.85, 35.9],
		synonyms: ['Bekaa', 'Beqaa'],
		country: 'LB',
		grapes: ['Cabernet Sauvignon', 'Cinsault', 'Syrah', 'Carignan']
	},

	// ── United States ──────────────────────────────────────────────────
	{
		name: 'California',
		at: [37.5, -120.5],
		synonyms: ['Kalifornien', 'Californie'],
		country: 'US',
		grapes: ['Cabernet Sauvignon', 'Chardonnay', 'Zinfandel', 'Pinot Noir', 'Merlot']
	},
	{
		name: 'Napa Valley',
		at: [38.4, -122.35],
		synonyms: ['Napa'],
		country: 'US',
		grapes: ['Cabernet Sauvignon', 'Merlot', 'Chardonnay', 'Sauvignon Blanc']
	},
	{
		name: 'Sonoma',
		at: [38.45, -122.8],
		synonyms: ['Sonoma County', 'Sonoma Coast', 'Russian River Valley'],
		country: 'US',
		grapes: ['Pinot Noir', 'Chardonnay', 'Zinfandel', 'Cabernet Sauvignon']
	},
	{
		name: 'Willamette Valley',
		at: [45.0, -123.1],
		synonyms: ['Willamette'],
		country: 'US',
		grapes: ['Pinot Noir', 'Pinot Gris', 'Chardonnay']
	},

	// ── South America ──────────────────────────────────────────────────
	{
		name: 'Mendoza',
		at: [-33.0, -68.8],
		synonyms: ['Luján de Cuyo', 'Valle de Uco', 'Uco Valley'],
		country: 'AR',
		grapes: ['Malbec', 'Cabernet Sauvignon', 'Chardonnay']
	},
	{
		name: 'Salta',
		at: [-26.0, -65.97],
		synonyms: ['Cafayate'],
		country: 'AR',
		grapes: ['Torrontés', 'Malbec']
	},
	{
		name: 'Maipo',
		at: [-33.7, -70.6],
		synonyms: ['Maipo Valley', 'Valle del Maipo'],
		country: 'CL',
		grapes: ['Cabernet Sauvignon', 'Carménère', 'Merlot']
	},
	{
		name: 'Colchagua',
		at: [-34.65, -71.2],
		synonyms: ['Colchagua Valley', 'Valle de Colchagua'],
		country: 'CL',
		grapes: ['Carménère', 'Cabernet Sauvignon', 'Syrah', 'Malbec']
	},
	{
		name: 'Casablanca',
		at: [-33.3, -71.4],
		synonyms: ['Casablanca Valley', 'Valle de Casablanca'],
		country: 'CL',
		grapes: ['Sauvignon Blanc', 'Chardonnay', 'Pinot Noir']
	},

	// ── Australia & New Zealand ────────────────────────────────────────
	{
		name: 'Barossa',
		at: [-34.53, 138.95],
		synonyms: ['Barossa Valley'],
		country: 'AU',
		grapes: ['Syrah', 'Grenache', 'Mourvèdre', 'Cabernet Sauvignon']
	},
	{
		name: 'McLaren Vale',
		at: [-35.22, 138.55],
		synonyms: [],
		country: 'AU',
		grapes: ['Syrah', 'Grenache', 'Cabernet Sauvignon']
	},
	{
		name: 'Coonawarra',
		at: [-37.3, 140.83],
		synonyms: [],
		country: 'AU',
		grapes: ['Cabernet Sauvignon', 'Syrah'],
		color: 'red'
	},
	{
		name: 'Hunter Valley',
		at: [-32.75, 151.3],
		synonyms: ['Hunter'],
		country: 'AU',
		grapes: ['Sémillon', 'Syrah', 'Chardonnay']
	},
	{
		name: 'Margaret River',
		at: [-33.95, 115.07],
		synonyms: [],
		country: 'AU',
		grapes: ['Cabernet Sauvignon', 'Chardonnay', 'Sauvignon Blanc', 'Sémillon']
	},
	{
		name: 'Marlborough',
		at: [-41.52, 173.9],
		synonyms: [],
		country: 'NZ',
		grapes: ['Sauvignon Blanc', 'Pinot Noir']
	},
	{
		name: "Hawke's Bay",
		at: [-39.6, 176.8],
		synonyms: ['Hawkes Bay'],
		country: 'NZ',
		grapes: ['Syrah', 'Merlot', 'Cabernet Sauvignon', 'Chardonnay']
	},
	{
		name: 'Central Otago',
		at: [-45.03, 169.2],
		synonyms: [],
		country: 'NZ',
		grapes: ['Pinot Noir', 'Pinot Gris', 'Riesling']
	},

	// ── South Africa ───────────────────────────────────────────────────
	{
		name: 'Stellenbosch',
		at: [-33.93, 18.86],
		synonyms: [],
		country: 'ZA',
		grapes: ['Cabernet Sauvignon', 'Pinotage', 'Chenin Blanc', 'Syrah', 'Merlot']
	},
	{
		name: 'Swartland',
		at: [-33.35, 18.75],
		synonyms: [],
		country: 'ZA',
		grapes: ['Chenin Blanc', 'Syrah', 'Grenache']
	}
];
