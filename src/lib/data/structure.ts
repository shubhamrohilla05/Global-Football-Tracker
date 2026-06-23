/**
 * Data access: leagues, regions, and the country/region structure
 * that powers the home and browse pages.
 */
import { prisma } from "@/lib/db";
import { FINISHED_STATUSES } from "@/lib/fixture-status";
import type { Prisma } from "@prisma/client";

const STANDING_INCLUDE = { team: true } satisfies Prisma.StandingInclude;
type StandingWithTeam = Prisma.StandingGetPayload<{ include: typeof STANDING_INCLUDE }>;

export type { StandingWithTeam };
import type { Region } from "@prisma/client";

/**
 * The structural shape the StandingTable renders. Real synced `Standing` rows
 * (StandingWithTeam) satisfy this, and so do standings we compute on the fly
 * from finished fixtures (e.g. group-stage tournaments that have no synced
 * Standing rows yet).
 */
export interface StandingRow {
  id: number | string;
  rank: number;
  group: string | null;
  teamId: number;
  team: { name: string; logo: string | null };
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsDiff: number;
  points: number;
  form: string | null;
}

/** All leagues we sync, grouped by their parent country's region. */
export async function getLeaguesGroupedByRegion() {
  const leagues = await prisma.league.findMany({
    where: { syncPriority: { not: "NONE" } },
    include: { country: true },
    orderBy: [{ country: { name: "asc" } }, { name: "asc" }],
  });

  const byRegion = new Map<Region, typeof leagues>();
  for (const l of leagues) {
    const region = l.country?.region ?? "WORLD";
    if (!byRegion.has(region)) byRegion.set(region, []);
    byRegion.get(region)!.push(l);
  }
  return byRegion;
}

/** International competitions (leagues with no country or "world" code). */
export async function getInternationalLeagues() {
  return prisma.league.findMany({
    where: {
      syncPriority: { not: "NONE" },
      OR: [{ country: null }, { countryCode: "world" }],
    },
    include: { country: true },
    orderBy: { name: "asc" },
  });
}

/** A single league with its country. */
export async function getLeague(id: number) {
  return prisma.league.findUnique({
    where: { id },
    include: { country: true },
  });
}

/** Standings rows for a league's current season, ordered by rank. */
export async function getStandings(
  leagueId: number,
  seasonYear?: number,
): Promise<{ season: number | null; rows: StandingWithTeam[] }> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { currentSeason: true },
  });
  let season = seasonYear ?? league?.currentSeason ?? null;

  // When no explicit season was requested and the league's currentSeason has no
  // synced standings (e.g. the season rolled over but standings weren't
  // re-synced), fall back to the latest season that actually has rows — instead
  // of returning an empty "standings unavailable" panel despite data existing.
  if (seasonYear == null) {
    const hasRows =
      season != null &&
      (await prisma.standing.count({ where: { leagueId, seasonYear: season } })) > 0;
    if (!hasRows) {
      const latest = await prisma.standing.findFirst({
        where: { leagueId },
        orderBy: { seasonYear: "desc" },
        select: { seasonYear: true },
      });
      season = latest?.seasonYear ?? season;
    }
  }

  if (!season) return { season: null, rows: [] };

  const standings = await prisma.standing.findMany({
    where: { leagueId, seasonYear: season },
    include: STANDING_INCLUDE,
    orderBy: [{ group: "asc" }, { rank: "asc" }],
  });
  return { season, rows: standings };
}

/**
 * Compute group-stage standings directly from finished fixtures, for
 * tournaments (World Cup, Euros, continental cups) that have group fixtures but
 * no synced `Standing` rows. Reads only from Postgres (fixtures), consistent
 * with the core invariant. Returns rows grouped by the fixture `round`
 * ("Group A", "Group B", …), ranked within each group by points → goal
 * difference → goals for → name.
 */
export async function getGroupStandings(
  leagueId: number,
  seasonYear?: number,
): Promise<{ season: number | null; rows: StandingRow[] }> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { currentSeason: true },
  });
  const season = seasonYear ?? league?.currentSeason ?? null;

  const fixtures = await prisma.fixture.findMany({
    where: {
      leagueId,
      ...(season ? { seasonYear: season } : {}),
      statusShort: { in: FINISHED_STATUSES },
      round: { startsWith: "Group" },
    },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { date: "asc" },
  });
  if (fixtures.length === 0) return { season, rows: [] };

  interface Acc {
    teamId: number;
    name: string;
    logo: string | null;
    group: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    points: number;
    form: string[];
  }
  const table = new Map<string, Acc>();
  const keyFor = (group: string, teamId: number) => `${group}::${teamId}`;
  const ensure = (group: string, t: { id: number; name: string; logo: string | null }): Acc => {
    const k = keyFor(group, t.id);
    let acc = table.get(k);
    if (!acc) {
      acc = {
        teamId: t.id,
        name: t.name,
        logo: t.logo,
        group,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
        form: [],
      };
      table.set(k, acc);
    }
    return acc;
  };

  for (const f of fixtures) {
    if (f.goalsHome == null || f.goalsAway == null || !f.round) continue;
    const home = ensure(f.round, f.homeTeam);
    const away = ensure(f.round, f.awayTeam);
    home.played++;
    away.played++;
    home.goalsFor += f.goalsHome;
    home.goalsAgainst += f.goalsAway;
    away.goalsFor += f.goalsAway;
    away.goalsAgainst += f.goalsHome;
    if (f.goalsHome > f.goalsAway) {
      home.won++; home.points += 3; home.form.push("W");
      away.lost++; away.form.push("L");
    } else if (f.goalsHome < f.goalsAway) {
      away.won++; away.points += 3; away.form.push("W");
      home.lost++; home.form.push("L");
    } else {
      home.drawn++; home.points++; home.form.push("D");
      away.drawn++; away.points++; away.form.push("D");
    }
  }

  const accs = [...table.values()];
  // Group, then rank within group by points → GD → GF → name.
  const byGroup = new Map<string, Acc[]>();
  for (const a of accs) {
    if (!byGroup.has(a.group)) byGroup.set(a.group, []);
    byGroup.get(a.group)!.push(a);
  }

  const rows: StandingRow[] = [];
  for (const group of [...byGroup.keys()].sort((a, b) => a.localeCompare(b))) {
    const sorted = byGroup.get(group)!.sort((x, y) => {
      const xgd = x.goalsFor - x.goalsAgainst;
      const ygd = y.goalsFor - y.goalsAgainst;
      return (
        y.points - x.points ||
        ygd - xgd ||
        y.goalsFor - x.goalsFor ||
        x.name.localeCompare(y.name)
      );
    });
    sorted.forEach((a, i) => {
      rows.push({
        id: keyFor(a.group, a.teamId),
        rank: i + 1,
        group: a.group,
        teamId: a.teamId,
        team: { name: a.name, logo: a.logo },
        played: a.played,
        won: a.won,
        drawn: a.drawn,
        lost: a.lost,
        goalsDiff: a.goalsFor - a.goalsAgainst,
        points: a.points,
        form: a.form.join("") || null,
      });
    });
  }

  return { season, rows };
}
