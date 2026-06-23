#!/usr/bin/env python3
"""
Squad-roster scraper for the Global Football Activity Tracker.

Populates the Prisma-managed "Player" and "SquadEntry" tables with the current
first-team squads for the clubs that ALREADY exist in the database (Premier
League + La Liga, ~40 teams with synthetic ids leagueId*1000+index).

Source: Wikipedia club pages ("First-team squad" / "Current squad" tables).
Wikipedia is JS-free, stable, and the squad tables follow a consistent markup
(class="vcard agent" rows inside a table that carries shirt number, position,
nationality flag and player name). fbref is an alternative but rate-limits hard.

It writes the same Neon Postgres DB the Next.js app reads from, reusing the
PascalCase/quoted SQL convention from scrape.py. It ONLY touches Player and
SquadEntry (reads Team / League). It never alters the schema or other tables.

Player ids are deterministic (hash of "teamname|playername") so re-runs upsert
idempotently. SquadEntry is unique on (teamId, playerId, season).

Usage:
    scrapers/.venv-players/bin/python scrapers/scrape_players.py
"""
import hashlib
import os
import re
import ssl
import sys
import time
from urllib.parse import urlparse, unquote

import pg8000.dbapi
import requests
from bs4 import BeautifulSoup

# --------------------------------------------------------------------------
# Team-name -> Wikipedia page title map. Keys match the "Team".name rows in DB.
# --------------------------------------------------------------------------
WIKI_PAGE = {
    # Premier League (league 39, season 2026)
    "Arsenal": "Arsenal F.C.",
    "Aston Villa": "Aston Villa F.C.",
    "Bournemouth": "AFC Bournemouth",
    "Brentford": "Brentford F.C.",
    "Brighton": "Brighton & Hove Albion F.C.",
    "Burnley": "Burnley F.C.",
    "Chelsea": "Chelsea F.C.",
    "Crystal Palace": "Crystal Palace F.C.",
    "Everton": "Everton F.C.",
    "Fulham": "Fulham F.C.",
    "Leeds": "Leeds United F.C.",
    "Liverpool": "Liverpool F.C.",
    "Man City": "Manchester City F.C.",
    "Man United": "Manchester United F.C.",
    "Newcastle": "Newcastle United F.C.",
    "Nott'm Forest": "Nottingham Forest F.C.",
    "Sunderland": "Sunderland A.F.C.",
    "Tottenham": "Tottenham Hotspur F.C.",
    "West Ham": "West Ham United F.C.",
    "Wolves": "Wolverhampton Wanderers F.C.",
    # La Liga (league 140, season 2025)
    "Alaves": "Deportivo Alavés",
    "Ath Bilbao": "Athletic Bilbao",
    "Ath Madrid": "Atlético Madrid",
    "Barcelona": "FC Barcelona",
    "Betis": "Real Betis",
    "Celta": "RC Celta de Vigo",
    "Elche": "Elche CF",
    "Espanol": "RCD Espanyol",
    "Getafe": "Getafe CF",
    "Girona": "Girona FC",
    "Levante": "Levante UD",
    "Mallorca": "RCD Mallorca",
    "Osasuna": "CA Osasuna",
    "Oviedo": "Real Oviedo",
    "Real Madrid": "Real Madrid CF",
    "Sevilla": "Sevilla FC",
    "Sociedad": "Real Sociedad",
    "Valencia": "Valencia CF",
    "Vallecano": "Rayo Vallecano",
    "Villarreal": "Villarreal CF",
}

WIKI_API = "https://en.wikipedia.org/w/api.php"
USER_AGENT = (
    "GFAT-squad-scraper/1.0 (football activity tracker; contact: local dev)"
)
HEADERS = {"User-Agent": USER_AGENT}

# Map Wikipedia/football position words -> our GK/DEF/MID/ATT buckets.
POS_MAP = {
    "GK": "GK", "GOALKEEPER": "GK",
    "DF": "DEF", "DEFENDER": "DEF", "CB": "DEF", "RB": "DEF", "LB": "DEF",
    "RWB": "DEF", "LWB": "DEF", "FB": "DEF",
    "MF": "MID", "MIDFIELDER": "MID", "CM": "MID", "DM": "MID", "AM": "MID",
    "RM": "MID", "LM": "MID", "CDM": "MID", "CAM": "MID",
    "FW": "ATT", "FORWARD": "ATT", "ST": "ATT", "CF": "ATT", "RW": "ATT",
    "LW": "ATT", "SS": "ATT", "WG": "ATT", "WF": "ATT",
}


# --------------------------------------------------------------------------
# Env / DB connection  (mirrors scrape.py)
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
# Deterministic player id
# --------------------------------------------------------------------------
def player_id(team_name, player_name):
    """Stable positive 32-bit-ish id < 2_000_000_000 for a (team, player)."""
    key = f"{team_name.lower().strip()}|{player_name.lower().strip()}"
    h = hashlib.sha1(key.encode("utf-8")).hexdigest()
    return int(h[:15], 16) % 1_900_000_000 + 1


# --------------------------------------------------------------------------
# Parse helpers
# --------------------------------------------------------------------------
def norm_pos(raw):
    if not raw:
        return None
    raw = raw.strip().upper()
    # take the first token, e.g. "DF / RB" -> "DF"
    token = re.split(r"[\s/,]+", raw)[0]
    return POS_MAP.get(token) or POS_MAP.get(raw) or None


def clean_name(text):
    text = re.sub(r"\([^)]*\)", "", text)      # drop "(captain)", "(vice...)"
    text = re.sub(r"\[[^\]]*\]", "", text)      # drop footnote markers
    text = text.replace(" ", " ")
    return re.sub(r"\s+", " ", text).strip()


def fetch_html(title):
    params = {
        "action": "parse", "page": title, "prop": "text",
        "format": "json", "formatversion": "2", "redirects": "1",
    }
    r = requests.get(WIKI_API, params=params, headers=HEADERS, timeout=60)
    r.raise_for_status()
    data = r.json()
    if "error" in data:
        raise RuntimeError(data["error"].get("info", "wiki error"))
    return data["parse"]["text"]


def parse_squad(html):
    """Return list of dicts: {number, name, position, nationality}.

    Wikipedia squad rows use class="vcard agent"; the player link sits in a
    <th>/<td> with class "fn"/"vcard", shirt number in a span with class
    "fn"/leading numeric cell, position as a two-letter abbr (DF/MF/FW/GK),
    nationality from the flag template's title/alt.
    """
    soup = BeautifulSoup(html, "lxml")
    players = []
    seen = set()

    rows = soup.select("tr.vcard.agent, tr.vcard, tr.agent")
    for tr in rows:
        cells = tr.find_all(["td", "th"], recursive=False)
        if len(cells) < 3:
            continue

        # shirt number: first cell that is purely numeric
        number = None
        for c in cells[:2]:
            txt = c.get_text(" ", strip=True)
            m = re.match(r"^(\d{1,2})$", txt)
            if m:
                number = int(m.group(1))
                break

        # position abbreviation (GK/DF/MF/FW), usually in an <abbr> or short cell
        position = None
        abbr = tr.find("abbr")
        if abbr:
            position = norm_pos(abbr.get("title") or abbr.get_text(strip=True))
        if not position:
            for c in cells:
                t = c.get_text(strip=True)
                if t.upper() in ("GK", "DF", "MF", "FW"):
                    position = norm_pos(t)
                    break

        # nationality: derived from the flag image filename, e.g.
        # ".../Flag_of_Spain.svg/..." -> "Spain". This is the most reliable
        # signal; the adjacent <a> usually links to the football federation.
        nationality = None
        flag = tr.find("span", class_="flagicon")
        img = (flag.find("img") if flag else None) or tr.find("img")
        if img and img.get("src"):
            m = re.search(r"Flag[ _]of[ _]([^/.]+)\.svg", img["src"],
                          flags=re.IGNORECASE)
            if m:
                raw = unquote(m.group(1)).replace("_", " ")
                raw = re.sub(r"\(.*?\)", "", raw)   # drop "(official)" etc.
                nationality = raw.strip() or None
        if not nationality and img and img.get("alt"):
            alt = img.get("alt").strip()
            if alt and not alt.lower().endswith(("logo", ".svg")):
                nationality = alt

        # player name: the vCard name link (class "fn" or last <a> with title)
        name = None
        fn = tr.find(class_="fn")
        if fn:
            name = clean_name(fn.get_text(" ", strip=True))
        if not name:
            # fallback: last anchor pointing at a player article
            links = [a for a in tr.find_all("a") if a.get("title")
                     and not a.get("title", "").startswith("File:")]
            if links:
                name = clean_name(links[-1].get_text(" ", strip=True))
        if not name or len(name) < 2:
            continue
        # skip stray rows that captured a country/flag link as the name
        if nationality and name == nationality:
            continue

        if name.lower() in seen:
            continue
        seen.add(name.lower())
        players.append({
            "number": number, "name": name,
            "position": position, "nationality": nationality,
        })
    return players


# --------------------------------------------------------------------------
# DB upserts
# --------------------------------------------------------------------------
UPSERT_PLAYER = (
    'INSERT INTO "Player" (id, name, nationality, position) '
    "VALUES (%s, %s, %s, %s) "
    "ON CONFLICT (id) DO UPDATE SET "
    'name = EXCLUDED.name, '
    'nationality = COALESCE(EXCLUDED.nationality, "Player".nationality), '
    'position = COALESCE(EXCLUDED.position, "Player".position)'
)

UPSERT_SQUAD = (
    'INSERT INTO "SquadEntry" '
    '("teamId", "playerId", season, number, position) '
    "VALUES (%s, %s, %s, %s, %s) "
    'ON CONFLICT ("teamId", "playerId", season) DO UPDATE SET '
    'number = EXCLUDED.number, position = EXCLUDED.position'
)


def league_season(cur, league_id, default=2025):
    cur.execute('SELECT "currentSeason" FROM "League" WHERE id = %s',
                (league_id,))
    row = cur.fetchone()
    return (row[0] if row and row[0] is not None else default)


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    env = {**load_env(os.path.join(here, "..", ".env")), **os.environ}
    database_url = env.get("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL not set (looked in ../.env and environment).")
        sys.exit(1)

    conn = connect(database_url)
    cur = conn.cursor()

    # Existing teams keyed by name -> (id, leagueId derived from id).
    cur.execute('SELECT id, name FROM "Team" ORDER BY id')
    teams = cur.fetchall()
    team_by_name = {name: tid for tid, name in teams}

    # Cache league currentSeason for the two leagues we cover.
    season_cache = {}

    total_players = 0
    total_entries = 0
    covered = []
    skipped = []
    samples = []

    print("Scraping current squads from Wikipedia...")
    for team_name, page in WIKI_PAGE.items():
        tid = team_by_name.get(team_name)
        if tid is None:
            skipped.append((team_name, "not in DB"))
            continue
        league_id = tid // 1000          # 39001 -> 39, 140001 -> 140
        if league_id not in season_cache:
            season_cache[league_id] = league_season(cur, league_id, 2025)
        season = season_cache[league_id]

        try:
            html = fetch_html(page)
            squad = parse_squad(html)
        except Exception as e:  # noqa: BLE001
            skipped.append((team_name, f"fetch/parse: {e}"))
            print(f"  x {team_name}: {e}")
            time.sleep(1.0)
            continue

        if not squad:
            skipped.append((team_name, "no squad rows parsed"))
            print(f"  x {team_name}: no squad rows parsed")
            time.sleep(1.0)
            continue

        for p in squad:
            pid = player_id(team_name, p["name"])
            cur.execute(UPSERT_PLAYER,
                        (pid, p["name"], p["nationality"], p["position"]))
            cur.execute(UPSERT_SQUAD,
                        (tid, pid, season, p["number"], p["position"]))
            total_players += 1
            total_entries += 1
            if len(samples) < 8:
                samples.append(
                    (team_name, p["number"], p["name"],
                     p["position"], p["nationality"]))

        conn.commit()
        covered.append((team_name, len(squad), season))
        print(f"  + {team_name}: {len(squad)} players (season {season})")
        time.sleep(0.6)   # be polite to Wikipedia

    # Final authoritative counts straight from the DB.
    cur.execute('SELECT count(*) FROM "Player"')
    db_players = cur.fetchone()[0]
    cur.execute('SELECT count(*) FROM "SquadEntry"')
    db_entries = cur.fetchone()[0]
    conn.close()

    print("\n==== SUMMARY ====")
    print(f"Teams covered : {len(covered)} / {len(WIKI_PAGE)}")
    print(f"Teams skipped : {len(skipped)}")
    for name, reason in skipped:
        print(f"   - {name}: {reason}")
    print(f"Player upserts attempted   : {total_players}")
    print(f"SquadEntry upserts attempted: {total_entries}")
    print(f"DB Player rows now     : {db_players}")
    print(f"DB SquadEntry rows now : {db_entries}")
    print("\nSample players:")
    for s in samples:
        print(f"   {s}")


if __name__ == "__main__":
    main()
