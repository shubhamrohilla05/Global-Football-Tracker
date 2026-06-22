/**
 * Populate club crests by matching our DB clubs (seeded with synthetic team ids
 * and no logos) to API-Football's real teams by name, storing API-Football's
 * logo CDN URL on `team.logo`. National teams use flags, so only club leagues
 * (countryCode != "world") are touched.
 *
 * To maximize matches on the free tier (which only exposes seasons 2022–2024),
 * we build a GLOBAL pool of teams across those seasons and all club leagues, so
 * a club that was in a different division in 2023 (promoted/relegated) is still
 * found. One budget-charged `teams` call per (league, season). Responses are
 * cached locally so re-runs (to tune matching) burn no budget — pass --refresh
 * to re-fetch.
 *
 *   npx tsx src/scripts/sync-club-logos.ts [--refresh]
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { prisma } from "@/lib/db";
import { af } from "@/lib/api-football/client";

const CACHE_FILE = ".cache/club-logo-pool.json";
const SEASONS = [2024, 2023, 2022]; // all within the free-tier window

// Tokens that add noise to club names — dropped before comparison.
const STOP = new Set([
  "fc", "cf", "afc", "ac", "as", "ss", "ssc", "sc", "cd", "rcd", "ud", "sd",
  "rc", "cp", "cfc", "bk", "sv", "vfb", "vfl", "tsg", "fsv", "rb", "club",
  "de", "futbol", "football", "calcio", "city", "the", "1",
]);

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .split(/[^a-z0-9]+/)
    .filter((t) => t && !STOP.has(t))
    .join("");
}

// DB short name (normalized) -> API full name (normalized). Only needed where
// normalization can't bridge the two.
const ALIAS: Record<string, string> = {
  manunited: "manchesterunited",
  manutd: "manchesterunited",
  nottmforest: "nottinghamforest",
  einfrankfurt: "eintrachtfrankfurt",
  mgladbach: "borussiamonchengladbach",
  monchengladbach: "borussiamonchengladbach",
  forsittard: "fortunasittard",
  splisbon: "sporting",
  sportinglisbon: "sporting",
  spbraga: "braga",
  athbilbao: "athletic",
  athmadrid: "atleticomadrid",
  espanol: "espanyol",
  parissg: "parissaintgermain",
  psg: "parissaintgermain",
  sheffieldweds: "sheffieldwednesday",
  sheffieldunited: "sheffieldutd",
  hamburg: "hamburgersv",
  stpauli: "stpauli",
  nacional: "nacional",
  man: "manchester", // "Man City" (norm drops "city") -> Manchester City
  bayernmunich: "bayernmunchen",
};

function canon(name: string): string {
  const n = norm(name);
  return ALIAS[n] ?? n;
}

async function buildPool(leagueIds: number[]): Promise<Record<string, string>> {
  const pool: Record<string, string> = {}; // canon -> logo URL
  for (const leagueId of leagueIds) {
    for (const season of SEASONS) {
      let teams: Awaited<ReturnType<typeof af.teams>> = [];
      try {
        teams = await af.teams({ league: leagueId, season });
      } catch (e) {
        console.warn(`  league ${leagueId} season ${season}: ${(e as Error).message}`);
        continue;
      }
      for (const t of teams) {
        if (t.name && t.logo) {
          const k = canon(t.name);
          if (!(k in pool)) pool[k] = t.logo;
        }
      }
    }
    console.log(`  league ${leagueId}: pool now ${Object.keys(pool).length} clubs`);
  }
  return pool;
}

async function main() {
  const refresh = process.argv.includes("--refresh");

  const clubLeagues = await prisma.league.findMany({
    where: { countryCode: { not: "world" }, fixtures: { some: {} } },
    select: { id: true, name: true },
    orderBy: { id: "asc" },
  });
  const leagueIds = clubLeagues.map((l) => l.id);

  let pool: Record<string, string>;
  if (!refresh && existsSync(CACHE_FILE)) {
    pool = JSON.parse(readFileSync(CACHE_FILE, "utf8"));
    console.log(`Using cached pool (${Object.keys(pool).length} clubs). Pass --refresh to re-fetch.`);
  } else {
    console.log("Fetching teams from API-Football across seasons", SEASONS.join(", "), "…");
    pool = await buildPool(leagueIds);
    mkdirSync(dirname(CACHE_FILE), { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify(pool, null, 2));
    console.log(`Cached pool to ${CACHE_FILE} (${Object.keys(pool).length} clubs)`);
  }

  const poolEntries = Object.entries(pool);

  // All DB clubs appearing in active club leagues' fixtures.
  const fx = await prisma.fixture.findMany({
    where: { leagueId: { in: leagueIds } },
    select: { homeTeamId: true, awayTeamId: true },
  });
  const ids = new Set<number>();
  for (const f of fx) { ids.add(f.homeTeamId); ids.add(f.awayTeamId); }
  const clubs = await prisma.team.findMany({
    where: { id: { in: [...ids] } },
    select: { id: true, name: true, logo: true },
  });

  let matched = 0;
  const unmatched: string[] = [];
  for (const c of clubs) {
    const key = canon(c.name);
    let logo = pool[key];
    if (!logo) {
      const cands = poolEntries.filter(
        ([k]) => k.length >= 4 && (k.includes(key) || key.includes(k)),
      );
      if (cands.length === 1) logo = cands[0][1];
    }
    if (logo) {
      if (c.logo !== logo) await prisma.team.update({ where: { id: c.id }, data: { logo } });
      matched++;
    } else {
      unmatched.push(c.name);
    }
  }

  console.log(`\nMatched ${matched}/${clubs.length} clubs.`);
  if (unmatched.length) {
    console.log(`Unmatched (${unmatched.length}): ${unmatched.sort().join(", ")}`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
