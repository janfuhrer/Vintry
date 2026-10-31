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
npm run lint      # formatting and lint
npm run check     # types
npm test          # unit tests
npm run build     # production build
npm run test:e2e  # end-to-end, needs a throwaway database (see README)
npm run test:ocr  # label scanning on rendered labels, when you touch parsing or OCR
```

CI runs the same steps, plus CodeQL, a secret scan, a dependency review and a container scan.

### Label scanning tests

`tests/ocr/labels.mjs` holds synthetic front labels, each with what a scan should find.
`npm run test:ocr` renders every label at three sizes, as a photo on a table (4°) and as a
tilted photo (12°), runs the same OCR passes as the app and compares. Clean renders must match
exactly; on small, photographed and tilted ones a field may be missing but never wrong.

- `OCR_ONLY=napa,alsace npm run test:ocr` runs just those labels while you work on them.
- Fonts differ between systems, and CI runs on Linux: a label that passes on your machine can
  fail there. Check with Debian's fonts before pushing a parser change (`fonts-dejavu-core`,
  `fonts-liberation`, e.g. in a `node:24-bookworm` container).
- `hardTilt: true` marks a label whose 12° case can't be read yet; it still runs at 4°.

- Keep pull requests focused on one change.
- Add user-facing text to **both** dictionaries in `src/lib/i18n.ts` (English and German).
- Database changes are new entries at the end of `src/lib/server/migrations.ts`. Never edit an applied migration.
- Grape and region data live in `src/lib/data/`. Corrections are very welcome.
- Write commit messages in the imperative ("Add region filter"), and say _why_ in the body.

## Licence of contributions

By contributing, you agree that your contribution is licensed under the
[AGPL-3.0-or-later](LICENSE), the same licence as the project.
