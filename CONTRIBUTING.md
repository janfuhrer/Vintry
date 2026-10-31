# Contributing

Thanks for helping. Vintry aims to stay small, so please open an issue to discuss
larger changes before you write the code.

## Principles

- **Usability first.** Few words, no sommelier jargon, big touch targets.
- **Private.** No external requests, no tracking, and no data shared between users.
- **Light.** No CSS framework and no web fonts. Add a dependency only when it clearly earns its place.

## Setup

See the [README](README.md#quick-start-development). You need Node.js 22.17+ and PostgreSQL.

## Before you open a pull request

```sh
npm run check   # types
npm test        # unit tests
npm run build   # production build
```

CI runs the same steps, plus CodeQL, a secret scan, a dependency review and a container scan.

- Keep pull requests focused on one change.
- Add user-facing text to **both** dictionaries in `src/lib/i18n.ts` (English and German).
- Database changes are new entries at the end of `src/lib/server/migrations.ts`. Never edit an applied migration.
- Grape and region data live in `src/lib/data/`. Corrections are very welcome.
- Write commit messages in the imperative ("Add region filter"), and say *why* in the body.

## Licence of contributions

By contributing, you agree that your contribution is licensed under the
[AGPL-3.0-or-later](LICENSE), the same licence as the project.
