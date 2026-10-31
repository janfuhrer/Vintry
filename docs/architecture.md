# Architecture

Vintry is one SvelteKit app (server and client) backed by one PostgreSQL database.
There is no separate API service, no object storage and no third-party request.

## Stack

| Part      | Choice                                     | Notes                                                             |
| --------- | ------------------------------------------ | ----------------------------------------------------------------- |
| Framework | SvelteKit 3, Svelte 5 (runes), TypeScript  | Config in `vite.config.ts`. Imports use `#lib/…` subpath imports. |
| Server    | `@sveltejs/adapter-node`                   | Runs as a plain Node process, see `Dockerfile`.                   |
| Database  | PostgreSQL via `postgres` (postgres.js v4) | Raw SQL, no ORM.                                                  |
| Auth      | WebAuthn passkeys via `@simplewebauthn/*`  | Discoverable credentials, no passwords.                           |
| OCR       | `tesseract.js` in the browser              | Engine and language data are self-hosted under `/ocr/`.           |
| Claude    | `@anthropic-ai/sdk` on the server          | Optional label reading, per-user opt-in and monthly allowance.    |
| Styling   | Plain CSS, system fonts                    | Tokens in `src/lib/styles/app.css`, light and dark.               |

## Layout

```
src/
  env.ts                  DATABASE_URL, APP_URL (validated at start)
  hooks.server.ts         migrations + bootstrap (init), session, auth guard, headers (handle)
  service-worker.ts       cache-first for build output and /ocr/, network for everything private
  lib/
    data/                 grapes, regions, countries (static tables)
    wine.ts               lookups, drinking window, taste suggestion, serving temperature, flags
    parse.ts              OCR lines → wine fields
    ocr-lines.ts          OCR result → lines; when to run the inverted second pass
    ocr.ts, image.ts      browser-only: tesseract worker, photo resizing
    csv.ts, import.ts     CSV writing/parsing, spreadsheet → wine fields
    dates.ts              local calendar dates
    match.ts              a scanned label → a wine the user already has
    offline.ts            which pages the service worker keeps for reading offline
    i18n.ts               en/de dictionaries, exposed through Svelte context
    components/           WineForm, WineCard, Dots, Stars, WindowBar, Sheet, InstallHint, …
    server/
      db.ts, migrations.ts
      auth.ts             sessions, invites, challenges, bootstrap invite
      webauthn.ts         relying-party config from APP_URL
      wines.ts            all wine/drink queries (always scoped by user_id)
      zip.ts              streamed ZIP writer for the photo export (stored entries, no ZIP64)
      claude.ts           label reading by Claude: who may use it, the call, the monthly allowance
      claude-label.ts     what Claude is asked (prompt, schema) and how its answer is checked
      wine-form.ts        validation of the wine form (also used per row by the import)
      device.ts           user agent → "iPhone · Safari"
      ratelimit.ts        in-memory limiter for /api/auth/*
  routes/
    /                     cellar (search, colour filter, grouping run client-side)
    /add                  scan or enter manually
    /wine/[id]            detail, rate, drink one, history
    /wine/[id]/edit
    /history              this year's stats, drinks by month
    /settings             language, passkeys, devices, import/export, account, invites (admin)
    /grapes, /grapes/[slug], /regions/[slug]   the built-in tables as pages, with your wines
    /export/[file]        wines.csv, drinks.csv, vintry.json (own data only)
    /api/label            label photos → Claude → form fields (opted-in users only)
    /login, /invite/[token], /api/auth/*
    /photo/[id]           owner-only JPEG, immutable caching via a version parameter
    /healthz, /readyz     liveness (process) and readiness (database) probes
```

## Data model

Migrations live in `src/lib/server/migrations.ts` (append only: 001 schema, 002 session device
info). They run in the `init` hook under a Postgres advisory lock, so several instances can start
at once.

- `users`: name, WebAuthn user handle, admin flag, locale, label reader (`local` or `claude`) and
  when the user agreed to Claude
- `claude_usage`: requests and tokens per user and calendar month (UTC)
- `credentials`: passkeys (public key, counter, transports, device label)
- `sessions`: `id = sha256(token)`; the token itself lives only in the cookie. 30-day sliding expiry,
  user agent and last activity for the device list in settings.
- `invites`: `id = sha256(token)`, single use, optionally for an existing user ("add a device")
- `challenges`: single-use WebAuthn challenges, referenced from a short-lived httpOnly cookie
- `wines`: one row per wine per user, with quantity, window, taste, rating and private notes
- `wine_photos`: JPEG and thumbnail, both in the database so database backups cover them
- `drinks`: one row per bottle opened. "Drink one" decrements `quantity` in the same transaction.

## Authentication

- `handle` resolves the session cookie (`__Host-vintry` in production) to `locals.user`.
  **The guard lives there**, not in layout loads, so it also protects form actions and endpoints.
  Pages redirect to `/login`; `/api/*` and `/photo/*` answer 401.
- **Login:** `POST /api/auth/login/options` → `startAuthentication()` → `POST /api/auth/login/verify`.
- **Sign-up:** `/invite/[token]` → register options → `startRegistration()` (resident key required) →
  verify. One transaction marks the invite used (`… where used_at is null returning`), creates the user
  or attaches to the existing one, stores the credential and starts a session.
- **Bootstrap:** on an empty database, `init` logs a 24-hour admin invite.
- CSRF protection comes from SvelteKit's origin check on form posts and `SameSite=Lax` cookies.

## Wine logic

- Drinking window = vintage + (`region.age` ?? average of the grapes' ages ?? a colour default).
  Status: _wait_, _ready_, _drink soon_ (last year of the window), _past peak_.
- Taste suggestion: the average of the known grapes, or the region's typical grapes.
  The form keeps suggesting until the user changes a taste or window field.
- OCR (`ocr.ts`): tesseract.js in sparse-text mode on a 2200 px copy of the photo; if that finds
  almost nothing (light text on a dark label), a second pass on an inverted, contrast-stretched copy.
- Claude (optional, `claude.ts`): with `ANTHROPIC_API_KEY` set, a user can choose Claude in
  settings, after agreeing that the photos are sent to Anthropic. The add page then posts the
  1280 px photo (front, plus back for "scan the back label") to `/api/label`; the server sends it
  with a fixed system prompt and a JSON schema (structured output) and books the tokens to the user's
  month. The answer is checked like user input (`claude-label.ts`): canonical region, country and
  grape names, implausible values dropped, missing window and taste suggested as for a typed wine.
  When Claude can't answer or the allowance is spent, the phone reads the label as before.
- Parsing (`parse.ts`): accent-stripped matching against grape, region and country names
  (longest match first, in one pass), regexes for vintage, alcohol and bottle size (with common OCR
  misreadings), estate words for the producer, and the tallest line that isn't appellation or origin
  boilerplate as the wine's name. Implausible values are dropped rather than guessed.

## Tests

- `npm test`: Vitest unit tests next to the code (parser, wine logic, form validation, CSV, …).
- `npm run test:e2e`: the production build against a throwaway PostgreSQL, driven over HTTP with a
  software passkey authenticator (`tests/e2e`).
- `npm run test:ocr`: renders sample labels (clean, small and as tilted photos), runs the app's OCR
  setup on them and checks the parsed fields (`tests/ocr`).

## Security headers

Content Security Policy via SvelteKit (`vite.config.ts`). `script-src` allows `'wasm-unsafe-eval'`
only, for the OCR engine. `handle` adds HSTS, `nosniff`, `Referrer-Policy: same-origin`,
`Permissions-Policy` (camera only), `X-Frame-Options: DENY` and `COOP: same-origin`.

## PWA

`static/manifest.webmanifest`, icons rendered from `static/logo.svg` by `scripts/icons.mjs`.
The OCR engine is cached on first use under a name that carries the tesseract version.

Reading pages (cellar, wine, history, grapes, regions) are fetched network first; the service
worker keeps the last copy of each (`src/lib/offline.ts`) so the cellar can be read without signal.
Data (`__data.json`) is kept across builds, HTML only per build, because it references that build's
scripts; after activation the new build saves the cellar and history pages once. A response that
takes longer than 4 s is answered from the copy when there is one (one bar of signal can stall a
request for a minute); the copy is refreshed in the background either way, so the page never waits
for the cache. Only real page data is kept: not Kit's redirect answers, not data with a load error.
A clear bumps a counter, so a save that set out before it can't bring old copies back. The copies stay on the device and are dropped on any redirect to sign-in,
when `/login` or an invite is opened, and when the sign-in page loads, so a shared device doesn't
show the previous person's cellar. Settings, forms and exports are never saved; photos rely on their
`immutable` HTTP cache headers.

## Operations

- `/healthz` answers without touching the database (liveness); `/readyz` checks it (readiness).
- Static build files are served precompressed (Brotli/gzip) by adapter-node; `handle` gzips
  GET pages, page data and exports itself. Action responses stay uncompressed: they can hold a
  fresh invite link next to text the user typed, the mix compression side channels need.
- On SIGTERM adapter-node stops accepting requests; the database pool is closed afterwards so the
  process exits promptly.
- The container runs as an unprivileged user and works with a read-only root filesystem.
