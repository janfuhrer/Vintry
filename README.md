<p align="center">
  <img src="static/logo.svg" width="96" height="96" alt="Vintry logo">
</p>

<h1 align="center">Vintry</h1>

<p align="center">
  A slim, private wine cellar for your phone.<br>
  Scan a label, keep your bottles, log what you drank.
</p>

<p align="center">
  <a href="https://github.com/janfuhrer/Vintry/actions/workflows/ci.yml"><img src="https://github.com/janfuhrer/Vintry/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/janfuhrer/Vintry"><img src="https://api.scorecard.dev/projects/github.com/janfuhrer/Vintry/badge" alt="OpenSSF Scorecard"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0--or--later-blue" alt="License: AGPL-3.0-or-later"></a>
</p>

<p align="center">
  <img src="static/screenshots/cellar.jpg" width="200" alt="Cellar with a drink-now strip and status per wine">
  <img src="static/screenshots/wine.jpg" width="200" alt="A wine with its drinking window, serving temperature and food pairing">
  <img src="static/screenshots/grape.jpg" width="200" alt="Grape page with profile, aromas and typical regions">
  <img src="static/screenshots/history.jpg" width="200" alt="History with this year's statistics">
</p>

---

## Features

- **Scan a label.** Text recognition runs on your device (tesseract.js), so no photo leaves your phone. Scan the back label too, or crop a cluttered photo to the label and read it again. Scan a wine you already have and it offers to add a bottle to it.
- **A reference list of 100,000 wines.** A scanned or imported wine that matches one clearly by producer and name gets its grapes, alcohol, region and country filled in, and with the grapes better taste and window suggestions. It runs on Vintry's server; nothing leaves it.
- **Barcodes.** A scan also reads the bottle's barcode on the phone and keeps it, so the same bottle is recognised next time. Optionally, per person, Vintry's server looks the barcode up on [Open Food Facts](https://world.openfoodfacts.org) to fill in what the label didn't show (mostly supermarket wines).
- **Or let Claude read it (optional).** If the server has a Claude API key, each person can choose in settings to have label photos read by Claude instead. It recognises the wine and fills in grapes, drinking window and taste too. Only the photos are sent, only after the person agrees, and each person has a monthly allowance.
- **Smart defaults.** A built-in table of about 80 grapes and 110 regions, plus the quality and sweetness words on the label and the price, suggests the drinking window, taste profile, serving temperature and food pairings. You can override everything. [How the suggestions are worked out](docs/wine-rules.md).
- **Add wines with Claude.** Vintry is an MCP server: connect Claude Code or Claude Desktop with a personal token from settings, and Claude can look up your wines and add many at once, from photos of labels, a receipt or a wine list, on your own Claude account.
- **Maps.** Every wine shows where it comes from: its region marked on an outline of the country. A regions page lets you explore the important regions of each country and shows which ones your cellar covers.
- **Find what to open.** Search the cellar by name, grape, region, place or note, or by a dish: "raclette" finds the Chasselas.
- **Drinking window at a glance.** Wait, ready, drink soon or past peak, with a bar that shows where this year sits.
- **Drink log.** "Drink one" takes a bottle out of the cellar and records the date, your rating and a note (with undo). The history shows each year's bottles, ratings, favourite grape and country.
- **Wishlist.** Keep wines you want but don't own yet apart from the cellar, and mark them bought later.
- **Private by design.** Every person has their own cellar. Sign-in is by passkey only, and new accounts come from invite links.
- **Your data stays yours.** Export the cellar and history as CSV or JSON and the photos as a ZIP, import an existing spreadsheet or a Vivino export, delete your account any time.
- **Installable PWA.** Works like an app on iOS and Android, in English and German. The cellar stays readable without signal, from a copy kept on your phone.
- **Self-contained.** No external requests from the browser: no CDN, no web fonts, no analytics. The server calls the Claude API and Open Food Facts only for people who opted in to them.

## Quick start (development)

Requirements: Node.js 22.17 or newer and PostgreSQL 14 or newer.

```sh
git clone https://github.com/janfuhrer/Vintry.git
cd Vintry
npm ci
export DATABASE_URL=postgres://vintry@localhost:5432/vintry
npm run dev
```

On first start, with an empty database, the server logs a one-time admin invite:

```
[vintry] No users yet. Open this link within 24 h to create the admin account:
http://localhost:5173/invite/…
```

Open it, choose a name and create a passkey. From then on, invite people from **Settings**.

Passkeys work on `localhost` over plain HTTP. Any other host needs HTTPS.

## Configuration

| Variable                | Required          | Description                                                                                                                                                                         |
| ----------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`          | yes               | PostgreSQL connection string. The schema is migrated on start.                                                                                                                      |
| `APP_URL`               | yes in production | Public origin, e.g. `https://vintry.example.com`. Passkeys are bound to its host name, so changing it later makes existing passkeys stop working. Default: `http://localhost:5173`. |
| `BODY_SIZE_LIMIT`       | no                | Maximum request size. Photos need about `2M` (the Docker image sets this).                                                                                                          |
| `PORT`                  | no                | Listening port of the production server. Default: `3000`.                                                                                                                           |
| `ANTHROPIC_API_KEY`     | no                | Turns on label reading by Claude. Each person still chooses it in settings and agrees to the photos being sent.                                                                     |
| `CLAUDE_MODEL`          | no                | Model for reading labels. Default: `claude-opus-5-5`.                                                                                                                               |
| `OPEN_FOOD_FACTS_URL`   | no                | Where barcodes are looked up for people who turned it on. Default: `https://world.openfoodfacts.org`; the e2e tests point it at a stand-in.                                         |
| `CLAUDE_MONTHLY_TOKENS` | no                | Tokens each person may spend on Claude per calendar month (UTC); after that, labels are read on the phone again. A scan takes about 5,000. Default: `250000`.                       |

The production server is the SvelteKit Node adapter. Behind a reverse proxy it uses the `Host` header and assumes HTTPS. See the [adapter-node docs](https://svelte.dev/docs/kit/adapter-node) for `PROTOCOL_HEADER`, `HOST_HEADER` and `ADDRESS_HEADER`.

## Claude and other MCP apps

Vintry answers the [Model Context Protocol](https://modelcontextprotocol.io) at `/api/mcp`
(Streamable HTTP). It offers two tools, `search_wines` and `add_wines` (up to 200 wines per call,
checked like the form; a wine already in the cellar gets the bottles added). Each user creates a
personal access token under **Settings → Connect Claude**; it acts for that user only and can be
revoked there.

- **Claude Code:** settings shows the command, e.g.
  `claude mcp add --transport http vintry https://vintry.example.com/api/mcp --header "Authorization: Bearer vintry_…"`.
- **Claude Desktop** starts MCP servers as local programs: download `vintry-mcp.mjs` from settings
  (Node.js 18+, no dependencies) and add the shown snippet under `mcpServers` in its config. The
  script passes the messages on to your server with the token.

## Lost passkeys

- **Someone else lost their phone:** an admin opens Settings → People → _Device link_ and passes
  the one-time link on. Opened on the new device, it adds a passkey to that person's account.
- **The only admin lost every passkey:** set `RECOVERY_USER=<name>` and restart. The server logs a
  one-time device link for that user, like the first-start invite. Remove the variable afterwards.

## Deployment

The `Dockerfile` builds a small production image that runs as a non-root user on port 3000:

```sh
docker build -t vintry .
docker run -p 3000:3000 \
  -e DATABASE_URL=postgres://user:pass@db/vintry \
  -e APP_URL=https://vintry.example.com \
  vintry
```

Put it behind a TLS-terminating proxy. Photos are stored in PostgreSQL, so backing up the database backs up everything.

## Development

| Command            | What it does                                                    |
| ------------------ | --------------------------------------------------------------- |
| `npm run dev`      | Dev server with hot reload                                      |
| `npm run check`    | Type-check Svelte and TypeScript                                |
| `npm run lint`     | Prettier and ESLint (`npm run format` fixes formatting)         |
| `npm test`         | Unit tests (Vitest): label parsing, wine logic, form validation |
| `npm run test:e2e` | End-to-end tests against the production build, see below        |
| `npm run test:ocr` | Real OCR on rendered sample labels, checks what a scan fills in |
| `npm run build`    | Production build into `build/`                                  |
| `npm run icons`    | Re-render the PNG app icons from `static/logo.svg`              |

The end-to-end suite starts the production build against a **throwaway** PostgreSQL
database, which it wipes first, and drives sign-up, login, wines, drinks and invites with a
software passkey:

```sh
createdb vintry_e2e
npm run build
E2E_DATABASE_URL=postgres://localhost/vintry_e2e npm run test:e2e
```

The OCR engine and language data are copied from `node_modules` to `static/ocr/` before `dev` and `build`. They are not committed.

See [docs/architecture.md](docs/architecture.md) for how the pieces fit together, and [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## Security

Please report vulnerabilities privately. See [SECURITY.md](SECURITY.md).

## Credits

The reference list of wines (`data/`) is built from the X-Wines dataset (CC0): de Azambuja, R.X.;
Morais, A.J.; Filipe, V. X-Wines: A Wine Dataset for Recommender Systems and Machine Learning.
_Big Data Cogn. Comput._ 2023, 7, 20. https://doi.org/10.3390/bdcc7010020. Country outlines:
Natural Earth (public domain), via world-atlas. Barcode lookups, when turned on: Open Food Facts
(ODbL).

## License

Vintry is free software, licensed under the [GNU Affero General Public License v3.0 or later](LICENSE). If you run a modified version for others over a network, you must offer them its source code.
