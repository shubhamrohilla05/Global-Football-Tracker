# Scrapers

Free, current-season data for the tracker — without a paid API-Football plan.

The API-Football free tier only exposes seasons 2022–2024, so these scripts
pull match data from free, stable public feeds and write it into the **same Neon
Postgres** the Next.js app reads from.

| Script | Source | Covers |
|--------|--------|--------|
| `scrape.py` | [football-data.co.uk](https://www.football-data.co.uk) (CSV) | Club leagues: **Premier League** (E0), **La Liga** (SP1), **Serie A** (I1), **Bundesliga** (D1), **Ligue 1** (F1), **Eredivisie** (N1), **Primeira Liga** (P1), **Championship** (E1) |
| `scrape_international.py` | [openfootball](https://github.com/openfootball) (JSON) | International: **World Cup** (id 1), **Euro** (id 4) |

For club leagues, standings are **computed from the results**, so the table
always matches the stored fixtures.

> **Why not scrape Google / official sites?** Google's match panels and the
> official tournament sites are JS-rendered, sit behind anti-bot protection, and
> scraping them is against their ToS — brittle to maintain. The feeds above
> publish the same match facts as plain CSV/JSON at stable URLs, which is far
> more robust. (Same trade-off the app's own AGENTS notes call out.)

## Setup

```bash
cd scrapers
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
```

`DATABASE_URL` is read from the project's `../.env` (same DB as the app).

## Run

```bash
.venv/bin/python scrape.py                # club leagues (EPL + La Liga)
.venv/bin/python scrape_international.py   # international (World Cup + Euro)
```

Both are idempotent — re-run anytime to refresh. `scrape.py` upserts fixtures by
id and recomputes standings from scratch each run; `scrape_international.py`
upserts fixtures by id and gives each nation a stable hash-based team id, so
repeated runs never duplicate or orphan rows.

## How data maps to the schema

| Source (CSV column) | DB (`prisma/schema.prisma`) |
|---------------------|------------------------------|
| `HomeTeam`/`AwayTeam` | `Team` (synthetic stable ids: `leagueId*1000 + n`) |
| one match row | `Fixture` (id: `leagueId*1_000_000 + n`, status `FT`/`NS`) |
| `FTHG`/`FTAG`, `HTHG`/`HTAG` | `goalsHome/Away`, `htHome/Away` |
| computed from results | `Standing` (rank, points, GD, form, etc.) |

The season is stored as year `2025` (= 2025/26) and `League.currentSeason` is
set to match, which is what the app's standings query keys on.

For internationals (`scrape_international.py`), each openfootball match maps to a
`Fixture` (id `competitionId*1_000_000 + n`, status `FT` when a full-time score
exists else `NS`, `round` = the group label or knockout round). National teams
become `Team` rows with no parent country (the competition itself lives under
the `world` pseudo-code). Undrawn knockout/group slots (`"2A"`, `"W74"`,
`"A1"` — anything containing a digit) are skipped, and a season is only used
once at least `MIN_REAL_MATCHES` are drawn, so a not-yet-drawn future
tournament falls back to the most recent completed edition. Standings are **not**
computed (the /international page shows upcoming + recent fixtures, not tables).

## Adding a competition

- **Club league:** add an entry to `LEAGUES` in `scrape.py` with the
  football-data.co.uk code (e.g. Bundesliga `D1`, Serie A `I1`, Ligue 1 `F1`)
  and the matching API-Football `id`/country already used by the app.
- **International:** add an entry to `COMPETITIONS` in `scrape_international.py`
  with the API-Football league `id`, the openfootball `repo`/`file`, and the
  `seasons` to try newest-first. Any openfootball JSON dataset following the
  `{name, matches[]}` shape works.

## Caveats

- football-data.co.uk's 2025/26 club season is complete, so the app's
  *date-windowed* views (home "Today's fixtures", the league page's ±2-week
  lists) are empty in the June off-season. Standings and match data are fully
  populated; browse `/league/39` or `/league/140`.
- openfootball is community-maintained and reflects the current tournament's
  state at last commit — completed matches carry final scores, upcoming ones
  don't, but it is **not** a live in-play feed (no minute-by-minute scores).
  Only World Cup + Euro are published as JSON; Copa América, AFCON, Nations
  League etc. would need a different source.
- No team logos from either source (rendered as fallbacks in the UI).
