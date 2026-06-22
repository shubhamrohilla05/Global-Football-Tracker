#!/usr/bin/env python3
"""
Current-season scraper for the Global Football Activity Tracker.

Pulls completed-match data for the English Premier League and La Liga from
football-data.co.uk (a free, stable CSV feed — every match with full-time /
half-time scores) and writes it into the SAME Neon Postgres database that the
Next.js app reads from. League standings are COMPUTED from the results, so the
table is always internally consistent with the fixtures we store.

Why this source instead of premierleague.com / laliga.com directly: the
official sites are JS-rendered and sit behind anti-bot protection, so a raw
HTTP scraper breaks constantly. football-data.co.uk publishes the same match
facts as a plain CSV at a stable URL, which is far more robust to maintain.

It writes the Prisma-managed tables directly (PascalCase table names,
camelCase columns — hence all the double-quoting in the SQL below).

Usage:
    python scrape.py              # scrape EPL + La Liga, current season
"""
import csv
import io
import os
import ssl
import sys
import urllib.request
from datetime import datetime
from urllib.parse import urlparse, unquote

import pg8000.dbapi

# --------------------------------------------------------------------------
# Config
# --------------------------------------------------------------------------

# football-data.co.uk league codes. id/country mirror what the Next.js app and
# Prisma schema already use (API-Football's stable league ids), so the scraped
# rows slot straight into the existing League/Country records.
# `priority` maps to the SyncPriority enum and only affects the League row's
# syncPriority flag (defaults to MAJOR). football-data.co.uk codes are stable;
# id/country mirror the app's existing League rows (API-Football ids).
LEAGUES = [
    {"id": 39, "name": "Premier League", "code": "E0",
     "country": "England", "country_code": "gb-eng", "region": "EUROPE"},
    {"id": 140, "name": "La Liga", "code": "SP1",
     "country": "Spain", "country_code": "es", "region": "EUROPE"},
    {"id": 135, "name": "Serie A", "code": "I1",
     "country": "Italy", "country_code": "it", "region": "EUROPE"},
    {"id": 78, "name": "Bundesliga", "code": "D1",
     "country": "Germany", "country_code": "de", "region": "EUROPE"},
    {"id": 61, "name": "Ligue 1", "code": "F1",
     "country": "France", "country_code": "fr", "region": "EUROPE"},
    {"id": 88, "name": "Eredivisie", "code": "N1",
     "country": "Netherlands", "country_code": "nl", "region": "EUROPE"},
    {"id": 94, "name": "Primeira Liga", "code": "P1",
     "country": "Portugal", "country_code": "pt", "region": "EUROPE"},
    {"id": 40, "name": "Championship", "code": "E1",
     "country": "England", "country_code": "gb-eng", "region": "EUROPE",
     "priority": "STANDARD"},
]

# Seasons to try, newest first. ("2526" -> 2025/26, stored as year 2025).
# We use the first season that actually returns matches, so the script keeps
# working at season boundaries without edits.
SEASONS = [("2526", 2025), ("2425", 2024)]

BASE_URL = "https://www.football-data.co.uk/mmz4281"
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"

# --------------------------------------------------------------------------
# Env / DB connection
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


def fetch_csv(code, season_code):
    url = f"{BASE_URL}/{season_code}/{code}.csv"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=60) as r:
        raw = r.read()
    # football-data.co.uk ships Windows-1252 encoded CSVs.
    text = raw.decode("latin-1")
    rows = list(csv.DictReader(io.StringIO(text)))
    rows = [r for r in rows if (r.get("HomeTeam") or "").strip()]
    return rows, url


def fetch_with_fallback(code):
    for season_code, year in SEASONS:
        try:
            rows, url = fetch_csv(code, season_code)
        except Exception as e:  # noqa: BLE001 - report and try the next season
            print(f"     · {code} {season_code}: fetch failed ({e})")
            continue
        if rows:
            return rows, year, url
    return [], None, None


def parse_dt(d, t):
    """Parse football-data's DD/MM/YYYY date (+ optional HH:MM) to naive UTC.

    Prisma's DateTime maps to `timestamp without time zone`; the app treats
    stored values as UTC, so we store naive datetimes here.
    """
    d = (d or "").strip()
    t = (t or "").strip()
    dt = None
    for fmt in ("%d/%m/%Y", "%d/%m/%y"):
        try:
            dt = datetime.strptime(d, fmt)
            break
        except ValueError:
            continue
    if dt is None:
        return None
    hour, minute = 15, 0
    if t:
        try:
            parsed = datetime.strptime(t, "%H:%M")
            hour, minute = parsed.hour, parsed.minute
        except ValueError:
            pass
    return dt.replace(hour=hour, minute=minute)


def to_int(v):
    v = (v or "").strip()
    if v == "":
        return None
    try:
        return int(float(v))
    except ValueError:
        return None


# --------------------------------------------------------------------------
# DB upserts
# --------------------------------------------------------------------------


def ensure_league(cur, lg, year):
    """Return the league's countryId, creating Country/League if missing.

    In the normal case the League row already exists (synced earlier), so we
    just refresh currentSeason. The create path makes the script work against
    a fresh database too.
    """
    priority = lg.get("priority", "MAJOR")
    cur.execute('SELECT "countryId" FROM "League" WHERE id = %s', (lg["id"],))
    row = cur.fetchone()
    if row and row[0] is not None:
        cur.execute(
            'UPDATE "League" SET "currentSeason" = %s, '
            '"syncPriority" = %s::"SyncPriority" WHERE id = %s',
            (year, priority, lg["id"]),
        )
        # The earlier API-Football sync defaulted every country's region to
        # WORLD; make sure ours is correct so the region pages list the league.
        cur.execute(
            'UPDATE "Country" SET region = %s::"Region" WHERE id = %s',
            (lg["region"], row[0]),
        )
        return row[0]

    cur.execute(
        'INSERT INTO "Country" (name, code, region) '
        'VALUES (%s, %s, %s::"Region") '
        "ON CONFLICT (name) DO UPDATE SET region = EXCLUDED.region "
        "RETURNING id",
        (lg["country"], lg["country_code"], lg["region"]),
    )
    country_id = cur.fetchone()[0]
    cur.execute(
        'INSERT INTO "League" '
        '(id, name, type, "countryId", "countryCode", "syncPriority", "currentSeason") '
        'VALUES (%s, %s, %s::"LeagueType", %s, %s, %s::"SyncPriority", %s) '
        "ON CONFLICT (id) DO UPDATE SET "
        'name = EXCLUDED.name, "countryId" = EXCLUDED."countryId", '
        '"currentSeason" = EXCLUDED."currentSeason"',
        (lg["id"], lg["name"], "LEAGUE", country_id,
         lg["country_code"], priority, year),
    )
    return country_id


def ensure_season(cur, league_id, year):
    cur.execute(
        'INSERT INTO "Season" ("leagueId", year, current) VALUES (%s, %s, true) '
        'ON CONFLICT ("leagueId", year) DO UPDATE SET current = true '
        "RETURNING id",
        (league_id, year),
    )
    return cur.fetchone()[0]


INSERT_TEAM = (
    'INSERT INTO "Team" (id, name, "countryId") VALUES (%s, %s, %s) '
    "ON CONFLICT (id) DO UPDATE SET "
    'name = EXCLUDED.name, "countryId" = EXCLUDED."countryId"'
)

INSERT_FIXTURE = (
    'INSERT INTO "Fixture" '
    '(id, "leagueId", "seasonId", "seasonYear", "date", timezone, '
    '"statusShort", "statusLong", "homeTeamId", "awayTeamId", '
    '"goalsHome", "goalsAway", "htHome", "htAway") '
    "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) "
    "ON CONFLICT (id) DO UPDATE SET "
    '"statusShort" = EXCLUDED."statusShort", '
    '"statusLong" = EXCLUDED."statusLong", '
    '"goalsHome" = EXCLUDED."goalsHome", "goalsAway" = EXCLUDED."goalsAway", '
    '"htHome" = EXCLUDED."htHome", "htAway" = EXCLUDED."htAway", '
    '"date" = EXCLUDED."date", "syncedAt" = now()'
)

INSERT_STANDING = (
    'INSERT INTO "Standing" '
    '("leagueId", "seasonId", "seasonYear", "teamId", "group", "rank", points, '
    'played, won, drawn, lost, "goalsFor", "goalsAgainst", "goalsDiff", form, description) '
    "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
)


def standing_description(rank, total):
    if rank <= 4:
        return "UEFA Champions League"
    if rank == 5:
        return "UEFA Europa League"
    if rank >= total - 2:
        return "Relegation"
    return None


# --------------------------------------------------------------------------
# Per-league processing
# --------------------------------------------------------------------------


def process_league(conn, lg):
    cur = conn.cursor()
    rows, year, url = fetch_with_fallback(lg["code"])
    if not rows:
        print(f"  ✗ {lg['name']}: no data available")
        return 0

    print(f"  ▶ {lg['name']}: {len(rows)} matches  ({url})")

    names = sorted(
        {r["HomeTeam"].strip() for r in rows}
        | {r["AwayTeam"].strip() for r in rows}
    )
    team_base = lg["id"] * 1000
    team_id = {n: team_base + i + 1 for i, n in enumerate(names)}

    country_id = ensure_league(cur, lg, year)
    season_id = ensure_season(cur, lg["id"], year)

    for name, tid in team_id.items():
        cur.execute(INSERT_TEAM, (tid, name, country_id))

    # Deterministic match order -> stable synthetic fixture ids across re-runs.
    matches = [(parse_dt(r.get("Date"), r.get("Time")), r) for r in rows]
    matches.sort(key=lambda x: (
        x[0] or datetime.max, x[1]["HomeTeam"], x[1]["AwayTeam"]))

    stats = {n: {"p": 0, "w": 0, "d": 0, "l": 0, "gf": 0, "ga": 0,
                 "pts": 0, "form": []} for n in names}
    fixture_base = lg["id"] * 1_000_000
    fixtures_written = 0

    for idx, (dt, r) in enumerate(matches):
        home = r["HomeTeam"].strip()
        away = r["AwayTeam"].strip()
        hg = to_int(r.get("FTHG"))
        ag = to_int(r.get("FTAG"))
        hth = to_int(r.get("HTHG"))
        hta = to_int(r.get("HTAG"))
        played = hg is not None and ag is not None
        cur.execute(INSERT_FIXTURE, (
            fixture_base + idx + 1, lg["id"], season_id, year, dt, "UTC",
            "FT" if played else "NS",
            "Match Finished" if played else "Not Started",
            team_id[home], team_id[away], hg, ag, hth, hta,
        ))
        fixtures_written += 1

        if not played:
            continue
        h, a = stats[home], stats[away]
        h["p"] += 1; a["p"] += 1
        h["gf"] += hg; h["ga"] += ag; a["gf"] += ag; a["ga"] += hg
        if hg > ag:
            h["w"] += 1; h["pts"] += 3; a["l"] += 1
            h["form"].append((dt, "W")); a["form"].append((dt, "L"))
        elif hg < ag:
            a["w"] += 1; a["pts"] += 3; h["l"] += 1
            a["form"].append((dt, "W")); h["form"].append((dt, "L"))
        else:
            h["d"] += 1; a["d"] += 1; h["pts"] += 1; a["pts"] += 1
            h["form"].append((dt, "D")); a["form"].append((dt, "D"))

    # Rank: points, then goal difference, then goals for, then name.
    table = sorted(
        names,
        key=lambda n: (-stats[n]["pts"],
                       -(stats[n]["gf"] - stats[n]["ga"]),
                       -stats[n]["gf"], n),
    )

    # Recompute the table from scratch each run.
    cur.execute(
        'DELETE FROM "Standing" WHERE "leagueId" = %s AND "seasonId" = %s',
        (lg["id"], season_id),
    )
    for rank, name in enumerate(table, start=1):
        s = stats[name]
        gd = s["gf"] - s["ga"]
        form = "".join(
            letter for _, letter in sorted(s["form"], key=lambda x: x[0])[-5:]
        )
        cur.execute(INSERT_STANDING, (
            lg["id"], season_id, year, team_id[name], None, rank, s["pts"],
            s["p"], s["w"], s["d"], s["l"], s["gf"], s["ga"], gd,
            form or None, standing_description(rank, len(table)),
        ))

    conn.commit()
    print(f"     teams={len(names)}  fixtures={fixtures_written}  "
          f"standings={len(table)}  season={year}/{year + 1}")
    return fixtures_written


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    env = {**load_env(os.path.join(here, "..", ".env")), **os.environ}
    database_url = env.get("DATABASE_URL")
    if not database_url:
        print("❌ DATABASE_URL not set (looked in ../.env and the environment).")
        sys.exit(1)

    print(f"⚽ Scraping current-season data ({len(LEAGUES)} leagues)…")
    conn = connect(database_url)
    try:
        total = 0
        for lg in LEAGUES:
            total += process_league(conn, lg)
        print(f"\n✅ Done. {total} fixtures written across {len(LEAGUES)} leagues.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
