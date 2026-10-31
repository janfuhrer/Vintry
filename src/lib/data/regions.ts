import type { Region } from './types';

export const regions: Region[] = [
	// ── Switzerland ────────────────────────────────────────────────────
	{
		name: 'Valais',
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
		synonyms: ['Waadt', 'Waadtland'],
		country: 'CH',
		grapes: ['Chasselas', 'Pinot Noir', 'Gamay', 'Gamaret', 'Garanoir']
	},
	{
		name: 'Lavaux',
		synonyms: ['Dézaley', 'Epesses', 'Saint-Saphorin', 'St-Saphorin', 'Calamin'],
		country: 'CH',
		grapes: ['Chasselas'],
		color: 'white'
	},
	{
		name: 'La Côte',
		synonyms: [],
		country: 'CH',
		grapes: ['Chasselas', 'Pinot Noir', 'Gamay', 'Gamaret']
	},
	{
		name: 'Chablais',
		synonyms: ['Aigle', 'Yvorne'],
		country: 'CH',
		grapes: ['Chasselas', 'Pinot Noir']
	},
	{
		name: 'Genève',
		synonyms: ['Geneva', 'Genf', 'Ginevra'],
		country: 'CH',
		grapes: ['Chasselas', 'Gamay', 'Pinot Noir', 'Gamaret', 'Garanoir']
	},
	{
		name: 'Ticino',
		synonyms: ['Tessin'],
		country: 'CH',
		grapes: ['Merlot']
	},
	{
		name: 'Neuchâtel',
		synonyms: ['Neuenburg'],
		country: 'CH',
		grapes: ['Chasselas', 'Pinot Noir', 'Pinot Gris', 'Chardonnay']
	},
	{
		name: 'Bündner Herrschaft',
		synonyms: ['Graubünden', 'Grisons', 'Grigioni', 'Maienfeld', 'Malans', 'Jenins', 'Fläsch'],
		country: 'CH',
		grapes: ['Pinot Noir', 'Completer', 'Müller-Thurgau', 'Chardonnay', 'Pinot Blanc']
	},
	{
		name: 'Zürich',
		synonyms: ['Zürichsee', 'Zurigo'],
		country: 'CH',
		grapes: ['Pinot Noir', 'Müller-Thurgau', 'Räuschling']
	},
	{
		name: 'Schaffhausen',
		synonyms: ['Schaffhouse', 'Sciaffusa'],
		country: 'CH',
		grapes: ['Pinot Noir', 'Müller-Thurgau']
	},
	{
		name: 'Aargau',
		synonyms: ['Argovie', 'Argovia'],
		country: 'CH',
		grapes: ['Pinot Noir', 'Müller-Thurgau']
	},
	{
		name: 'Bielersee',
		synonyms: ['Lac de Bienne'],
		country: 'CH',
		grapes: ['Chasselas', 'Pinot Noir']
	},
	{
		name: 'Thurgau',
		synonyms: ['Thurgovie', 'Turgovia'],
		country: 'CH',
		grapes: ['Müller-Thurgau', 'Pinot Noir']
	},

	// ── France ─────────────────────────────────────────────────────────
	{
		name: 'Bordeaux',
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
		synonyms: ['St-Émilion', 'St. Émilion'],
		country: 'FR',
		grapes: ['Merlot', 'Cabernet Franc'],
		age: [5, 20],
		color: 'red'
	},
	{
		name: 'Pomerol',
		synonyms: [],
		country: 'FR',
		grapes: ['Merlot', 'Cabernet Franc'],
		age: [5, 20],
		color: 'red'
	},
	{
		name: 'Graves',
		synonyms: ['Pessac-Léognan'],
		country: 'FR',
		grapes: ['Cabernet Sauvignon', 'Merlot', 'Sauvignon Blanc', 'Sémillon'],
		age: [5, 20]
	},
	{
		name: 'Sauternes',
		synonyms: ['Barsac'],
		country: 'FR',
		grapes: ['Sémillon', 'Sauvignon Blanc'],
		age: [5, 30],
		color: 'sweet'
	},
	{
		name: 'Burgundy',
		synonyms: ['Bourgogne', 'Burgund', 'Borgogna', 'Borgoña', "Côte d'Or", 'Côte de Nuits', 'Côte de Beaune'],
		country: 'FR',
		grapes: ['Pinot Noir', 'Chardonnay']
	},
	{
		name: 'Chablis',
		synonyms: [],
		country: 'FR',
		grapes: ['Chardonnay'],
		color: 'white'
	},
	{
		name: 'Beaujolais',
		synonyms: ['Morgon', 'Fleurie', 'Moulin-à-Vent', 'Brouilly'],
		country: 'FR',
		grapes: ['Gamay'],
		color: 'red'
	},
	{
		name: 'Champagne',
		synonyms: ['Champagner'],
		country: 'FR',
		grapes: ['Chardonnay', 'Pinot Noir', 'Pinot Meunier'],
		age: [1, 8],
		color: 'sparkling'
	},
	{
		name: 'Alsace',
		synonyms: ['Elsass', 'Alsazia', 'Alsacia'],
		country: 'FR',
		grapes: ['Riesling', 'Gewürztraminer', 'Pinot Gris', 'Pinot Blanc', 'Muscat', 'Silvaner'],
		color: 'white'
	},
	{
		name: 'Loire',
		synonyms: ['Loire Valley', 'Val de Loire', 'Vallée de la Loire', 'Loiretal'],
		country: 'FR',
		grapes: ['Chenin Blanc', 'Sauvignon Blanc', 'Cabernet Franc', 'Melon de Bourgogne']
	},
	{
		name: 'Sancerre',
		synonyms: [],
		country: 'FR',
		grapes: ['Sauvignon Blanc'],
		color: 'white'
	},
	{
		name: 'Pouilly-Fumé',
		synonyms: ['Pouilly Fumé', 'Blanc Fumé de Pouilly'],
		country: 'FR',
		grapes: ['Sauvignon Blanc'],
		color: 'white'
	},
	{
		name: 'Vouvray',
		synonyms: [],
		country: 'FR',
		grapes: ['Chenin Blanc'],
		color: 'white'
	},
	{
		name: 'Rhône',
		synonyms: ['Côtes du Rhône', 'Rhône Valley', 'Vallée du Rhône', 'Rhonetal'],
		country: 'FR',
		grapes: ['Syrah', 'Grenache', 'Mourvèdre', 'Cinsault', 'Viognier', 'Marsanne', 'Roussanne']
	},
	{
		name: 'Châteauneuf-du-Pape',
		synonyms: ['Châteauneuf du Pape'],
		country: 'FR',
		grapes: ['Grenache', 'Syrah', 'Mourvèdre', 'Cinsault'],
		age: [4, 15],
		color: 'red'
	},
	{
		name: 'Côte-Rôtie',
		synonyms: ['Côte Rôtie'],
		country: 'FR',
		grapes: ['Syrah', 'Viognier'],
		age: [5, 20],
		color: 'red'
	},
	{
		name: 'Provence',
		synonyms: ['Côtes de Provence', 'Provenza'],
		country: 'FR',
		grapes: ['Grenache', 'Cinsault', 'Syrah', 'Mourvèdre'],
		color: 'rose'
	},
	{
		name: 'Languedoc',
		synonyms: ['Languedoc-Roussillon', 'Roussillon'],
		country: 'FR',
		grapes: ['Grenache', 'Syrah', 'Carignan', 'Mourvèdre', 'Cinsault']
	},
	{
		name: 'Cahors',
		synonyms: [],
		country: 'FR',
		grapes: ['Malbec'],
		color: 'red'
	},

	// ── Italy ──────────────────────────────────────────────────────────
	{
		name: 'Piemonte',
		synonyms: ['Piedmont', 'Piemont', 'Langhe'],
		country: 'IT',
		grapes: ['Nebbiolo', 'Barbera', 'Dolcetto', 'Muscat']
	},
	{
		name: 'Barolo',
		synonyms: [],
		country: 'IT',
		grapes: ['Nebbiolo'],
		age: [8, 25],
		color: 'red'
	},
	{
		name: 'Barbaresco',
		synonyms: [],
		country: 'IT',
		grapes: ['Nebbiolo'],
		age: [6, 20],
		color: 'red'
	},
	{
		name: 'Toscana',
		synonyms: ['Tuscany', 'Toskana', 'Toscane'],
		country: 'IT',
		grapes: ['Sangiovese', 'Cabernet Sauvignon', 'Merlot', 'Trebbiano']
	},
	{
		name: 'Chianti',
		synonyms: [],
		country: 'IT',
		grapes: ['Sangiovese'],
		color: 'red'
	},
	{
		name: 'Chianti Classico',
		synonyms: [],
		country: 'IT',
		grapes: ['Sangiovese'],
		color: 'red'
	},
	{
		name: 'Brunello di Montalcino',
		synonyms: ['Montalcino'],
		country: 'IT',
		grapes: ['Sangiovese'],
		age: [6, 25],
		color: 'red'
	},
	{
		name: 'Vino Nobile di Montepulciano',
		synonyms: ['Vino Nobile'],
		country: 'IT',
		grapes: ['Sangiovese'],
		age: [4, 15],
		color: 'red'
	},
	{
		name: 'Bolgheri',
		synonyms: [],
		country: 'IT',
		grapes: ['Cabernet Sauvignon', 'Merlot', 'Cabernet Franc'],
		age: [5, 20],
		color: 'red'
	},
	{
		name: 'Valpolicella',
		synonyms: ['Ripasso', 'Valpolicella Ripasso'],
		country: 'IT',
		grapes: ['Corvina'],
		color: 'red'
	},
	{
		name: 'Amarone',
		synonyms: ['Amarone della Valpolicella'],
		country: 'IT',
		grapes: ['Corvina'],
		age: [5, 20],
		color: 'red'
	},
	{
		name: 'Soave',
		synonyms: [],
		country: 'IT',
		grapes: ['Garganega'],
		color: 'white'
	},
	{
		name: 'Prosecco',
		synonyms: ['Conegliano Valdobbiadene', 'Valdobbiadene'],
		country: 'IT',
		grapes: ['Glera'],
		color: 'sparkling'
	},
	{
		name: 'Franciacorta',
		synonyms: [],
		country: 'IT',
		grapes: ['Chardonnay', 'Pinot Noir', 'Pinot Blanc'],
		age: [1, 8],
		color: 'sparkling'
	},
	{
		name: 'Alto Adige',
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
		synonyms: ['Abruzzen', 'Abruzzes', 'Abruzos'],
		country: 'IT',
		grapes: ['Montepulciano', 'Trebbiano']
	},
	{
		name: 'Campania',
		synonyms: ['Kampanien', 'Campanie', 'Taurasi'],
		country: 'IT',
		grapes: ['Aglianico']
	},
	{
		name: 'Puglia',
		synonyms: ['Apulia', 'Apulien', 'Pouilles'],
		country: 'IT',
		grapes: ['Zinfandel', 'Negroamaro']
	},
	{
		name: 'Etna',
		synonyms: [],
		country: 'IT',
		grapes: ['Nerello Mascalese', 'Carricante']
	},
	{
		name: 'Sicilia',
		synonyms: ['Sicily', 'Sizilien', 'Sicile'],
		country: 'IT',
		grapes: ["Nero d'Avola", 'Nerello Mascalese', 'Grillo', 'Carricante', 'Syrah']
	},
	{
		name: 'Sardegna',
		synonyms: ['Sardinia', 'Sardinien', 'Sardaigne', 'Cerdeña'],
		country: 'IT',
		grapes: ['Grenache', 'Vermentino', 'Carignan']
	},

	// ── Spain ──────────────────────────────────────────────────────────
	{
		name: 'Rioja',
		synonyms: ['La Rioja', 'Rioja Alta', 'Rioja Alavesa'],
		country: 'ES',
		grapes: ['Tempranillo', 'Grenache', 'Carignan', 'Macabeo'],
		age: [3, 15]
	},
	{
		name: 'Ribera del Duero',
		synonyms: [],
		country: 'ES',
		grapes: ['Tempranillo'],
		age: [4, 15],
		color: 'red'
	},
	{
		name: 'Priorat',
		synonyms: ['Priorato'],
		country: 'ES',
		grapes: ['Grenache', 'Carignan', 'Syrah', 'Cabernet Sauvignon'],
		age: [5, 20],
		color: 'red'
	},
	{
		name: 'Toro',
		synonyms: [],
		country: 'ES',
		grapes: ['Tempranillo'],
		age: [3, 12],
		color: 'red'
	},
	{
		name: 'Bierzo',
		synonyms: [],
		country: 'ES',
		grapes: ['Mencía', 'Godello']
	},
	{
		name: 'Jumilla',
		synonyms: [],
		country: 'ES',
		grapes: ['Mourvèdre'],
		color: 'red'
	},
	{
		name: 'Rías Baixas',
		synonyms: [],
		country: 'ES',
		grapes: ['Albariño'],
		color: 'white'
	},
	{
		name: 'Rueda',
		synonyms: [],
		country: 'ES',
		grapes: ['Verdejo', 'Sauvignon Blanc'],
		color: 'white'
	},
	{
		name: 'Penedès',
		synonyms: [],
		country: 'ES',
		grapes: ['Xarel·lo', 'Macabeo', 'Parellada', 'Tempranillo', 'Cabernet Sauvignon']
	},
	{
		name: 'Cava',
		synonyms: [],
		country: 'ES',
		grapes: ['Macabeo', 'Xarel·lo', 'Parellada', 'Chardonnay'],
		color: 'sparkling'
	},
	{
		name: 'Jerez',
		synonyms: ['Sherry', 'Xérès', 'Jerez-Xérès-Sherry', 'Manzanilla', 'Sanlúcar de Barrameda'],
		country: 'ES',
		grapes: ['Palomino'],
		color: 'fortified'
	},

	// ── Portugal ───────────────────────────────────────────────────────
	{
		name: 'Douro',
		synonyms: ['Duero'],
		country: 'PT',
		grapes: ['Touriga Nacional', 'Touriga Franca', 'Tempranillo']
	},
	{
		name: 'Porto',
		synonyms: ['Port', 'Oporto', 'Portwein', 'Vinho do Porto', 'Port Wine'],
		country: 'PT',
		grapes: ['Touriga Nacional', 'Touriga Franca', 'Tempranillo'],
		age: [5, 30],
		color: 'fortified'
	},
	{
		name: 'Vinho Verde',
		synonyms: [],
		country: 'PT',
		grapes: ['Loureiro', 'Albariño'],
		color: 'white'
	},
	{
		name: 'Dão',
		synonyms: [],
		country: 'PT',
		grapes: ['Touriga Nacional'],
		color: 'red'
	},
	{
		name: 'Alentejo',
		synonyms: ['Alentejano'],
		country: 'PT',
		grapes: ['Tempranillo', 'Touriga Nacional', 'Syrah']
	},

	// ── Germany ────────────────────────────────────────────────────────
	{
		name: 'Mosel',
		synonyms: ['Mosel-Saar-Ruwer', 'Moselle', 'Saar', 'Ruwer'],
		country: 'DE',
		grapes: ['Riesling'],
		age: [2, 20],
		color: 'white'
	},
	{
		name: 'Rheingau',
		synonyms: [],
		country: 'DE',
		grapes: ['Riesling', 'Pinot Noir'],
		age: [2, 20]
	},
	{
		name: 'Nahe',
		synonyms: [],
		country: 'DE',
		grapes: ['Riesling', 'Silvaner', 'Müller-Thurgau']
	},
	{
		name: 'Pfalz',
		synonyms: ['Palatinate', 'Palatinat'],
		country: 'DE',
		grapes: ['Riesling', 'Pinot Noir', 'Pinot Gris', 'Pinot Blanc', 'Dornfelder']
	},
	{
		name: 'Rheinhessen',
		synonyms: ['Rhinehessen', 'Hesse rhénane'],
		country: 'DE',
		grapes: ['Riesling', 'Silvaner', 'Müller-Thurgau', 'Dornfelder', 'Pinot Noir']
	},
	{
		name: 'Baden',
		synonyms: ['Kaiserstuhl', 'Markgräflerland'],
		country: 'DE',
		grapes: ['Pinot Noir', 'Pinot Gris', 'Pinot Blanc', 'Müller-Thurgau', 'Chasselas']
	},
	{
		name: 'Franken',
		synonyms: ['Franconia', 'Franconie'],
		country: 'DE',
		grapes: ['Silvaner', 'Müller-Thurgau', 'Riesling'],
		color: 'white'
	},
	{
		name: 'Württemberg',
		synonyms: [],
		country: 'DE',
		grapes: ['Blaufränkisch', 'Pinot Meunier', 'Riesling', 'Pinot Noir']
	},
	{
		name: 'Ahr',
		synonyms: [],
		country: 'DE',
		grapes: ['Pinot Noir'],
		color: 'red'
	},

	// ── Austria ────────────────────────────────────────────────────────
	{
		name: 'Wachau',
		synonyms: [],
		country: 'AT',
		grapes: ['Grüner Veltliner', 'Riesling'],
		color: 'white'
	},
	{
		name: 'Kamptal',
		synonyms: [],
		country: 'AT',
		grapes: ['Grüner Veltliner', 'Riesling'],
		color: 'white'
	},
	{
		name: 'Weinviertel',
		synonyms: [],
		country: 'AT',
		grapes: ['Grüner Veltliner'],
		color: 'white'
	},
	{
		name: 'Burgenland',
		synonyms: ['Neusiedlersee', 'Mittelburgenland'],
		country: 'AT',
		grapes: ['Blaufränkisch', 'Zweigelt', 'Saint Laurent']
	},
	{
		name: 'Steiermark',
		synonyms: ['Styria', 'Südsteiermark', 'Styrie'],
		country: 'AT',
		grapes: ['Sauvignon Blanc', 'Chardonnay', 'Muscat'],
		color: 'white'
	},

	// ── Hungary, Greece, Georgia, Lebanon ──────────────────────────────
	{
		name: 'Tokaj',
		synonyms: ['Tokaji', 'Tokay', 'Tokaj-Hegyalja'],
		country: 'HU',
		grapes: ['Furmint', 'Hárslevelű', 'Muscat'],
		age: [3, 30],
		color: 'sweet'
	},
	{
		name: 'Santorini',
		synonyms: [],
		country: 'GR',
		grapes: ['Assyrtiko'],
		color: 'white'
	},
	{
		name: 'Naoussa',
		synonyms: ['Naousa'],
		country: 'GR',
		grapes: ['Xinomavro'],
		color: 'red'
	},
	{
		name: 'Kakheti',
		synonyms: ['Kachetien', 'Kakhétie'],
		country: 'GE',
		grapes: ['Saperavi']
	},
	{
		name: 'Bekaa Valley',
		synonyms: ['Bekaa', 'Beqaa'],
		country: 'LB',
		grapes: ['Cabernet Sauvignon', 'Cinsault', 'Syrah', 'Carignan']
	},

	// ── United States ──────────────────────────────────────────────────
	{
		name: 'California',
		synonyms: ['Kalifornien', 'Californie'],
		country: 'US',
		grapes: ['Cabernet Sauvignon', 'Chardonnay', 'Zinfandel', 'Pinot Noir', 'Merlot']
	},
	{
		name: 'Napa Valley',
		synonyms: ['Napa'],
		country: 'US',
		grapes: ['Cabernet Sauvignon', 'Merlot', 'Chardonnay', 'Sauvignon Blanc']
	},
	{
		name: 'Sonoma',
		synonyms: ['Sonoma County', 'Sonoma Coast', 'Russian River Valley'],
		country: 'US',
		grapes: ['Pinot Noir', 'Chardonnay', 'Zinfandel', 'Cabernet Sauvignon']
	},
	{
		name: 'Willamette Valley',
		synonyms: ['Willamette'],
		country: 'US',
		grapes: ['Pinot Noir', 'Pinot Gris', 'Chardonnay']
	},

	// ── South America ──────────────────────────────────────────────────
	{
		name: 'Mendoza',
		synonyms: ['Luján de Cuyo', 'Valle de Uco', 'Uco Valley'],
		country: 'AR',
		grapes: ['Malbec', 'Cabernet Sauvignon', 'Chardonnay']
	},
	{
		name: 'Salta',
		synonyms: ['Cafayate'],
		country: 'AR',
		grapes: ['Torrontés', 'Malbec']
	},
	{
		name: 'Maipo',
		synonyms: ['Maipo Valley', 'Valle del Maipo'],
		country: 'CL',
		grapes: ['Cabernet Sauvignon', 'Carménère', 'Merlot']
	},
	{
		name: 'Colchagua',
		synonyms: ['Colchagua Valley', 'Valle de Colchagua'],
		country: 'CL',
		grapes: ['Carménère', 'Cabernet Sauvignon', 'Syrah', 'Malbec']
	},
	{
		name: 'Casablanca',
		synonyms: ['Casablanca Valley', 'Valle de Casablanca'],
		country: 'CL',
		grapes: ['Sauvignon Blanc', 'Chardonnay', 'Pinot Noir']
	},

	// ── Australia & New Zealand ────────────────────────────────────────
	{
		name: 'Barossa',
		synonyms: ['Barossa Valley'],
		country: 'AU',
		grapes: ['Syrah', 'Grenache', 'Mourvèdre', 'Cabernet Sauvignon']
	},
	{
		name: 'McLaren Vale',
		synonyms: [],
		country: 'AU',
		grapes: ['Syrah', 'Grenache', 'Cabernet Sauvignon']
	},
	{
		name: 'Coonawarra',
		synonyms: [],
		country: 'AU',
		grapes: ['Cabernet Sauvignon', 'Syrah'],
		color: 'red'
	},
	{
		name: 'Hunter Valley',
		synonyms: ['Hunter'],
		country: 'AU',
		grapes: ['Sémillon', 'Syrah', 'Chardonnay']
	},
	{
		name: 'Margaret River',
		synonyms: [],
		country: 'AU',
		grapes: ['Cabernet Sauvignon', 'Chardonnay', 'Sauvignon Blanc', 'Sémillon']
	},
	{
		name: 'Marlborough',
		synonyms: [],
		country: 'NZ',
		grapes: ['Sauvignon Blanc', 'Pinot Noir']
	},
	{
		name: "Hawke's Bay",
		synonyms: ['Hawkes Bay'],
		country: 'NZ',
		grapes: ['Syrah', 'Merlot', 'Cabernet Sauvignon', 'Chardonnay']
	},
	{
		name: 'Central Otago',
		synonyms: [],
		country: 'NZ',
		grapes: ['Pinot Noir', 'Pinot Gris', 'Riesling']
	},

	// ── South Africa ───────────────────────────────────────────────────
	{
		name: 'Stellenbosch',
		synonyms: [],
		country: 'ZA',
		grapes: ['Cabernet Sauvignon', 'Pinotage', 'Chenin Blanc', 'Syrah', 'Merlot']
	},
	{
		name: 'Swartland',
		synonyms: [],
		country: 'ZA',
		grapes: ['Chenin Blanc', 'Syrah', 'Grenache']
	}
];
