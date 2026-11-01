# Reference list of wines

`xwines.tsv.gz` is Vintry's list of about 100,000 wines, used to fill in what a scanned label
didn't say (grapes above all, also alcohol, type, country and region) and to complete wines added
by import or over MCP. The server loads it into the database on start (`ref_wines`) and only
answers lookups from it; nothing about a lookup leaves the server.

## Source and licence

Built from the X-Wines dataset, released under CC0 1.0 (public domain) by its authors:

> de Azambuja, R.X.; Morais, A.J.; Filipe, V. X-Wines: A Wine Dataset for Recommender Systems and
> Machine Learning. _Big Data and Cognitive Computing_ 2023, 7, 20.
> https://doi.org/10.3390/bdcc7010020

The authors collected the data on the open web in 2022 and note that they are not responsible for
its accuracy. Vintry uses it only to suggest values, which the user can change, and only when a
wine matches clearly.

## Contents

Tab-separated, gzip-compressed, one wine per line: `producer`, `name`, `color` (red, white, rose,
sparkling, sweet, fortified), `country` (ISO code), `region`, `grapes` (separated by `|`),
`alcohol` (% vol, only between 3 and 25), `body` (1–5). Left out of the original: acidity (79 %
of the wines say "High", which tells nothing), food pairings, websites, vintages and ids.

## Rebuilding

Download `XWines_Full_100K_wines.zip` from the dataset's
[repository](https://github.com/rogerioxavier/X-Wines) (the full version is linked from there),
unpack it and run:

```sh
node scripts/xwines.mjs path/to/XWines_Full_100K_wines.csv
```

A changed file is loaded again on the next start.
