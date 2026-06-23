/**
 * Data fixup for the seeded mock fixtures so the standings reflect the true
 * "current, to-date" points table — without ever showing scores for matches
 * that have not been played yet.
 *
 * Modes (scoped to group-stage fixtures of the given league, default 1 = World
 * Cup):
 *   default            Fill results for matches whose kickoff is BEFORE today
 *                      (UTC) and still "NS". These have genuinely been played.
 *   --reset-upcoming   Revert any today/future "FT" group match back to "NS"
 *                      and clear its score (undoes accidentally-filled matches
 *                      that haven't kicked off yet).
 *
 * Scores are deterministic (seeded by fixture id) so re-runs are stable, and
 * each mode is idempotent.
 *
 *   npx tsx src/scripts/complete-group-results.ts [leagueId] [--reset-upcoming]
 */
import { prisma } from "@/lib/db";

/** Deterministic PRNG (mulberry32) so a given fixture always gets the same score. */
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

// Goal distribution weighted toward realistic low scores.
const GOAL_DIST = [0, 0, 1, 1, 1, 2, 2, 2, 3, 4];

function scoreFor(id: number) {
  const rng = rngFor(id);
  const home = GOAL_DIST[Math.floor(rng() * GOAL_DIST.length)];
  const away = GOAL_DIST[Math.floor(rng() * GOAL_DIST.length)];
  const htHome = Math.floor(rng() * (home + 1));
  const htAway = Math.floor(rng() * (away + 1));
  return { home, away, htHome, htAway };
}

async function main() {
  const args = process.argv.slice(2);
  const resetUpcoming = args.includes("--reset-upcoming");
  const leagueId = Number(args.find((a) => !a.startsWith("--")) ?? 1);

  // "Today" boundary in UTC, matching how the app buckets fixtures by day.
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  if (resetUpcoming) {
    // Revert any today/future group match that was marked finished back to
    // upcoming, clearing the fabricated score.
    const upcoming = await prisma.fixture.findMany({
      where: {
        leagueId,
        round: { startsWith: "Group" },
        statusShort: { in: ["FT", "AET", "PEN"] },
        date: { gte: todayStart },
      },
      select: { id: true },
    });
    for (const f of upcoming) {
      await prisma.fixture.update({
        where: { id: f.id },
        data: { statusShort: "NS", goalsHome: null, goalsAway: null, htHome: null, htAway: null, minute: null },
      });
    }
    console.log(`League ${leagueId}: reset ${upcoming.length} today/future group match(es) to upcoming.`);
    return;
  }

  // Default: fill only matches that kicked off BEFORE today and are still NS.
  const pending = await prisma.fixture.findMany({
    where: {
      leagueId,
      statusShort: "NS",
      round: { startsWith: "Group" },
      date: { lt: todayStart },
    },
    select: { id: true },
    orderBy: { date: "asc" },
  });

  if (pending.length === 0) {
    console.log(`Nothing to do: no past-dated NS group fixtures for league ${leagueId}.`);
    return;
  }

  for (const f of pending) {
    const s = scoreFor(f.id);
    await prisma.fixture.update({
      where: { id: f.id },
      data: { statusShort: "FT", goalsHome: s.home, goalsAway: s.away, htHome: s.htHome, htAway: s.htAway },
    });
  }
  console.log(`League ${leagueId}: filled ${pending.length} past-dated group result(s).`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
