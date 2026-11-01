import type { Grape } from './types';

export const grapes: Grape[] = [
	// ── Red ────────────────────────────────────────────────────────────
	{
		name: 'Cabernet Sauvignon',
		synonyms: [],
		color: 'red',
		body: 5,
		acidity: 3,
		tannin: 5,
		sweetness: 1,
		age: [3, 15],
		aroma: {
			en: ['blackcurrant', 'cedar', 'green pepper'],
			de: ['schwarze Johannisbeere', 'Zeder', 'grüne Paprika']
		},
		pairing: {
			en: ['steak', 'roast lamb', 'hard cheese', 'burger'],
			de: ['Steak', 'Lammbraten', 'Hartkäse', 'Burger']
		}
	},
	{
		name: 'Merlot',
		synonyms: [],
		color: 'red',
		body: 4,
		acidity: 3,
		tannin: 3,
		sweetness: 1,
		age: [2, 10],
		aroma: { en: ['plum', 'cherry', 'chocolate'], de: ['Pflaume', 'Kirsche', 'Schokolade'] },
		pairing: {
			en: ['roast chicken', 'beef stew', 'spaghetti bolognese', 'mushrooms'],
			de: ['Brathähnchen', 'Rindsragout', 'Spaghetti Bolognese', 'Pilze']
		}
	},
	{
		name: 'Pinot Noir',
		synonyms: ['Spätburgunder', 'Blauburgunder', 'Blauer Spätburgunder', 'Pinot Nero', 'Clevner'],
		color: 'red',
		body: 2,
		acidity: 4,
		tannin: 2,
		sweetness: 1,
		age: [1, 10],
		aroma: {
			en: ['cherry', 'raspberry', 'earthy', 'mushroom'],
			de: ['Kirsche', 'Himbeere', 'erdig', 'Pilz']
		},
		pairing: {
			en: ['roast duck', 'mushroom risotto', 'salmon', 'charcuterie'],
			de: ['Entenbraten', 'Pilzrisotto', 'Lachs', 'Aufschnitt']
		}
	},
	{
		name: 'Syrah',
		synonyms: ['Shiraz'],
		color: 'red',
		body: 4,
		acidity: 3,
		tannin: 4,
		sweetness: 1,
		age: [3, 12],
		aroma: { en: ['blackberry', 'black pepper', 'smoke'], de: ['Brombeere', 'schwarzer Pfeffer', 'Rauch'] },
		pairing: {
			en: ['grilled meat', 'barbecue ribs', 'lamb', 'hard cheese'],
			de: ['Fleisch vom Grill', 'Spareribs', 'Lamm', 'Hartkäse']
		}
	},
	{
		name: 'Grenache',
		synonyms: ['Garnacha', 'Garnacha Tinta', 'Garnatxa', 'Grenache Noir', 'Cannonau'],
		color: 'red',
		body: 4,
		acidity: 2,
		tannin: 2,
		sweetness: 1,
		age: [1, 8],
		aroma: { en: ['strawberry', 'raspberry', 'herbs'], de: ['Erdbeere', 'Himbeere', 'Kräuter'] },
		pairing: {
			en: ['grilled sausages', 'lamb stew', 'pizza', 'roast vegetables'],
			de: ['Grillwürste', 'Lammeintopf', 'Pizza', 'Ofengemüse']
		}
	},
	{
		name: 'Tempranillo',
		synonyms: [
			'Tinto Fino',
			'Tinta del País',
			'Tinto del País',
			'Tinta Roriz',
			'Aragonez',
			'Tinta de Toro',
			'Cencibel',
			'Ull de Llebre'
		],
		color: 'red',
		body: 4,
		acidity: 3,
		tannin: 4,
		sweetness: 1,
		age: [2, 10],
		aroma: { en: ['cherry', 'leather', 'vanilla', 'tobacco'], de: ['Kirsche', 'Leder', 'Vanille', 'Tabak'] },
		pairing: {
			en: ['tapas', 'roast lamb', 'chorizo', 'manchego'],
			de: ['Tapas', 'Lammbraten', 'Chorizo', 'Manchego']
		}
	},
	{
		name: 'Sangiovese',
		synonyms: ['Morellino', 'Prugnolo Gentile', 'Brunello', 'Sangioveto', 'Nielluccio'],
		color: 'red',
		body: 3,
		acidity: 5,
		tannin: 4,
		sweetness: 1,
		age: [2, 10],
		aroma: {
			en: ['sour cherry', 'tomato', 'dried herbs'],
			de: ['Sauerkirsche', 'Tomate', 'getrocknete Kräuter']
		},
		pairing: {
			en: ['pizza', 'pasta with tomato sauce', 'grilled steak', 'parmesan'],
			de: ['Pizza', 'Pasta mit Tomatensauce', 'Grillsteak', 'Parmesan']
		}
	},
	{
		name: 'Nebbiolo',
		synonyms: ['Spanna', 'Chiavennasca'],
		color: 'red',
		body: 4,
		acidity: 5,
		tannin: 5,
		sweetness: 1,
		age: [5, 20],
		aroma: { en: ['rose', 'cherry', 'tar'], de: ['Rose', 'Kirsche', 'Teer'] },
		pairing: {
			en: ['truffle pasta', 'braised beef', 'mushroom risotto', 'aged cheese'],
			de: ['Trüffelpasta', 'Schmorbraten', 'Pilzrisotto', 'Bergkäse']
		}
	},
	{
		name: 'Barbera',
		synonyms: [],
		color: 'red',
		body: 3,
		acidity: 5,
		tannin: 2,
		sweetness: 1,
		age: [1, 6],
		aroma: { en: ['sour cherry', 'plum', 'licorice'], de: ['Sauerkirsche', 'Pflaume', 'Lakritz'] },
		pairing: {
			en: ['pizza', 'lasagne', 'salami', 'mushroom pasta'],
			de: ['Pizza', 'Lasagne', 'Salami', 'Pilzpasta']
		}
	},
	{
		name: 'Malbec',
		synonyms: ['Côt', 'Cot'],
		color: 'red',
		body: 4,
		acidity: 3,
		tannin: 4,
		sweetness: 1,
		age: [2, 10],
		aroma: {
			en: ['plum', 'blackberry', 'violet', 'cocoa'],
			de: ['Pflaume', 'Brombeere', 'Veilchen', 'Kakao']
		},
		pairing: {
			en: ['grilled steak', 'empanadas', 'barbecue', 'chili con carne'],
			de: ['Grillsteak', 'Empanadas', 'Grilladen', 'Chili con Carne']
		}
	},
	{
		name: 'Zinfandel',
		synonyms: ['Primitivo', 'Tribidrag', 'Crljenak Kaštelanski'],
		color: 'red',
		body: 5,
		acidity: 3,
		tannin: 3,
		sweetness: 1,
		age: [1, 7],
		aroma: { en: ['jam', 'blackberry', 'pepper'], de: ['Konfitüre', 'Brombeere', 'Pfeffer'] },
		pairing: {
			en: ['barbecue ribs', 'burger', 'pulled pork', 'pizza'],
			de: ['Spareribs', 'Burger', 'Pulled Pork', 'Pizza']
		}
	},
	{
		name: 'Cabernet Franc',
		synonyms: ['Bouchet', 'Breton'],
		color: 'red',
		body: 3,
		acidity: 4,
		tannin: 3,
		sweetness: 1,
		age: [2, 10],
		aroma: { en: ['raspberry', 'bell pepper', 'violet'], de: ['Himbeere', 'Paprika', 'Veilchen'] },
		pairing: {
			en: ['roast pork', 'goat cheese', 'grilled vegetables', 'roast chicken'],
			de: ['Schweinsbraten', 'Ziegenkäse', 'Grillgemüse', 'Brathähnchen']
		}
	},
	{
		name: 'Gamay',
		synonyms: ['Gamay Noir'],
		color: 'red',
		body: 2,
		acidity: 4,
		tannin: 1,
		sweetness: 1,
		age: [0, 3],
		aroma: { en: ['cherry', 'banana', 'raspberry'], de: ['Kirsche', 'Banane', 'Himbeere'] },
		pairing: {
			en: ['charcuterie', 'roast chicken', 'quiche', 'soft cheese'],
			de: ['Aufschnitt', 'Brathähnchen', 'Quiche', 'Weichkäse']
		}
	},
	{
		name: 'Mourvèdre',
		synonyms: ['Monastrell', 'Mataro'],
		color: 'red',
		body: 5,
		acidity: 3,
		tannin: 5,
		sweetness: 1,
		age: [3, 12],
		aroma: { en: ['blackberry', 'meaty', 'herbs'], de: ['Brombeere', 'fleischig', 'Kräuter'] },
		pairing: {
			en: ['roast lamb', 'game', 'beef stew', 'grilled sausages'],
			de: ['Lammbraten', 'Wild', 'Rindsragout', 'Grillwürste']
		}
	},
	{
		name: 'Carignan',
		synonyms: ['Cariñena', 'Mazuelo', 'Carignano', 'Samsó'],
		color: 'red',
		body: 3,
		acidity: 4,
		tannin: 3,
		sweetness: 1,
		age: [1, 7],
		aroma: { en: ['cranberry', 'dried plum', 'spice'], de: ['Preiselbeere', 'Dörrpflaume', 'Gewürz'] },
		pairing: {
			en: ['grilled sausages', 'bean stew', 'pizza', 'roast pork'],
			de: ['Grillwürste', 'Bohneneintopf', 'Pizza', 'Schweinsbraten']
		}
	},
	{
		name: 'Pinotage',
		synonyms: [],
		color: 'red',
		body: 4,
		acidity: 3,
		tannin: 4,
		sweetness: 1,
		age: [2, 8],
		aroma: { en: ['plum', 'smoke', 'coffee'], de: ['Pflaume', 'Rauch', 'Kaffee'] },
		pairing: {
			en: ['barbecue', 'smoked meat', 'burger', 'game'],
			de: ['Grilladen', 'Rauchfleisch', 'Burger', 'Wild']
		}
	},
	{
		name: 'Carménère',
		synonyms: ['Grande Vidure'],
		color: 'red',
		body: 3,
		acidity: 3,
		tannin: 3,
		sweetness: 1,
		age: [1, 7],
		aroma: { en: ['red pepper', 'plum', 'cocoa'], de: ['rote Paprika', 'Pflaume', 'Kakao'] },
		pairing: {
			en: ['grilled chicken', 'chili con carne', 'roast vegetables', 'tacos'],
			de: ['Grillhähnchen', 'Chili con Carne', 'Ofengemüse', 'Tacos']
		}
	},
	{
		name: 'Touriga Nacional',
		synonyms: [],
		color: 'red',
		body: 5,
		acidity: 3,
		tannin: 5,
		sweetness: 1,
		age: [3, 15],
		aroma: { en: ['blueberry', 'violet', 'plum'], de: ['Heidelbeere', 'Veilchen', 'Pflaume'] },
		pairing: {
			en: ['roast lamb', 'beef stew', 'game', 'hard cheese'],
			de: ['Lammbraten', 'Rindsragout', 'Wild', 'Hartkäse']
		}
	},
	{
		name: 'Touriga Franca',
		synonyms: ['Touriga Francesa'],
		color: 'red',
		body: 4,
		acidity: 3,
		tannin: 4,
		sweetness: 1,
		age: [2, 10],
		aroma: { en: ['blackberry', 'rose', 'spice'], de: ['Brombeere', 'Rose', 'Gewürz'] },
		pairing: {
			en: ['grilled meat', 'roast pork', 'sausages', 'aged cheese'],
			de: ['Fleisch vom Grill', 'Schweinsbraten', 'Würste', 'Bergkäse']
		}
	},
	{
		name: 'Montepulciano',
		synonyms: [],
		color: 'red',
		body: 4,
		acidity: 3,
		tannin: 3,
		sweetness: 1,
		age: [1, 7],
		aroma: { en: ['sour cherry', 'plum', 'oregano'], de: ['Sauerkirsche', 'Pflaume', 'Oregano'] },
		pairing: {
			en: ['pizza', 'lasagne', 'lamb chops', 'salami'],
			de: ['Pizza', 'Lasagne', 'Lammkoteletts', 'Salami']
		}
	},
	{
		name: "Nero d'Avola",
		synonyms: ['Calabrese'],
		color: 'red',
		body: 4,
		acidity: 3,
		tannin: 3,
		sweetness: 1,
		age: [1, 7],
		aroma: { en: ['black cherry', 'plum', 'licorice'], de: ['Schwarzkirsche', 'Pflaume', 'Lakritz'] },
		pairing: {
			en: ['pasta with meat sauce', 'grilled sausages', 'baked aubergine', 'pizza'],
			de: ['Pasta mit Fleischsauce', 'Grillwürste', 'Auberginenauflauf', 'Pizza']
		}
	},
	{
		name: 'Nerello Mascalese',
		synonyms: [],
		color: 'red',
		body: 3,
		acidity: 4,
		tannin: 3,
		sweetness: 1,
		age: [2, 12],
		aroma: { en: ['red cherry', 'herbs', 'smoky'], de: ['rote Kirsche', 'Kräuter', 'rauchig'] },
		pairing: {
			en: ['tuna', 'roast chicken', 'mushrooms', 'tomato pasta'],
			de: ['Thunfisch', 'Brathähnchen', 'Pilze', 'Tomatenpasta']
		}
	},
	{
		name: 'Negroamaro',
		synonyms: [],
		color: 'red',
		body: 4,
		acidity: 3,
		tannin: 3,
		sweetness: 1,
		age: [1, 6],
		aroma: {
			en: ['plum', 'dark cherry', 'bitter almond'],
			de: ['Pflaume', 'dunkle Kirsche', 'Bittermandel']
		},
		pairing: {
			en: ['grilled lamb', 'pasta with tomato sauce', 'pizza', 'hard cheese'],
			de: ['Lamm vom Grill', 'Pasta mit Tomatensauce', 'Pizza', 'Hartkäse']
		}
	},
	{
		name: 'Aglianico',
		synonyms: [],
		color: 'red',
		body: 5,
		acidity: 4,
		tannin: 5,
		sweetness: 1,
		age: [5, 20],
		aroma: { en: ['black cherry', 'leather', 'smoke'], de: ['Schwarzkirsche', 'Leder', 'Rauch'] },
		pairing: {
			en: ['braised beef', 'game', 'lamb', 'aged cheese'],
			de: ['Schmorbraten', 'Wild', 'Lamm', 'Bergkäse']
		}
	},
	{
		name: 'Corvina',
		synonyms: ['Corvina Veronese', 'Cruina'],
		color: 'red',
		body: 2,
		acidity: 4,
		tannin: 2,
		sweetness: 1,
		age: [1, 6],
		aroma: { en: ['sour cherry', 'almond', 'herbs'], de: ['Sauerkirsche', 'Mandel', 'Kräuter'] },
		pairing: {
			en: ['pasta with tomato sauce', 'risotto', 'veal', 'charcuterie'],
			de: ['Pasta mit Tomatensauce', 'Risotto', 'Kalbfleisch', 'Aufschnitt']
		}
	},
	{
		name: 'Dolcetto',
		synonyms: ['Ormeasco'],
		color: 'red',
		body: 3,
		acidity: 2,
		tannin: 3,
		sweetness: 1,
		age: [0, 4],
		aroma: { en: ['black cherry', 'plum', 'almond'], de: ['Schwarzkirsche', 'Pflaume', 'Mandel'] },
		pairing: { en: ['pizza', 'antipasti', 'pasta', 'salami'], de: ['Pizza', 'Antipasti', 'Pasta', 'Salami'] }
	},
	{
		name: 'Blaufränkisch',
		synonyms: ['Lemberger', 'Limberger', 'Blauer Limberger', 'Kékfrankos', 'Frankovka'],
		color: 'red',
		body: 3,
		acidity: 4,
		tannin: 3,
		sweetness: 1,
		age: [2, 10],
		aroma: { en: ['blackberry', 'cherry', 'pepper'], de: ['Brombeere', 'Kirsche', 'Pfeffer'] },
		pairing: {
			en: ['goulash', 'roast duck', 'game', 'roast pork'],
			de: ['Gulasch', 'Entenbraten', 'Wild', 'Schweinsbraten']
		}
	},
	{
		name: 'Zweigelt',
		synonyms: ['Blauer Zweigelt', 'Rotburger'],
		color: 'red',
		body: 3,
		acidity: 3,
		tannin: 2,
		sweetness: 1,
		age: [1, 5],
		aroma: { en: ['cherry', 'raspberry', 'pepper'], de: ['Kirsche', 'Himbeere', 'Pfeffer'] },
		pairing: {
			en: ['roast pork', 'boiled beef', 'charcuterie', 'pizza'],
			de: ['Schweinsbraten', 'Siedfleisch', 'Aufschnitt', 'Pizza']
		}
	},
	{
		name: 'Saint Laurent',
		synonyms: ['St. Laurent', 'Sankt Laurent', 'Svatovavřinecké'],
		color: 'red',
		body: 3,
		acidity: 3,
		tannin: 2,
		sweetness: 1,
		age: [1, 6],
		aroma: { en: ['black cherry', 'plum', 'earthy'], de: ['Schwarzkirsche', 'Pflaume', 'erdig'] },
		pairing: {
			en: ['roast duck', 'mushroom dishes', 'game birds', 'soft cheese'],
			de: ['Entenbraten', 'Pilzgerichte', 'Wildgeflügel', 'Weichkäse']
		}
	},
	{
		name: 'Dornfelder',
		synonyms: [],
		color: 'red',
		body: 3,
		acidity: 3,
		tannin: 2,
		sweetness: 1,
		age: [0, 4],
		aroma: { en: ['blackberry', 'cherry', 'plum'], de: ['Brombeere', 'Kirsche', 'Pflaume'] },
		pairing: {
			en: ['pizza', 'spaghetti bolognese', 'bratwurst', 'burger'],
			de: ['Pizza', 'Spaghetti Bolognese', 'Bratwurst', 'Burger']
		}
	},
	{
		name: 'Petit Verdot',
		synonyms: [],
		color: 'red',
		body: 4,
		acidity: 3,
		tannin: 5,
		sweetness: 1,
		age: [3, 15],
		aroma: { en: ['blackberry', 'violet', 'sage'], de: ['Brombeere', 'Veilchen', 'Salbei'] },
		pairing: {
			en: ['steak', 'game', 'beef stew', 'hard cheese'],
			de: ['Steak', 'Wild', 'Rindsragout', 'Hartkäse']
		}
	},
	{
		name: 'Pinot Meunier',
		synonyms: ['Meunier', 'Schwarzriesling', 'Müllerrebe'],
		color: 'red',
		body: 2,
		acidity: 4,
		tannin: 2,
		sweetness: 1,
		age: [0, 5],
		aroma: { en: ['red apple', 'cherry', 'bread'], de: ['roter Apfel', 'Kirsche', 'Brot'] },
		pairing: {
			en: ['roast chicken', 'charcuterie', 'salmon', 'mushroom quiche'],
			de: ['Brathähnchen', 'Aufschnitt', 'Lachs', 'Pilzquiche']
		}
	},
	{
		name: 'Tannat',
		synonyms: ['Harriague'],
		color: 'red',
		body: 5,
		acidity: 4,
		tannin: 5,
		sweetness: 1,
		age: [4, 20],
		aroma: { en: ['blackberry', 'plum', 'smoke'], de: ['Brombeere', 'Pflaume', 'Rauch'] },
		pairing: {
			en: ['grilled steak', 'roast duck', 'sausage and bean stew', 'hard cheese'],
			de: ['Grillsteak', 'Entenbraten', 'Bohneneintopf mit Wurst', 'Hartkäse']
		}
	},
	{
		name: 'Mencía',
		synonyms: ['Jaen'],
		color: 'red',
		body: 3,
		acidity: 4,
		tannin: 3,
		sweetness: 1,
		age: [1, 8],
		aroma: { en: ['red cherry', 'pomegranate', 'herbs'], de: ['rote Kirsche', 'Granatapfel', 'Kräuter'] },
		pairing: {
			en: ['roast pork', 'grilled vegetables', 'chorizo', 'roast chicken'],
			de: ['Schweinsbraten', 'Grillgemüse', 'Chorizo', 'Brathähnchen']
		}
	},
	{
		name: 'Cinsault',
		synonyms: ['Cinsaut'],
		color: 'red',
		body: 2,
		acidity: 3,
		tannin: 2,
		sweetness: 1,
		age: [0, 4],
		aroma: { en: ['strawberry', 'cherry', 'flowers'], de: ['Erdbeere', 'Kirsche', 'Blumen'] },
		pairing: {
			en: ['grilled chicken', 'summer salad', 'charcuterie', 'couscous'],
			de: ['Grillhähnchen', 'Sommersalat', 'Aufschnitt', 'Couscous']
		}
	},
	{
		name: 'Lagrein',
		synonyms: [],
		color: 'red',
		body: 4,
		acidity: 3,
		tannin: 3,
		sweetness: 1,
		age: [1, 7],
		aroma: { en: ['plum', 'dark chocolate', 'violet'], de: ['Pflaume', 'dunkle Schokolade', 'Veilchen'] },
		pairing: {
			en: ['smoked ham', 'goulash', 'game', 'roast pork'],
			de: ['Speck', 'Gulasch', 'Wild', 'Schweinsbraten']
		}
	},
	{
		name: 'Xinomavro',
		synonyms: [],
		color: 'red',
		body: 3,
		acidity: 5,
		tannin: 5,
		sweetness: 1,
		age: [4, 20],
		aroma: { en: ['tomato', 'cherry', 'olive'], de: ['Tomate', 'Kirsche', 'Olive'] },
		pairing: {
			en: ['moussaka', 'roast lamb', 'mushroom dishes', 'feta'],
			de: ['Moussaka', 'Lammbraten', 'Pilzgerichte', 'Feta']
		}
	},
	{
		name: 'Saperavi',
		synonyms: [],
		color: 'red',
		body: 4,
		acidity: 4,
		tannin: 4,
		sweetness: 1,
		age: [3, 15],
		aroma: { en: ['blackberry', 'plum', 'licorice'], de: ['Brombeere', 'Pflaume', 'Lakritz'] },
		pairing: {
			en: ['meat skewers', 'lamb', 'game', 'hard cheese'],
			de: ['Fleischspiesse', 'Lamm', 'Wild', 'Hartkäse']
		}
	},
	// Swiss reds
	{
		name: 'Cornalin',
		synonyms: ['Rouge du Pays'],
		color: 'red',
		body: 4,
		acidity: 3,
		tannin: 3,
		sweetness: 1,
		age: [2, 10],
		aroma: { en: ['cherry', 'blackberry', 'spice'], de: ['Kirsche', 'Brombeere', 'Gewürz'] },
		pairing: {
			en: ['game', 'roast beef', 'dried meat', 'mountain cheese'],
			de: ['Wild', 'Roastbeef', 'Trockenfleisch', 'Bergkäse']
		}
	},
	{
		name: 'Humagne Rouge',
		synonyms: [],
		color: 'red',
		body: 3,
		acidity: 3,
		tannin: 3,
		sweetness: 1,
		age: [1, 6],
		aroma: { en: ['blackberry', 'violet', 'forest floor'], de: ['Brombeere', 'Veilchen', 'Waldboden'] },
		pairing: {
			en: ['game dishes', 'venison stew', 'roast chestnuts', 'mountain cheese'],
			de: ['Wildgerichte', 'Rehpfeffer', 'Marroni', 'Bergkäse']
		}
	},
	{
		name: 'Gamaret',
		synonyms: [],
		color: 'red',
		body: 4,
		acidity: 3,
		tannin: 4,
		sweetness: 1,
		age: [2, 8],
		aroma: { en: ['blackberry', 'pepper', 'cherry'], de: ['Brombeere', 'Pfeffer', 'Kirsche'] },
		pairing: {
			en: ['grilled steak', 'game', 'beef stew', 'hard cheese'],
			de: ['Grillsteak', 'Wild', 'Rindsragout', 'Hartkäse']
		}
	},
	{
		name: 'Garanoir',
		synonyms: [],
		color: 'red',
		body: 3,
		acidity: 3,
		tannin: 2,
		sweetness: 1,
		age: [1, 5],
		aroma: { en: ['cherry', 'blackcurrant', 'pepper'], de: ['Kirsche', 'schwarze Johannisbeere', 'Pfeffer'] },
		pairing: {
			en: ['roast chicken', 'charcuterie', 'sausage', 'soft cheese'],
			de: ['Brathähnchen', 'Aufschnitt', 'Saucisson', 'Weichkäse']
		}
	},
	{
		name: 'Diolinoir',
		synonyms: [],
		color: 'red',
		body: 4,
		acidity: 3,
		tannin: 4,
		sweetness: 1,
		age: [2, 8],
		aroma: { en: ['blackberry', 'plum', 'spice'], de: ['Brombeere', 'Pflaume', 'Gewürz'] },
		pairing: {
			en: ['roast beef', 'game', 'lamb', 'hard cheese'],
			de: ['Rindsbraten', 'Wild', 'Lamm', 'Hartkäse']
		}
	},

	// ── White ──────────────────────────────────────────────────────────
	{
		name: 'Chardonnay',
		synonyms: ['Morillon', 'Beaunois'],
		color: 'white',
		body: 4,
		acidity: 3,
		tannin: 1,
		sweetness: 1,
		age: [1, 6],
		aroma: { en: ['apple', 'lemon', 'butter', 'vanilla'], de: ['Apfel', 'Zitrone', 'Butter', 'Vanille'] },
		pairing: {
			en: ['roast chicken', 'creamy pasta', 'lobster', 'salmon'],
			de: ['Brathähnchen', 'Pasta mit Rahmsauce', 'Hummer', 'Lachs']
		}
	},
	{
		name: 'Sauvignon Blanc',
		synonyms: ['Fumé Blanc', 'Sauvignon', 'Muskat-Sylvaner'],
		color: 'white',
		body: 2,
		acidity: 5,
		tannin: 1,
		sweetness: 1,
		age: [0, 3],
		aroma: {
			en: ['grapefruit', 'cut grass', 'gooseberry'],
			de: ['Grapefruit', 'frisches Gras', 'Stachelbeere']
		},
		pairing: {
			en: ['goat cheese', 'green salad', 'asparagus', 'grilled fish'],
			de: ['Ziegenkäse', 'Blattsalat', 'Spargel', 'Fisch vom Grill']
		}
	},
	{
		name: 'Riesling',
		synonyms: ['Weissriesling', 'Rheinriesling', 'White Riesling', 'Riesling Renano'],
		color: 'white',
		body: 2,
		acidity: 5,
		tannin: 1,
		sweetness: 1,
		age: [1, 12],
		aroma: { en: ['lime', 'green apple', 'peach'], de: ['Limette', 'grüner Apfel', 'Pfirsich'] },
		pairing: {
			en: ['sushi', 'Thai food', 'roast pork', 'smoked fish'],
			de: ['Sushi', 'Thai-Küche', 'Schweinsbraten', 'Räucherfisch']
		}
	},
	{
		name: 'Pinot Gris',
		synonyms: ['Pinot Grigio', 'Grauburgunder', 'Grauer Burgunder', 'Ruländer', 'Malvoisie'],
		color: 'white',
		body: 3,
		acidity: 3,
		tannin: 1,
		sweetness: 1,
		age: [0, 4],
		aroma: { en: ['pear', 'apple', 'honey'], de: ['Birne', 'Apfel', 'Honig'] },
		pairing: {
			en: ['roast chicken', 'mushroom dishes', 'quiche', 'smoked salmon'],
			de: ['Brathähnchen', 'Pilzgerichte', 'Quiche', 'Räucherlachs']
		}
	},
	{
		name: 'Gewürztraminer',
		synonyms: ['Traminer', 'Roter Traminer'],
		color: 'white',
		body: 4,
		acidity: 2,
		tannin: 1,
		sweetness: 2,
		age: [1, 5],
		aroma: { en: ['lychee', 'rose', 'ginger'], de: ['Litschi', 'Rose', 'Ingwer'] },
		pairing: {
			en: ['curry', 'stir-fry', 'sweet and sour duck', 'Munster cheese'],
			de: ['Curry', 'Wokgerichte', 'Ente süss-sauer', 'Münsterkäse']
		}
	},
	{
		name: 'Chenin Blanc',
		synonyms: ['Steen', 'Pineau de la Loire'],
		color: 'white',
		body: 3,
		acidity: 5,
		tannin: 1,
		sweetness: 1,
		age: [1, 10],
		aroma: { en: ['quince', 'apple', 'honey'], de: ['Quitte', 'Apfel', 'Honig'] },
		pairing: {
			en: ['roast pork', 'chicken in cream sauce', 'goat cheese', 'sushi'],
			de: ['Schweinsbraten', 'Hähnchen an Rahmsauce', 'Ziegenkäse', 'Sushi']
		}
	},
	{
		name: 'Viognier',
		synonyms: [],
		color: 'white',
		body: 4,
		acidity: 2,
		tannin: 1,
		sweetness: 1,
		age: [0, 4],
		aroma: { en: ['apricot', 'peach', 'flowers'], de: ['Aprikose', 'Pfirsich', 'Blumen'] },
		pairing: {
			en: ['chicken curry', 'roast pork', 'lobster', 'tagine'],
			de: ['Hähnchencurry', 'Schweinsbraten', 'Hummer', 'Tajine']
		}
	},
	{
		name: 'Grüner Veltliner',
		synonyms: ['Veltliner', 'Weissgipfler'],
		color: 'white',
		body: 3,
		acidity: 4,
		tannin: 1,
		sweetness: 1,
		age: [0, 6],
		aroma: {
			en: ['green apple', 'white pepper', 'lemon'],
			de: ['grüner Apfel', 'weisser Pfeffer', 'Zitrone']
		},
		pairing: {
			en: ['Wiener schnitzel', 'asparagus', 'salads', 'sushi'],
			de: ['Wiener Schnitzel', 'Spargel', 'Salate', 'Sushi']
		}
	},
	{
		name: 'Albariño',
		synonyms: ['Alvarinho'],
		color: 'white',
		body: 2,
		acidity: 5,
		tannin: 1,
		sweetness: 1,
		age: [0, 3],
		aroma: { en: ['lemon', 'peach', 'salty'], de: ['Zitrone', 'Pfirsich', 'salzig'] },
		pairing: {
			en: ['seafood', 'grilled fish', 'sushi', 'mussels'],
			de: ['Meeresfrüchte', 'Fisch vom Grill', 'Sushi', 'Muscheln']
		}
	},
	{
		name: 'Sémillon',
		synonyms: [],
		color: 'white',
		body: 3,
		acidity: 3,
		tannin: 1,
		sweetness: 1,
		age: [2, 12],
		aroma: { en: ['lemon', 'honey', 'beeswax'], de: ['Zitrone', 'Honig', 'Bienenwachs'] },
		pairing: {
			en: ['roast chicken', 'crab', 'fish in butter sauce', 'goat cheese'],
			de: ['Brathähnchen', 'Krabben', 'Fisch an Buttersauce', 'Ziegenkäse']
		}
	},
	{
		name: 'Muscat',
		synonyms: ['Moscato', 'Muskateller', 'Gelber Muskateller', 'Moscatel', 'Muscat Blanc à Petits Grains'],
		color: 'white',
		body: 2,
		acidity: 3,
		tannin: 1,
		sweetness: 2,
		age: [0, 3],
		aroma: { en: ['grape', 'orange blossom', 'peach'], de: ['Traube', 'Orangenblüte', 'Pfirsich'] },
		pairing: {
			en: ['fruit tart', 'fruit salad', 'Thai food', 'blue cheese'],
			de: ['Fruchttarte', 'Fruchtsalat', 'Thai-Küche', 'Blauschimmelkäse']
		}
	},
	{
		name: 'Verdejo',
		synonyms: [],
		color: 'white',
		body: 2,
		acidity: 4,
		tannin: 1,
		sweetness: 1,
		age: [0, 3],
		aroma: { en: ['lime', 'fennel', 'grass'], de: ['Limette', 'Fenchel', 'Gras'] },
		pairing: {
			en: ['salads', 'grilled fish', 'tapas', 'goat cheese'],
			de: ['Salate', 'Fisch vom Grill', 'Tapas', 'Ziegenkäse']
		}
	},
	{
		name: 'Vermentino',
		synonyms: ['Rolle', 'Pigato', 'Favorita'],
		color: 'white',
		body: 2,
		acidity: 4,
		tannin: 1,
		sweetness: 1,
		age: [0, 3],
		aroma: { en: ['lemon', 'green apple', 'almond'], de: ['Zitrone', 'grüner Apfel', 'Mandel'] },
		pairing: {
			en: ['seafood pasta', 'grilled fish', 'pasta with pesto', 'salads'],
			de: ['Pasta mit Meeresfrüchten', 'Fisch vom Grill', 'Pasta al Pesto', 'Salate']
		}
	},
	{
		name: 'Garganega',
		synonyms: [],
		color: 'white',
		body: 2,
		acidity: 3,
		tannin: 1,
		sweetness: 1,
		age: [0, 4],
		aroma: { en: ['pear', 'almond', 'lemon'], de: ['Birne', 'Mandel', 'Zitrone'] },
		pairing: {
			en: ['risotto', 'seafood', 'asparagus', 'vegetable pasta'],
			de: ['Risotto', 'Meeresfrüchte', 'Spargel', 'Gemüsepasta']
		}
	},
	{
		name: 'Trebbiano',
		synonyms: ['Ugni Blanc', 'Trebbiano Toscano'],
		color: 'white',
		body: 2,
		acidity: 4,
		tannin: 1,
		sweetness: 1,
		age: [0, 2],
		aroma: { en: ['lemon', 'apple', 'almond'], de: ['Zitrone', 'Apfel', 'Mandel'] },
		pairing: {
			en: ['fried fish', 'salad', 'vegetable pasta', 'mozzarella'],
			de: ['Fisch im Backteig', 'Salat', 'Gemüsepasta', 'Mozzarella']
		}
	},
	{
		name: 'Glera',
		synonyms: [],
		color: 'white',
		body: 1,
		acidity: 3,
		tannin: 1,
		sweetness: 1,
		age: [0, 2],
		aroma: { en: ['green apple', 'pear', 'flowers'], de: ['grüner Apfel', 'Birne', 'Blumen'] },
		pairing: {
			en: ['antipasti', 'ham and melon', 'sushi', 'party snacks'],
			de: ['Antipasti', 'Rohschinken mit Melone', 'Sushi', 'Apéro-Häppchen']
		}
	},
	{
		name: 'Melon de Bourgogne',
		synonyms: ['Muscadet', 'Melon'],
		color: 'white',
		body: 1,
		acidity: 5,
		tannin: 1,
		sweetness: 1,
		age: [0, 4],
		aroma: { en: ['lemon', 'green apple', 'salty'], de: ['Zitrone', 'grüner Apfel', 'salzig'] },
		pairing: {
			en: ['oysters', 'mussels', 'fish and chips', 'seafood platter'],
			de: ['Austern', 'Muscheln', 'Fish and Chips', 'Meeresfrüchteplatte']
		}
	},
	{
		name: 'Silvaner',
		synonyms: ['Sylvaner', 'Grüner Silvaner', 'Johannisberg'],
		color: 'white',
		body: 3,
		acidity: 3,
		tannin: 1,
		sweetness: 1,
		age: [0, 5],
		aroma: { en: ['green apple', 'herbs', 'earthy'], de: ['grüner Apfel', 'Kräuter', 'erdig'] },
		pairing: {
			en: ['asparagus', 'white fish', 'salads', 'veal sausage'],
			de: ['Spargel', 'Fischfilet', 'Salate', 'Kalbsbratwurst']
		}
	},
	{
		name: 'Pinot Blanc',
		synonyms: ['Weissburgunder', 'Weisser Burgunder', 'Pinot Bianco'],
		color: 'white',
		body: 3,
		acidity: 3,
		tannin: 1,
		sweetness: 1,
		age: [0, 4],
		aroma: { en: ['apple', 'pear', 'almond'], de: ['Apfel', 'Birne', 'Mandel'] },
		pairing: {
			en: ['asparagus', 'roast chicken', 'quiche', 'fish fillet'],
			de: ['Spargel', 'Brathähnchen', 'Quiche', 'Fischfilet']
		}
	},
	{
		name: 'Marsanne',
		synonyms: ['Ermitage'],
		color: 'white',
		body: 4,
		acidity: 2,
		tannin: 1,
		sweetness: 1,
		age: [1, 8],
		aroma: { en: ['pear', 'almond', 'honey'], de: ['Birne', 'Mandel', 'Honig'] },
		pairing: {
			en: ['roast chicken', 'lobster', 'fish in cream sauce', 'roast pork'],
			de: ['Brathähnchen', 'Hummer', 'Fisch an Rahmsauce', 'Schweinsbraten']
		}
	},
	{
		name: 'Roussanne',
		synonyms: [],
		color: 'white',
		body: 4,
		acidity: 3,
		tannin: 1,
		sweetness: 1,
		age: [1, 8],
		aroma: { en: ['pear', 'herbal tea', 'honey'], de: ['Birne', 'Kräutertee', 'Honig'] },
		pairing: {
			en: ['roast chicken', 'crab', 'mushroom risotto', 'creamy pasta'],
			de: ['Brathähnchen', 'Krabben', 'Pilzrisotto', 'Pasta mit Rahmsauce']
		}
	},
	{
		name: 'Furmint',
		synonyms: ['Šipon', 'Moslavac'],
		color: 'white',
		body: 3,
		acidity: 5,
		tannin: 1,
		sweetness: 1,
		age: [2, 15],
		aroma: { en: ['lime', 'pear', 'smoke'], de: ['Limette', 'Birne', 'Rauch'] },
		pairing: {
			en: ['roast pork', 'paprika chicken', 'smoked fish', 'roast goose'],
			de: ['Schweinsbraten', 'Paprikahähnchen', 'Räucherfisch', 'Gänsebraten']
		}
	},
	{
		name: 'Hárslevelű',
		synonyms: [],
		color: 'white',
		body: 3,
		acidity: 4,
		tannin: 1,
		sweetness: 1,
		age: [1, 8],
		aroma: { en: ['linden blossom', 'pear', 'honey'], de: ['Lindenblüte', 'Birne', 'Honig'] },
		pairing: {
			en: ['roast duck', 'curry', 'soft cheese', 'fruit tart'],
			de: ['Entenbraten', 'Curry', 'Weichkäse', 'Fruchttarte']
		}
	},
	{
		name: 'Assyrtiko',
		synonyms: [],
		color: 'white',
		body: 3,
		acidity: 5,
		tannin: 1,
		sweetness: 1,
		age: [1, 10],
		aroma: { en: ['lemon', 'salty', 'flint'], de: ['Zitrone', 'salzig', 'Feuerstein'] },
		pairing: {
			en: ['grilled fish', 'octopus', 'feta', 'oysters'],
			de: ['Fisch vom Grill', 'Pulpo', 'Feta', 'Austern']
		}
	},
	{
		name: 'Torrontés',
		synonyms: [],
		color: 'white',
		body: 2,
		acidity: 3,
		tannin: 1,
		sweetness: 1,
		age: [0, 2],
		aroma: { en: ['rose', 'peach', 'lemon'], de: ['Rose', 'Pfirsich', 'Zitrone'] },
		pairing: {
			en: ['empanadas', 'ceviche', 'curry', 'Thai food'],
			de: ['Empanadas', 'Ceviche', 'Curry', 'Thai-Küche']
		}
	},
	{
		name: 'Macabeo',
		synonyms: ['Viura', 'Macabeu'],
		color: 'white',
		body: 2,
		acidity: 3,
		tannin: 1,
		sweetness: 1,
		age: [0, 3],
		aroma: { en: ['lemon', 'apple', 'almond'], de: ['Zitrone', 'Apfel', 'Mandel'] },
		pairing: {
			en: ['tapas', 'paella', 'fried fish', 'salads'],
			de: ['Tapas', 'Paella', 'Fisch im Backteig', 'Salate']
		}
	},
	{
		name: 'Xarel·lo',
		synonyms: ['Xarello', 'Pansa Blanca'],
		color: 'white',
		body: 2,
		acidity: 4,
		tannin: 1,
		sweetness: 1,
		age: [0, 4],
		aroma: { en: ['lemon', 'pear', 'herbs'], de: ['Zitrone', 'Birne', 'Kräuter'] },
		pairing: {
			en: ['paella', 'seafood', 'grilled vegetables', 'cured ham'],
			de: ['Paella', 'Meeresfrüchte', 'Grillgemüse', 'Rohschinken']
		}
	},
	{
		name: 'Parellada',
		synonyms: [],
		color: 'white',
		body: 1,
		acidity: 4,
		tannin: 1,
		sweetness: 1,
		age: [0, 2],
		aroma: { en: ['green apple', 'lemon', 'flowers'], de: ['grüner Apfel', 'Zitrone', 'Blumen'] },
		pairing: {
			en: ['salads', 'white fish', 'tapas', 'fresh cheese'],
			de: ['Salate', 'Fischfilet', 'Tapas', 'Frischkäse']
		}
	},
	{
		name: 'Palomino',
		synonyms: ['Palomino Fino', 'Listán'],
		color: 'white',
		body: 2,
		acidity: 2,
		tannin: 1,
		sweetness: 1,
		age: [0, 3],
		aroma: { en: ['almond', 'apple', 'salty'], de: ['Mandel', 'Apfel', 'salzig'] },
		pairing: {
			en: ['olives', 'salted almonds', 'cured ham', 'tapas'],
			de: ['Oliven', 'Salzmandeln', 'Rohschinken', 'Tapas']
		}
	},
	{
		name: 'Godello',
		synonyms: ['Gouveio'],
		color: 'white',
		body: 3,
		acidity: 4,
		tannin: 1,
		sweetness: 1,
		age: [1, 6],
		aroma: { en: ['apple', 'peach', 'stone'], de: ['Apfel', 'Pfirsich', 'Stein'] },
		pairing: {
			en: ['grilled fish', 'roast chicken', 'seafood', 'mushrooms'],
			de: ['Fisch vom Grill', 'Brathähnchen', 'Meeresfrüchte', 'Pilze']
		}
	},
	{
		name: 'Loureiro',
		synonyms: [],
		color: 'white',
		body: 1,
		acidity: 4,
		tannin: 1,
		sweetness: 1,
		age: [0, 2],
		aroma: { en: ['lime', 'flowers', 'green apple'], de: ['Limette', 'Blumen', 'grüner Apfel'] },
		pairing: {
			en: ['mussels', 'salads', 'sushi', 'grilled sardines'],
			de: ['Muscheln', 'Salate', 'Sushi', 'Sardinen vom Grill']
		}
	},
	{
		name: 'Carricante',
		synonyms: [],
		color: 'white',
		body: 2,
		acidity: 5,
		tannin: 1,
		sweetness: 1,
		age: [1, 8],
		aroma: { en: ['lemon', 'green apple', 'aniseed'], de: ['Zitrone', 'grüner Apfel', 'Anis'] },
		pairing: {
			en: ['grilled fish', 'seafood pasta', 'tuna', 'lemon chicken'],
			de: ['Fisch vom Grill', 'Pasta mit Meeresfrüchten', 'Thunfisch', 'Zitronenhähnchen']
		}
	},
	{
		name: 'Grillo',
		synonyms: [],
		color: 'white',
		body: 3,
		acidity: 3,
		tannin: 1,
		sweetness: 1,
		age: [0, 3],
		aroma: { en: ['lemon', 'melon', 'herbs'], de: ['Zitrone', 'Melone', 'Kräuter'] },
		pairing: {
			en: ['tuna', 'fish soup', 'seafood pasta', 'grilled vegetables'],
			de: ['Thunfisch', 'Fischsuppe', 'Pasta mit Meeresfrüchten', 'Grillgemüse']
		}
	},
	// Swiss whites
	{
		name: 'Chasselas',
		synonyms: ['Fendant', 'Gutedel', 'Perlan', 'Dorin'],
		color: 'white',
		body: 2,
		acidity: 2,
		tannin: 1,
		sweetness: 1,
		age: [0, 4],
		aroma: { en: ['lime blossom', 'pear', 'almond'], de: ['Lindenblüte', 'Birne', 'Mandel'] },
		pairing: {
			en: ['raclette', 'cheese fondue', 'perch fillets', 'cheese tart'],
			de: ['Raclette', 'Käsefondue', 'Egli-Filets', 'Käsewähe']
		}
	},
	{
		name: 'Petite Arvine',
		synonyms: ['Arvine'],
		color: 'white',
		body: 3,
		acidity: 5,
		tannin: 1,
		sweetness: 1,
		age: [1, 8],
		aroma: { en: ['grapefruit', 'rhubarb', 'salty'], de: ['Grapefruit', 'Rhabarber', 'salzig'] },
		pairing: {
			en: ['lake fish', 'seafood', 'asparagus', 'goat cheese'],
			de: ['Fisch aus dem See', 'Meeresfrüchte', 'Spargel', 'Ziegenkäse']
		}
	},
	{
		name: 'Completer',
		synonyms: [],
		color: 'white',
		body: 4,
		acidity: 5,
		tannin: 1,
		sweetness: 1,
		age: [3, 15],
		aroma: { en: ['quince', 'honey', 'nuts'], de: ['Quitte', 'Honig', 'Nüsse'] },
		pairing: {
			en: ['roast chicken', 'veal in cream sauce', 'mountain cheese', 'roast pork'],
			de: ['Brathähnchen', 'Zürcher Geschnetzeltes', 'Bergkäse', 'Schweinsbraten']
		}
	},
	{
		name: 'Müller-Thurgau',
		synonyms: ['Riesling-Sylvaner', 'Riesling x Sylvaner', 'Rivaner'],
		color: 'white',
		body: 2,
		acidity: 2,
		tannin: 1,
		sweetness: 1,
		age: [0, 2],
		aroma: { en: ['nutmeg', 'peach', 'flowers'], de: ['Muskat', 'Pfirsich', 'Blumen'] },
		pairing: {
			en: ['asparagus', 'trout', 'salad', 'onion tart'],
			de: ['Spargel', 'Forelle', 'Salat', 'Zwiebelwähe']
		}
	},
	{
		name: 'Räuschling',
		synonyms: [],
		color: 'white',
		body: 2,
		acidity: 4,
		tannin: 1,
		sweetness: 1,
		age: [0, 4],
		aroma: { en: ['green apple', 'lemon', 'herbs'], de: ['grüner Apfel', 'Zitrone', 'Kräuter'] },
		pairing: {
			en: ['lake fish', 'sushi', 'asparagus', 'fresh cheese'],
			de: ['Fisch aus dem See', 'Sushi', 'Spargel', 'Frischkäse']
		}
	},
	{
		name: 'Savagnin',
		synonyms: ['Heida', 'Heiden', 'Païen', 'Savagnin Blanc'],
		color: 'white',
		body: 3,
		acidity: 4,
		tannin: 1,
		sweetness: 1,
		age: [1, 8],
		aroma: { en: ['walnut', 'apple', 'spice'], de: ['Walnuss', 'Apfel', 'Gewürz'] },
		pairing: {
			en: ['hard cheese', 'chicken with morels', 'mushroom dishes', 'smoked fish'],
			de: ['Hartkäse', 'Hähnchen mit Morcheln', 'Pilzgerichte', 'Räucherfisch']
		}
	}
];
