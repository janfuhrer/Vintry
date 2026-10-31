# Vintry: notes for Claude Code

## Scope: this project only

Work on Vintry and nothing else. Concretely:

- **Files:** read and write only inside this repository, plus your session scratchpad and
  your memory folder for this project. Don't open, edit or create files anywhere else.
- **Git and GitHub:** only this repository (`janfuhrer/Vintry`). Don't clone, fetch from,
  comment on or otherwise touch other repositories, gists or accounts.
- **Hosting:** only this project's own deployment (see the private notes below). Never list,
  inspect or change other organizations, projects or apps, even when a tool can reach them.
- **Other tools and services:** use an MCP server or external service only when this
  project needs it. Work and customer systems are out of scope. If a task seems to need
  them, stop and ask.
- If a request would take you outside this project, say so and ask instead of doing it.

## Git

- You commit and push in this repository yourself. Use small, focused commits with a short
  imperative subject line, and explain _why_ in the body.
- Before committing, run `npm run lint`, `npm run check`, `npm test`, `npm run build` and
  `npm run test:e2e` (local throwaway database), and scan the diff
  for private data (hostnames of the deployment, account or org names, emails, tokens).
  The repository is public.
- Never force-push, rewrite published history or change repository settings.
- A push to `main` deploys to production. For risky changes, push a branch and open a
  pull request instead.

## Project

- Architecture: [docs/architecture.md](docs/architecture.md). Contributing rules:
  [CONTRIBUTING.md](CONTRIBUTING.md).
- SvelteKit 3: config in `vite.config.ts`, imports via `#lib/….ts`, env via `src/env.ts`.
- UI text goes in both `en` and `de` in `src/lib/i18n.ts`.
- Schema changes are new entries at the end of `src/lib/server/migrations.ts`.
- To check the UI, run the dev server against a throwaway local database, never production.

## Private notes

Deployment target, accounts and owner decisions are kept out of the public repository:

@.local/CLAUDE.md
