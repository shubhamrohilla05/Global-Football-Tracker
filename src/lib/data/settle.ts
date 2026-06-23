/**
 * On-read fixture settlement.
 *
 * The UI never calls the upstream API (see CLAUDE.md: the DB is the only source,
 * and it's scraper-seeded mock data with synthetic team IDs that API-Football
 * can't sync against). So as wall-clock time advances, fixtures that were
 * scraped as "Not Started" never get an upstream result and would linger as
 * "upcoming" forever, even hours after kickoff.
 *
 * `settleDueFixtures()` closes that gap purely in the DB: any fixture whose
 * kickoff has passed is transitioned to live (while it's notionally in play) and
 * then to a finished result with a deterministic, stable scoreline. It runs on
 * every page load (called from the fixture data-access helpers) so a refresh
 * always shows the latest state — kicked-off matches as live, completed matches
 * marked Full Time with their final score.
 *
 * Real scraped results (already stored as FT with genuine football-data scores)
 * are never touched — only never-resolved NS/live fixtures are settled.
 *
 * The work is throttled to once per interval per server instance and coalesces
 * concurrent callers, so the many read helpers a single page invokes trigger at
 * most one settle pass.
 */
import { prisma } from "@/lib/db";
import { LIVE_STATUSES } from "@/lib/fixture-status";

/** Wall-clock minutes from kickoff to Full Time (90' + ~15' break + stoppage). */
const MATCH_MINUTES = 115;
/** Length of the half-time break, in wall-clock minutes. */
const HT_BREAK_MIN = 15;
/** Minimum gap between actual settle passes (per server instance). */
const SETTLE_INTERVAL_MS = 15_000;

/** Statuses that may still need settling (never includes a finished status). */
const UNSETTLED_STATUSES = ["NS", "TBD", ...LIVE_STATUSES];

/** Deterministic PRNG (mulberry32) so a fixture always yields the same script. */
function rngFor(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Goal counts weighted toward realistic low scores.
const GOAL_DIST = [0, 0, 1, 1, 1, 2, 2, 2, 3, 4];

interface MatchScript {
  homeMins: number[]; // sorted match-minutes (1..90) at which the home team scores
  awayMins: number[];
}

/**
 * Deterministic "script" for a fixture: the exact minutes each side scores.
 * The live score ramps along these minutes and the final score equals their
 * length, so live → half-time → full-time stay internally consistent.
 */
function scriptFor(id: number): MatchScript {
  const rng = rngFor(id);
  const home = GOAL_DIST[Math.floor(rng() * GOAL_DIST.length)];
  const away = GOAL_DIST[Math.floor(rng() * GOAL_DIST.length)];
  const mins = (n: number) =>
    Array.from({ length: n }, () => 1 + Math.floor(rng() * 90)).sort((a, b) => a - b);
  return { homeMins: mins(home), awayMins: mins(away) };
}

interface LiveState {
  status: string; // short code
  long: string;
  minute: number | null; // displayed match minute
  clock: number; // match-minute used to count goals so far
}

/** Map wall-clock minutes since kickoff to an in-game state. */
function liveState(elapsedMin: number): LiveState {
  if (elapsedMin <= 45) {
    return { status: "1H", long: "First Half", minute: Math.max(1, Math.round(elapsedMin)), clock: elapsedMin };
  }
  if (elapsedMin <= 45 + HT_BREAK_MIN) {
    return { status: "HT", long: "Halftime", minute: 45, clock: 45 };
  }
  // Second half: shift out the break so minute 45 resumes when play restarts.
  const second = elapsedMin - HT_BREAK_MIN;
  return { status: "2H", long: "Second Half", minute: Math.min(90, Math.round(second)), clock: second };
}

function goalsBy(mins: number[], clock: number): number {
  let n = 0;
  for (const m of mins) if (m <= clock) n++;
  return n;
}

let lastRunAt = 0;
let inFlight: Promise<number> | null = null;

/**
 * Settle every fixture whose kickoff has passed. Throttled and coalesced:
 * concurrent callers share one pass, and passes are spaced by
 * `SETTLE_INTERVAL_MS`. Failures are swallowed so settlement can never break a
 * page render. Returns the number of fixtures updated (0 if throttled).
 */
export async function settleDueFixtures(): Promise<number> {
  if (inFlight) return inFlight;
  if (Date.now() - lastRunAt < SETTLE_INTERVAL_MS) return 0;
  inFlight = run()
    .catch(() => 0)
    .finally(() => {
      lastRunAt = Date.now();
      inFlight = null;
    });
  return inFlight;
}

async function run(): Promise<number> {
  const now = new Date();

  const due = await prisma.fixture.findMany({
    where: { date: { lte: now }, statusShort: { in: UNSETTLED_STATUSES } },
    select: { id: true, date: true },
  });

  let updated = 0;
  for (const f of due) {
    const elapsed = (now.getTime() - f.date.getTime()) / 60_000;
    if (elapsed < 0) continue; // not actually kicked off (clock skew safety)

    const s = scriptFor(f.id);
    const htHome = goalsBy(s.homeMins, 45);
    const htAway = goalsBy(s.awayMins, 45);

    if (elapsed >= MATCH_MINUTES) {
      await prisma.fixture.update({
        where: { id: f.id },
        data: {
          statusShort: "FT",
          statusLong: "Match Finished",
          minute: null,
          goalsHome: s.homeMins.length,
          goalsAway: s.awayMins.length,
          htHome,
          htAway,
          syncedAt: now,
        },
      });
    } else {
      const live = liveState(elapsed);
      const reachedHt = live.clock >= 45;
      await prisma.fixture.update({
        where: { id: f.id },
        data: {
          statusShort: live.status,
          statusLong: live.long,
          minute: live.minute,
          goalsHome: goalsBy(s.homeMins, live.clock),
          goalsAway: goalsBy(s.awayMins, live.clock),
          htHome: reachedHt ? htHome : null,
          htAway: reachedHt ? htAway : null,
          syncedAt: now,
        },
      });
    }
    updated++;
  }

  return updated;
}
