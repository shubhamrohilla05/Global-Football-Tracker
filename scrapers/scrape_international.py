#!/usr/bin/env python3
"""
International-football scraper for the Global Football Activity Tracker.

Pulls fixtures + results for the men's international competitions (World Cup,
European Championship, …) and writes them into the SAME Neon Postgres database
the Next.js app reads from — so the /international page and the per-competition
/league/<id> pages populate without a paid API-Football plan.

Why this source: the API-Football free tier only exposes seasons 2022–2024, so
the *current* World Cup is invisible to it. Rather than scrape Google's match
panels (JS-rendered, anti-bot, and against their ToS — brittle to maintain),
we read openfootball's free, public-domain JSON datasets
(https://github.com/openfootball) served from raw.githubusercontent.com at
stable URLs. Same philosophy as scrape.py's choice of football-data.co.uk over
the official club sites: pick the structured, stable feed.

It writes the Prisma-managed tables directly (PascalCase table names,
camelCase columns — hence all the double-quoting in the SQL below) and reuses
the international league ids the app already knows (World Cup = 1, Euro = 4),
so the scraped rows slot straight into the existing League records.

Usage:
    python scrape_international.py            # scrape every configured competition
"""
import json
import os
import ssl
import sys
import urllib.request
import zlib
from datetime import datetime, timedelta
from urllib.parse import urlparse, unquote

import pg8000.dbapi

# --------------------------------------------------------------------------
# Config
# --------------------------------------------------------------------------

# Each competition maps an openfootball repo to the API-Football league id the
# app already uses (so /league/<id> and the /international chips line up). For
# each one we try seasons newest-first and use the first that returns matches —
# so the script keeps working across tournament cycles without edits.
#
# Source URL pattern:
#   https://raw.githubusercontent.com/openfootball/<repo>/master/<dir>/<file>
#
# Adding a competition = add an entry here (no other code changes). openfootball
# publishes JSON for worldcup.json and euro.json today; point `repo`/`file` at
# any future openfootball JSON dataset that follows the same {name, matches[]}
# shape.
COMPETITIONS = [
    {
        "id": 1,
        "name": "World Cup",
        "repo": "worldcup.json",
        "file": "worldcup.json",
        "seasons": [("2026", 2026), ("2022", 2022), ("2018", 2018)],
    },
    {
        "id": 4,
        "name": "Euro Championship",
        "repo": "euro.json",
        "file": "euro.json",
        "seasons": [("2028", 2028), ("2024", 2024), ("2020", 2020)],
    },
]

RAW_BASE = "https://raw.githubusercontent.com/openfootball"
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"

# Synthetic-id bases (kept clear of API-Football's real ids and the club
# scraper's leagueId*1000 team ids, so nothing collides).
#
# A national team's id is derived from a stable hash of its name so the SAME
# nation always lands on the SAME id — across re-runs and no matter which
# competitions are scraped (Brazil is one Team row in every tournament). This
# avoids the orphaning you'd get from a positional/sorted-index scheme. The
# space is large vs. the ~few-hundred national teams, so collisions are
# vanishingly unlikely, and it stays within Postgres' 32-bit Int range.
TEAM_ID_BASE = 7_000_000
TEAM_ID_SPAN = 90_000_000       # team id ∈ [7M, 97M) — well inside int4
FIXTURE_ID_BASE = 1_000_000     # fixtures: competitionId * FIXTURE_ID_BASE + n


def team_id_for(name):
    return TEAM_ID_BASE + (zlib.crc32(name.strip().encode("utf-8")) % TEAM_ID_SPAN)

FINISHED_STATUS = ("FT", "Match Finished")
SCHEDULED_STATUS = ("NS", "Not Started")

# A season is only usable once its draw is essentially done. Future tournaments
# often list a handful of pre-determined fixtures (hosts, playoff slots) years
# ahead while the rest are undrawn placeholders; this floor skips those so we
# fall back to the most recent fully-drawn edition. Every major tournament's
# group stage alone clears this comfortably (Euro = 36, World Cup = 72).
MIN_REAL_MATCHES = 16


# --------------------------------------------------------------------------
# Env / DB connection (same approach as scrape.py)
# --------------------------------------------------------------------------


def load_env(path):
    env = {}
    if not os.path.exists(path):
        return env
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def connect(database_url):
    u = urlparse(database_url)
    ctx = ssl.create_default_context()
    return pg8000.dbapi.connect(
        user=unquote(u.username or ""),
        password=unquote(u.password or ""),
        host=u.hostname,
        port=u.port or 5432,
        database=(u.path or "/").lstrip("/"),
        ssl_context=ctx,
    )


# --------------------------------------------------------------------------
# Fetch + parse
# --------------------------------------------------------------------------


def fetch_json(repo, file, season_dir):
    url = f"{RAW_BASE}/{repo}/master/{season_dir}/{file}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = json.loads(r.read().decode("utf-8"))
    return data.get("matches", []), url


def fetch_with_fallback(comp):
    """Return the newest season that actually has *drawn* matches (real nations,
    not undrawn slot codes), so a not-yet-drawn future tournament falls back to
    the most recent real one."""
    for season_dir, year in comp["seasons"]:
        try:
            matches, url = fetch_json(comp["repo"], comp["file"], season_dir)
        except Exception as e:  # noqa: BLE001 - report and try the next season
            print(f"     · {comp['name']} {season_dir}: fetch failed ({e})")
            continue
        real = [
            m for m in matches
            if not is_placeholder(m.get("team1")) and not is_placeholder(m.get("team2"))
        ]
        if len(real) >= MIN_REAL_MATCHES:
            return real, year, url
        if real:
            print(f"     · {comp['name']} {season_dir}: only {len(real)} drawn "
                  f"match(es) — not drawn yet, trying older season")
    return [], None, None


def is_placeholder(team):
    """Knockout/group slots before the draw are coded like "2A", "A1", "W74",
    "L101", "3A/B/C/D/F" — i.e. they contain digits. Real national-team names
    never do, so any digit means it's an undrawn placeholder, not a nation."""
    t = (team or "").strip()
    return not t or any(ch.isdigit() for ch in t)


def parse_dt(date_str, time_str):
    """openfootball dates are "YYYY-MM-DD"; times are "HH:MM" or "HH:MM UTC-6".

    Prisma's DateTime maps to `timestamp without time zone` and the app treats
    stored values as UTC, so we normalise any UTC offset away and store naive
    UTC datetimes (matching scrape.py)."""
    try:
        base = datetime.strptime((date_str or "").strip(), "%Y-%m-%d")
    except ValueError:
        return None
    hour, minute, offset = 12, 0, 0
    parts = (time_str or "").split()
    if parts:
        try:
            t = datetime.strptime(parts[0], "%H:%M")
            hour, minute = t.hour, t.minute
        except ValueError:
            pass
        if len(parts) > 1 and parts[1].upper().startswith("UTC"):
            tail = parts[1][3:]
            try:
                offset = int(tail) if tail else 0
            except ValueError:
                offset = 0
    # A wall-clock time of `hour:minute` at UTC+offset is (hour - offset) UTC.
    return base.replace(hour=hour, minute=minute) - timedelta(hours=offset)


def score_pair(score, key):
    pair = (score or {}).get(key)
    if isinstance(pair, list) and len(pair) == 2:
        h, a = pair
        h = h if isinstance(h, int) else None
        a = a if isinstance(a, int) else None
        return h, a
    return None, None


# --------------------------------------------------------------------------
# DB upserts
# --------------------------------------------------------------------------

INSERT_TEAM = (
    'INSERT INTO "Team" (id, name, "countryId") VALUES (%s, %s, %s) '
    "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name"
)

INSERT_FIXTURE = (
    'INSERT INTO "Fixture" '
    '(id, "leagueId", "seasonId", "seasonYear", "date", timezone, '
    '"statusShort", "statusLong", round, "homeTeamId", "awayTeamId", '
    '"goalsHome", "goalsAway", "htHome", "htAway", venue) '
    "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) "
    "ON CONFLICT (id) DO UPDATE SET "
    '"statusShort" = EXCLUDED."statusShort", '
    '"statusLong" = EXCLUDED."statusLong", '
    'round = EXCLUDED.round, '
    '"homeTeamId" = EXCLUDED."homeTeamId", '
    '"awayTeamId" = EXCLUDED."awayTeamId", '
    '"goalsHome" = EXCLUDED."goalsHome", "goalsAway" = EXCLUDED."goalsAway", '
    '"htHome" = EXCLUDED."htHome", "htAway" = EXCLUDED."htAway", '
    'venue = EXCLUDED.venue, "date" = EXCLUDED."date", "syncedAt" = now()'
)


def ensure_league(cur, comp, year):
    """Refresh (or create) the international League row.

    International competitions have no parent country — they live under the
    "world" pseudo-code the app's getInternationalLeagues() query keys on."""
    cur.execute('SELECT id FROM "League" WHERE id = %s', (comp["id"],))
    if cur.fetchone():
        cur.execute(
            'UPDATE "League" SET "currentSeason" = %s, '
            '"syncPriority" = %s::"SyncPriority", "countryCode" = %s '
            "WHERE id = %s",
            (year, "MAJOR", "world", comp["id"]),
        )
        return
    cur.execute(
        'INSERT INTO "League" '
        '(id, name, type, "countryId", "countryCode", "syncPriority", "currentSeason") '
        'VALUES (%s, %s, %s::"LeagueType", NULL, %s, %s::"SyncPriority", %s)',
        (comp["id"], comp["name"], "CUP", "world", "MAJOR", year),
    )


def ensure_season(cur, league_id, year):
    cur.execute(
        'INSERT INTO "Season" ("leagueId", year, current) VALUES (%s, %s, true) '
        'ON CONFLICT ("leagueId", year) DO UPDATE SET current = true '
        "RETURNING id",
        (league_id, year),
    )
    return cur.fetchone()[0]


# --------------------------------------------------------------------------
# Per-competition processing
# --------------------------------------------------------------------------


def process_competition(conn, comp, matches, year, url):
    """matches/year/url come from the pass-1 fetch so we don't refetch."""
    cur = conn.cursor()
    if not matches:
        print(f"  ✗ {comp['name']}: no data available")
        return 0

    # matches are already filtered to real (drawn) games by fetch_with_fallback.
    # Deterministic order -> stable synthetic fixture ids across re-runs.
    real = list(matches)
    real.sort(key=lambda m: (
        m.get("date") or "9999-99-99",
        m.get("time") or "",
        m.get("team1") or "",
        m.get("team2") or "",
    ))

    ensure_league(cur, comp, year)
    season_id = ensure_season(cur, comp["id"], year)

    fixture_base = comp["id"] * FIXTURE_ID_BASE
    written = played = 0

    for idx, m in enumerate(real):
        home, away = m["team1"].strip(), m["team2"].strip()
        dt = parse_dt(m.get("date"), m.get("time"))
        if dt is None:
            continue
        fhome, faway = score_pair(m.get("score"), "ft")
        hthome, htaway = score_pair(m.get("score"), "ht")
        finished = fhome is not None and faway is not None
        if finished:
            played += 1
        short, long_ = FINISHED_STATUS if finished else SCHEDULED_STATUS
        # Prefer the group label ("Group A") for group games; fall back to the
        # round name ("Round of 16", "Final") for knockouts.
        round_label = m.get("group") or m.get("round")

        cur.execute(INSERT_FIXTURE, (
            fixture_base + idx + 1, comp["id"], season_id, year, dt, "UTC",
            short, long_, round_label,
            team_id_for(home), team_id_for(away),
            fhome, faway, hthome, htaway,
            m.get("ground"),
        ))
        written += 1

    conn.commit()
    print(f"  ▶ {comp['name']}: {written} fixtures ({played} played, "
          f"{written - played} upcoming)  season={year}  ({url})")
    return written


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    env = {**load_env(os.path.join(here, "..", ".env")), **os.environ}
    database_url = env.get("DATABASE_URL")
    if not database_url:
        print("❌ DATABASE_URL not set (looked in ../.env and the environment).")
        sys.exit(1)

    print("🌍 Scraping international football (openfootball)…")

    # Pass 1: fetch every competition's chosen season and collect the set of
    # real national-team names (teams must exist before fixtures reference them).
    fetched = []
    names = set()
    for comp in COMPETITIONS:
        matches, year, url = fetch_with_fallback(comp)
        fetched.append((comp, matches, year, url))
        for m in matches:  # already real-only from fetch_with_fallback
            names.add(m["team1"].strip())
            names.add(m["team2"].strip())

    conn = connect(database_url)
    try:
        cur = conn.cursor()
        for name in sorted(names):
            cur.execute(INSERT_TEAM, (team_id_for(name), name, None))
        conn.commit()

        total = 0
        for comp, matches, year, url in fetched:
            total += process_competition(conn, comp, matches, year, url)
        print(f"\n✅ Done. {total} fixtures written across "
              f"{len(COMPETITIONS)} competitions, {len(names)} national teams.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
