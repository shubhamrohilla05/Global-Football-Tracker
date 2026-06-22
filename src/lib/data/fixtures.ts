/**
 * Data access: fixture queries shared across pages.
 * All reads come from the DB (never the upstream API).
 */
import { prisma } from "@/lib/db";
import type { FixtureRowData } from "@/components/ui/fixture-row";
import type { Prisma } from "@prisma/client";

const FIXTURE_INCLUDE = {
  homeTeam: true,
  awayTeam: true,
  league: { include: { country: true } },
} satisfies Prisma.FixtureInclude;

type FixtureWithRelations = Prisma.FixtureGetPayload<{ include: typeof FIXTURE_INCLUDE }>;

/** Map a DB fixture row (with relations) to the FixtureRow component's shape. */
export function toFixtureRow(f: FixtureWithRelations): FixtureRowData {
  return {
    id: f.id,
    date: f.date.toISOString(),
    statusShort: f.statusShort,
    minute: f.minute,
    round: f.round,
    homeTeam: { id: f.homeTeamId, name: f.homeTeam.name, logo: f.homeTeam.logo },
    awayTeam: { id: f.awayTeamId, name: f.awayTeam.name, logo: f.awayTeam.logo },
    goalsHome: f.goalsHome,
    goalsAway: f.goalsAway,
    venue: f.venue,
    leagueId: f.leagueId,
    leagueName: f.league.name,
    leagueLogo: f.league.logo,
    country: f.league.country
      ? { name: f.league.country.name, code: f.league.country.code, flag: f.league.country.flag }
      : f.league.countryCode === "world"
        ? { name: "International", code: "world", flag: null }
        : null,
  };
}

export interface FixtureLeagueGroup {
  leagueId: number;
  leagueName: string;
  leagueLogo: string | null;
  country: FixtureRowData["country"];
  fixtures: FixtureRowData[];
}

/**
 * Group already-mapped fixtures by their league, preserving the incoming order
 * (so the first appearance of each league sets its position). Powers the
 * league-grouped fixture views.
 */
export function groupFixturesByLeague(fixtures: FixtureRowData[]): FixtureLeagueGroup[] {
  const groups = new Map<number, FixtureLeagueGroup>();
  for (const f of fixtures) {
    const id = f.leagueId ?? -1;
    let g = groups.get(id);
    if (!g) {
      g = {
        leagueId: id,
        leagueName: f.leagueName ?? "Other",
        leagueLogo: f.leagueLogo ?? null,
        country: f.country ?? null,
        fixtures: [],
      };
      groups.set(id, g);
    }
    g.fixtures.push(f);
  }
  return [...groups.values()];
}

const LIVE_STATUSES = ["1H", "2H", "HT", "ET", "BT", "P", "LIVE"];
const FINISHED_STATUSES = ["FT", "AET", "PEN"];

/** Fixtures for a specific calendar day (UTC). */
export async function getFixturesForDay(date: Date) {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  const fixtures = await prisma.fixture.findMany({
    where: { date: { gte: start, lt: end } },
    include: FIXTURE_INCLUDE,
    orderBy: { date: "asc" },
  });
  return fixtures.map(toFixtureRow);
}

/** Currently live fixtures. */
export async function getLiveFixtures() {
  const fixtures = await prisma.fixture.findMany({
    where: { statusShort: { in: LIVE_STATUSES } },
    include: FIXTURE_INCLUDE,
    orderBy: { date: "asc" },
  });
  return fixtures.map(toFixtureRow);
}

/**
 * Next scheduled fixtures for a league. No upper date bound — returns the next
 * `limit` matches whenever they are, so the list isn't empty between matchdays
 * or during the off-season (when the new season's fixtures are loaded).
 */
export async function getUpcomingForLeague(leagueId: number, limit = 20) {
  const now = new Date();
  const fixtures = await prisma.fixture.findMany({
    where: {
      leagueId,
      date: { gte: now },
      statusShort: { notIn: [...FINISHED_STATUSES, ...LIVE_STATUSES] },
    },
    include: FIXTURE_INCLUDE,
    orderBy: { date: "asc" },
    take: limit,
  });
  return fixtures.map(toFixtureRow);
}

/**
 * Most recent results for a league — the last `limit` finished matches by date.
 * No date floor, so completed seasons still show their results out of season.
 */
export async function getRecentForLeague(leagueId: number, limit = 20) {
  const fixtures = await prisma.fixture.findMany({
    where: {
      leagueId,
      statusShort: { in: FINISHED_STATUSES },
    },
    include: FIXTURE_INCLUDE,
    orderBy: { date: "desc" },
    take: limit,
  });
  return fixtures.map(toFixtureRow);
}

/**
 * Every finished result for a league's season (defaults to its current season),
 * newest first — powers the full results view at /league/[id]/results.
 */
export async function getLeagueSeasonResults(leagueId: number, seasonYear?: number) {
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
    },
    include: FIXTURE_INCLUDE,
    orderBy: { date: "desc" },
  });
  return { season, fixtures: fixtures.map(toFixtureRow) };
}

/** Next + recent fixtures for a single team. */
export async function getTeamFixtures(teamId: number) {
  const now = new Date();
  const [upcoming, recent] = await Promise.all([
    prisma.fixture.findMany({
      where: {
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
        date: { gte: now },
      },
      include: FIXTURE_INCLUDE,
      orderBy: { date: "asc" },
      take: 5,
    }),
    prisma.fixture.findMany({
      where: {
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
        date: { lt: now },
        statusShort: { in: FINISHED_STATUSES },
      },
      include: FIXTURE_INCLUDE,
      orderBy: { date: "desc" },
      take: 5,
    }),
  ]);
  return {
    upcoming: upcoming.map(toFixtureRow),
    recent: recent.map(toFixtureRow),
  };
}

/** Count of today's fixtures, live fixtures, and synced leagues — for the home stats. */
export async function getHomeStats() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  const [totalToday, live, leagues, teams] = await Promise.all([
    prisma.fixture.count({ where: { date: { gte: today, lt: tomorrow } } }),
    prisma.fixture.count({ where: { statusShort: { in: LIVE_STATUSES } } }),
    prisma.league.count({ where: { syncPriority: { not: "NONE" } } }),
    prisma.team.count(),
  ]);

  return { totalToday, live, leagues, teams };
}
