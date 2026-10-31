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
| Styling   | Plain CSS, system fonts                    | Tokens in `src/lib/styles/app.css`, light and dark.               |

## Layout

```
src/
  env.ts                  DATABASE_URL, APP_URL (validated at start)
  hooks.server.ts         migrations + bootstrap (init), session, auth guard, headers (handle)
  service-worker.ts       cache-first for build output and /ocr/, network for everything private
  lib/
    data/                 grapes, regions, countries (static tables)
    wine.ts               lookups, drinking window, taste suggestion, flags
    parse.ts              OCR text → wine fields
    ocr.ts, image.ts      browser-only: tesseract worker, photo resizing
    i18n.ts               en/de dictionaries, exposed through Svelte context
    components/           WineForm, WineCard, Dots, Stars, WindowBar, Sheet, …
    server/
      db.ts, migrations.ts
      auth.ts             sessions, invites, challenges, bootstrap invite
      webauthn.ts         relying-party config from APP_URL
      wines.ts            all wine/drink queries (always scoped by user_id)
      ratelimit.ts        in-memory limiter for /api/auth/*
  routes/
    /                     cellar (search, colour filter, grouping run client-side)
    /add                  scan or enter manually
    /wine/[id]            detail, rate, drink one, history
    /wine/[id]/edit
    /history              drinks by month
    /settings             language, passkeys, add a device, invites (admin)
    /login, /invite/[token], /api/auth/*
    /photo/[id]           owner-only JPEG, immutable caching via a version parameter
```

## Data model

Migration 001 in `src/lib/server/migrations.ts`. Migrations run in the `init` hook under
a Postgres advisory lock, so several instances can start at once.

- `users`: name, WebAuthn user handle, admin flag, locale
- `credentials`: passkeys (public key, counter, transports, device label)
- `sessions`: `id = sha256(token)`; the token itself lives only in the cookie. 30-day sliding expiry.
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
- OCR parsing (`parse.ts`): accent-stripped matching against grape, region and country names
  (longest match first), regexes for vintage, alcohol and bottle size, estate words for the producer,
  and the tallest remaining text line as the wine's name.

## Security headers

Content Security Policy via SvelteKit (`vite.config.ts`). `script-src` allows `'wasm-unsafe-eval'`
only, for the OCR engine. `handle` adds HSTS, `nosniff`, `Referrer-Policy: same-origin`,
`Permissions-Policy` (camera only), `X-Frame-Options: DENY` and `COOP: same-origin`.

## PWA

`static/manifest.webmanifest`, icons rendered from `static/logo.svg` by `scripts/icons.mjs`.
The service worker never caches pages, data or photos, because they are private.
