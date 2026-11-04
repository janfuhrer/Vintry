# How Vintry suggests drinking windows and taste

Vintry fills in a drinking window, a taste profile, a serving temperature and food pairings for
every wine, so a bottle is useful even when only its name and vintage are known. These are
estimates from simple rules and built-in tables, not tasting notes. You can override every value.

This page is the reference for those rules. **It is kept in step with the code**: any change to
them updates this page in the same commit, and `src/lib/rules-doc.test.ts` fails when a term,
threshold or table value in the code is missing here.

Code: [`src/lib/wine.ts`](../src/lib/wine.ts) (window, taste, status, serving, pairings),
[`src/lib/terms.ts`](../src/lib/terms.ts) (label words and price), tables in
[`src/lib/data/`](../src/lib/data/).

## What the rules look at

- The wine's **vintage**, **type** (red, white, rosé, sparkling, sweet, fortified), **country**,
  **region** and **grapes**.
- The words on the label: the wine's **name** and, when the label was scanned, the **text read
  from it**. "RISERVA" printed on the label counts even when it isn't part of the name.
- The **price** per bottle, as entered (CHF and EUR are treated alike).

Text is compared without accents, case or punctuation ("Großes Gewächs" = "grosses gewachs"), and
only as whole words: "Dolcetto" is not "dolce".

## Drinking window

The window is given as years after the vintage and needs a vintage. It is worked out in two steps.

### 1. Typical window

The first that applies:

1. **The region's own ageing**, for the regions that have one:

   | Region                       | Years after the vintage |
   | ---------------------------- | ----------------------- |
   | Barolo                       | 8–25                    |
   | Médoc                        | 6–25                    |
   | Brunello di Montalcino       | 6–25                    |
   | Barbaresco                   | 6–20                    |
   | Saint-Émilion                | 5–20                    |
   | Pomerol                      | 5–20                    |
   | Graves                       | 5–20                    |
   | Côte-Rôtie                   | 5–20                    |
   | Bolgheri                     | 5–20                    |
   | Amarone                      | 5–20                    |
   | Priorat                      | 5–20                    |
   | Sauternes                    | 5–30                    |
   | Porto                        | 5–30                    |
   | Bordeaux                     | 4–15                    |
   | Châteauneuf-du-Pape          | 4–15                    |
   | Vino Nobile di Montepulciano | 4–15                    |
   | Ribera del Duero             | 4–15                    |
   | Rioja                        | 3–15                    |
   | Toro                         | 3–12                    |
   | Mosel                        | 2–20                    |
   | Rheingau                     | 2–20                    |
   | Tokaj                        | 3–30                    |
   | Champagne                    | 1–8                     |
   | Franciacorta                 | 1–8                     |

2. **The grapes**: for red, white and rosé, the average of the known grapes' ranges (each of the
   82 grapes in [`grapes.ts`](../src/lib/data/grapes.ts) has one, e.g. Pinot Noir 1–10, Nebbiolo
   5–20, Sauvignon Blanc 0–3). A rosé ends after 3 years at the latest.
3. **The type**:

   | Type      | Years after the vintage |
   | --------- | ----------------------- |
   | Red       | 2–8                     |
   | White     | 1–4                     |
   | Rosé      | 0–2                     |
   | Sparkling | 1–5                     |
   | Sweet     | 3–20                    |
   | Fortified | 5–30                    |

### 2. The wine's level

The tables describe a typical serious wine. Words on the label, or the price, say whether this
bottle is an everyday one or one made to keep. The first word found decides, the most specific
first. Some words only count on labels from their own country, because elsewhere they are
marketing words (a Chilean "Gran Reserva"); when the country isn't known, they count.

| Level    | Words on the label                                                                  | Only for                          |
| -------- | ----------------------------------------------------------------------------------- | --------------------------------- |
| Top      | Grand Cru Classé, Premier Grand Cru Classé, Cru Classé, Grand Cru                   |                                   |
| Top      | Gran Reserva                                                                        | Spain, red and white              |
| Top      | Gran Selezione                                                                      | Italy                             |
| Top      | Grosses Gewächs, Grosse Lage                                                        | Germany                           |
| Top      | Trockenbeerenauslese, Beerenauslese, Eiswein, Auslese                               | Germany, Austria                  |
| Top      | Vintage Port                                                                        |                                   |
| Premium  | Premier Cru, 1er Cru, Cru Bourgeois                                                 |                                   |
| Premium  | Riserva                                                                             | Italy, Switzerland; red and white |
| Premium  | Reserva                                                                             | Spain, red and white              |
| Premium  | Smaragd                                                                             | Austria                           |
| Premium  | Erste Lage                                                                          | Germany, Austria                  |
| Premium  | Spätlese                                                                            | Germany, Austria                  |
| Standard | Crianza                                                                             | Spain                             |
| Entry    | Steinfeder                                                                          | Austria                           |
| Entry    | Vin de Table, Vino da Tavola, Vino de Mesa, Tafelwein, Vin de France, Vino d'Italia |                                   |

Without such a word, the **price** decides: **12 or less** is an everyday bottle (entry), **60 or
more** one made to keep (premium); anything else, or no price, is standard.

What each level does to the typical window:

| Level    | Window                                                                      |
| -------- | --------------------------------------------------------------------------- |
| Entry    | ready within a year; best within **4 years** for red, **2 years** otherwise |
| Standard | as the table says                                                           |
| Premium  | **+2 years** at the start, **+5 years** at the end                          |
| Top      | **+3 years** at the start, **+8 years** at the end                          |

Example: a Chianti Classico Riserva 2017 with Sangiovese is 2017 + (2–10 + 2/5) = 2021–2032; the
same wine for 9.50 without "Riserva" on its label is 2018–2022.

## Status

| Status     | When                                             |
| ---------- | ------------------------------------------------ |
| Wait       | this year is before the window                   |
| Ready      | inside the window, more than a year left         |
| Drink soon | in the window's last year (or the one before it) |
| Past peak  | the window has ended                             |
| No window  | no years known                                   |
| Finished   | no bottles left (not for wishlist wines)         |

"Drink now" on the cellar page lists the wines with bottles that are _drink soon_ or _past peak_.

## Taste

Body, acidity, tannin and sweetness on a scale of 1 (low) to 5 (high):

- The **average of the known grapes** (each grape has the four values in
  [`grapes.ts`](../src/lib/data/grapes.ts)).
- No grape known: the **region's typical grapes** of the wine's colour, the first two.
- Tannin is 1 for anything but red.
- **Sweetness**, the first that applies: what the label says (below); 5 for a sweet wine and 4 for
  a fortified one; else the grapes' average.
- Aromas: those of the grapes, at most five.

### Sweetness words

Still wine, most specific first:

| Sweetness | Words                                                                                                |
| --------- | ---------------------------------------------------------------------------------------------------- |
| 5         | Trockenbeerenauslese, Beerenauslese, Eiswein, Ice Wine, Sélection de Grains Nobles, Passito, Recioto |
| 4         | Auslese, Vendanges Tardives, Vendange Tardive, Moelleux, Liquoreux, Dolce, Doux, Süss                |
| 3         | Spätlese, Lieblich, Amabile, Demi-Sec, Semi Seco                                                     |
| 2         | Kabinett, Feinherb, Halbtrocken, Abboccato, Off Dry                                                  |
| 1         | Trocken, Sec, Secco, Seco, Dry                                                                       |

A dryness word beats a ripeness level: "Spätlese trocken" is 1.

Sparkling wine, by its dosage:

| Sweetness | Words                                                             |
| --------- | ----------------------------------------------------------------- |
| 1         | Brut Nature, Pas Dosé, Dosage Zéro, Zero Dosage, Extra Brut, Brut |
| 2         | Extra Dry, Extra Sec, Extra Seco                                  |
| 3         | Sec, Dry, Trocken, Secco, Seco                                    |
| 4         | Demi-Sec, Semi Seco, Abboccato                                    |
| 5         | Doux, Dolce                                                       |

## Serving temperature

| Type                  | °C    |
| --------------------- | ----- |
| Sparkling             | 6–8   |
| Rosé, sweet           | 8–10  |
| White, body 4 or more | 10–12 |
| White, lighter        | 8–10  |
| Red, body 2 or less   | 12–14 |
| Red, body 3           | 14–16 |
| Red, body 4 or more   | 16–18 |
| Fortified             | 12–16 |

## Food pairings

Sweet, fortified and sparkling wines first get what their style asks for (fruit desserts and blue
cheese; dark chocolate and nuts; aperitif and oysters). Then the grapes' pairings, or those of the
region's typical grapes; at most five. A sweet wine gets only its style's.

## When the suggestions apply

- **In the form**, window and taste follow the wine's details as long as they are still the
  suggestion for them, also when editing a saved wine (adding the vintage later gives a window).
  A window from elsewhere (Claude, an earlier edit) moves with a corrected vintage. Values changed
  by hand in the form stay.
- **Import and MCP** (Claude adding wines): values that are given are kept; only missing ones are
  suggested, one by one. A given year stays and the other is suggested only where it fits.
  Changing a wine over MCP (`update_wines`) changes only the values sent: the window and taste
  stay as they are unless they are sent too.
- **The reference list** ([`data/`](../data/README.md), about 100,000 wines) comes first: a wine
  that matches one clearly by producer and name gets the grapes, alcohol, type, country and region
  it left empty, so the suggestions above work from the real grapes. Clearly means: the name
  shares at least half its distinctive words with one wine of that producer, well ahead of the
  next; a red and a rosé of the same name are told apart by the label's colour; without a producer
  only an unmistakable name counts, and a label from another country never matches.
- **When nothing matches clearly**, the whole text read from the label is searched in the list and
  up to three wines are offered ("Is it one of these?", with how many of each wine's words were
  on the label). A producer counts only when all its distinctive words are there and one of them
  isn't a region, grape or quality word; without the producer, the name must match on a word of
  its own, so "Chianti Classico Riserva" alone suggests nothing. Choosing one takes its name and
  producer, and the rest where the form was empty or held only the scan's guess.
- **While typing** producer or wine name in the form, matching producers and wines from the list
  are suggested; picking a wine fills what the form still lacks.
- **Claude reading a label** may give its own window and taste for the wine it recognises. They
  are used when plausible (within 100 years of the vintage, taste between 1 and 5); otherwise the
  rules above fill in.

## Limits

- Blends are averaged; climate and producer style aren't considered (a Chablis and a Californian
  Chardonnay get the same profile).
- The tables are general wine knowledge, not critics' or vintage-chart data, which is copyrighted.
- Prices are compared as numbers, whatever the currency.
