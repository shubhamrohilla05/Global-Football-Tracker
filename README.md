# ⚽ PitchPulse — Global Football Activity Tracker

Every football match worldwide, organized by country and region. Domestic leagues, international fixtures, squads, players to watch, and where to tune in — all in one modern web app.

## Architecture

```
API-Football (api-sports.io)
        │
        ▼ scheduled sync jobs (cron / manual)
  ┌──────────────┐
  │  PostgreSQL   │  ← Prisma ORM
  │  (Neon free)  │
  └──────┬───────┘
         │ reads only (0 API calls per page load)
         ▼
  Next.js 16 (App Router, React 19, Tailwind v4)
  ┌──────┴──────────────────────────────────┐
  │  /           Home — today's fixtures      │
  │  /international  International hub       │
  │  /fixtures      All fixtures by region   │
  │  /region/[r]    Region detail            │
  │  /country/[c]   Country leagues          │
  │  /league/[id]   League fixtures+standings│
  │  /team/[id]     Squad + Player to Watch   │
  │  /match/[id]    Match detail              │
  │  /watch         Broadcast guide           │
  └───────────────────────────────────────────┘
```

**Key principle:** The UI never hits the upstream API. All football data lives in your own Postgres database, populated by budget-gated sync jobs. This keeps you within API-Football's free tier (100 requests/day) and makes page loads instant.

### Data source

| API | Used for | Free tier |
|-----|----------|-----------|
| [API-Football](https://api-sports.io) | Fixtures, standings, squads, players, stats — 1,200+ leagues, all internationals | 100 req/day |
| [TheSportsDB](https://www.thesportsdb.com) | Team/league logo fallbacks | 100 req/min |

### Broadcast data

No comprehensive free broadcast-rights API exists. PitchPulse uses a **curated map** of `{competition → country → official broadcaster}` seeded from Wikipedia and official league sources. Coverage is per-competition (not per-fixture) and labeled honestly. See the `/watch` page.

## Getting Started

### Prerequisites

- Node.js ≥ 18
- An [API-Football](https://api-sports.io) account (free key)
- A [Neon](https://neon.tech) database (free Postgres)

### 1. Install & configure

```bash
git clone <repo-url>
cd global-football-activity-tracker
npm install
cp .env.example .env
```

Edit `.env` with your credentials:

```env
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/football?sslmode=require
API_FOOTBALL_KEY=your_api_sports_key
```

### 2. Initialize the database

```bash
npx prisma db push   # creates tables from schema
npx prisma generate   # generates the Prisma client
```

### 3. Sync football data

```bash
npm run sync   # pulls leagues, fixtures, standings, squads from API-Football
```

### 4. Start developing

```bash
npm run dev   # → http://localhost:3000
```

## Sync Architecture

The free tier (100 req/day) can't cover all 1,200+ leagues deeply every day. The sync layer handles this via a **priority system**:

| Priority | Coverage | Sync depth | Frequency |
|----------|----------|------------|-----------|
| **MAJOR** | ~15 top domestic leagues + marquee internationals | Fixtures, standings, results, squads | Daily |
| **STANDARD** | Secondary domestic leagues | Fixtures + standings only | Daily |
| **MINOR** | Everything else (deferred) | Fixtures only, rotating across days | When budget allows |

Every API call is logged to `ApiCallLog`. The client **refuses** to exceed `API_FOOTBALL_DAILY_LIMIT` — a `BudgetExhaustedError` is thrown and the sync exits cleanly.

### Upgrading to a paid key

```env
API_FOOTBALL_KEY=your_paid_key
API_FOOTBALL_DAILY_LIMIT=7500   # Pro plan = 7,500/day
```

Zero code changes. Add more leagues to `MAJOR_LEAGUE_IDS` in `src/lib/api-football/leagues.ts` and the sync picks them up automatically.

### Production cron

The sync can be triggered via:

- **Vercel Cron** — add a `vercel.json` with `crons` config
- **cron-job.org** — free external cron pinging an API route
- **GitHub Actions** — scheduled workflow

## Project Structure

```
src/
├── app/                         # Next.js App Router pages
│   ├── layout.tsx               # Root layout (nav + footer)
│   ├── page.tsx                 # Landing page
│   ├── globals.css              # Design system (dark sports theme)
│   ├── international/page.tsx
│   ├── fixtures/page.tsx
│   ├── watch/page.tsx
│   └── region/[region]/page.tsx
├── components/
│   ├── layout/                   # Navbar, Footer
│   └── ui/                      # Reusable: FixtureRow, TeamLogo, StatusBadge, etc.
├── lib/
│   ├── api-football/
│   │   ├── client.ts            # Typed API-Football client + budget tracking
│   │   ├── leagues.ts           # Which leagues to sync (configurable)
│   │   └── country-region.ts    # Country → region mapping
│   ├── db.ts                    # Prisma client singleton
│   ├── env.ts                   # Env validation (Zod)
│   └── utils.ts                 # Formatting helpers
└── scripts/
    └── sync.ts                  # Manual sync runner (npm run sync)
prisma/
└── schema.prisma                # Full data model
```

## Tech Stack

- **Next.js 16** — App Router, React Compiler, Turbopack
- **React 19** — Server Components + Client islands
- **Tailwind CSS v4** — CSS-based config, no tailwind.config.ts needed
- **Prisma 6** — PostgreSQL ORM with Neon serverless driver
- **Lucide React** — SVG icon library
- **Zod** — Runtime env validation

## License

Football data © API-Football / api-sports.io. For informational use only. Broadcast information may be incomplete — always verify with official sources.
