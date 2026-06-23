# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

> **Next.js version warning (from AGENTS.md):** This is Next.js 16 with breaking changes from older versions. Before writing App Router / React Server Component code, read the relevant guide in `node_modules/next/dist/docs/`. Don't assume APIs match your training data.

## Commands

```bash
npm run dev              # Next.js dev server → http://localhost:3000
npm run build            # production build
npm run lint             # eslint (flat config via eslint-config-next)

npm run db:generate      # prisma generate (regenerate client after schema edits)
npm run db:push          # push schema.prisma → database (no migration files)
npm run db:studio        # Prisma Studio GUI

npm run sync             # run the daily deep sync against API-Football
npm run sync -- --squads # daily deep sync + weekly squad refresh
npm run seed:broadcasters # seed the curated broadcaster map
```

After editing `prisma/schema.prisma`, run `npm run db:generate` (and `npm run db:push` to apply). There is no test suite.

## The core invariant

**The UI reads only from Postgres; it never calls API-Football.** All upstream data is pulled by budget-gated sync jobs into the DB, and pages query the DB via the data-access layer. This keeps the app inside API-Football's free tier (100 req/day) and makes page loads instant. When adding a feature, fetch from the DB through `src/lib/data/*`, not from `src/lib/api-football/*` (which is sync-only).

## Architecture

Two halves connected only by Postgres:

**1. Sync (write path)** — `src/lib/api-football/` + `src/sync/` + `src/scripts/`
- `client.ts` is the *only* place that talks to API-Football. Every call goes through `request()`, which hard-gates on the remaining daily budget (`callsRemainingToday()` reads the `ApiCallLog` ledger) and throws `BudgetExhaustedError` when exhausted. Budget is charged *after* a successful call so failed retries don't burn it. The typed `af` object exposes one wrapper per endpoint we consume.
- `src/sync/runner.ts` orchestrates jobs (`leagues → fixtures + standings → squads`) in priority order, recording each in `SyncRun`. It re-checks budget between every league and stops cleanly when exhausted; the next run resumes where it left off.
- `src/lib/api-football/leagues.ts` defines *which* leagues sync and how deeply via `MAJOR_LEAGUE_IDS` / `STANDARD_LEAGUE_IDS` / `INTERNATIONAL_LEAGUE_IDS` (API-Football's stable league IDs). Expanding coverage = add IDs here; no other code changes needed.
- Triggered by `npm run sync` (`src/scripts/sync.ts`) for local/manual runs, or `POST /api/sync` (`src/app/api/sync/route.ts`, secret-protected) for Vercel/external cron.

**2. UI (read path)** — `src/app/` + `src/components/` + `src/lib/data/`
- Pages are React Server Components that call helpers in `src/lib/data/` (`fixtures.ts`, `structure.ts`, `teams.ts`, `broadcasters.ts`). These run Prisma queries and map rows to component prop shapes (e.g. `toFixtureRow`). Add new read queries here rather than inlining Prisma in pages.
- `src/components/ui/` holds reusable presentational pieces (`FixtureRow`, `TeamLogo`, `StatusBadge`, `StandingTable`, …); `src/components/layout/` holds nav/footer.
- Client-side state (favorites, preferred country) lives in `use-preferences.ts` / `favorite-button.tsx` — small client islands inside otherwise-server pages.

**Data model** — `prisma/schema.prisma` is the source of truth and heavily commented. Key relationships: `Country` (grouped into a `Region` enum) → `League` (with `SyncPriority`) → `Season` → `Fixture` / `Standing`; `Team` → `SquadEntry` → `Player`. `International` is modeled as a pseudo-country/region (`WORLD`). `Broadcaster` is a curated per-`(league, countryCode)` map (no free per-fixture TV API exists). `ApiCallLog` and `SyncRun` are operational ledgers for budget tracking.

## Conventions

- Import alias `@/*` → `src/*`.
- Env is validated centrally in `src/lib/env.ts` (Zod). `DATABASE_URL` and `API_FOOTBALL_KEY` are *optional* in the schema and enforced at the sync boundary instead — the UI is expected to render (with empty states) without them. Read config through `env` / `hasApiConfig()` / `hasDbConfig()`, not `process.env` directly.
- `src/lib/db.ts` exports a singleton `prisma` (guards against connection exhaustion under HMR). Always import from there.
- Fixture status uses API-Football short codes; `src/lib/data/fixtures.ts` defines the canonical `LIVE_STATUSES` / `FINISHED_STATUSES` groupings — reuse them.
- All date math is UTC (`setUTCHours`, `Date.UTC(...)`) to keep "today" consistent with the API and budget reset.
- Upgrading to a paid API tier is config-only: raise `API_FOOTBALL_DAILY_LIMIT` and add league IDs in `leagues.ts`.
