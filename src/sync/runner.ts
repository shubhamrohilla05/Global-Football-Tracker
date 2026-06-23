/**
 * Sync runner: orchestrates sync jobs in priority order, budget-gated.
 *
 * Each job is a named step. The runner records start/end/calls-used in
 * SyncRun so you can inspect history. If the budget runs out mid-run, it
 * stops cleanly — the next run (tomorrow, or when you bump the limit) picks
 * up where it left off.
 */
import { prisma } from "@/lib/db";
import { callsRemainingToday, BudgetExhaustedError } from "@/lib/api-football/client";
import { syncLeagues } from "./leagues";
import { syncLeagueNearFixtureWindow } from "./fixtures";
import { syncLeagueStandings } from "./standings";
import { syncLeagueSquads } from "./squads";
import {
  MAJOR_LEAGUE_IDS,
  STANDARD_LEAGUE_IDS,
  INTERNATIONAL_LEAGUE_IDS,
} from "@/lib/api-football/leagues";

type JobType = "leagues" | "fixtures" | "standings" | "squads";

async function runJob(job: JobType, fn: () => Promise<number>) {
  const remaining = await callsRemainingToday();
  if (remaining <= 0) {
    console.log(`⛔ Skipping "${job}" — budget exhausted (0 remaining)`);
    return 0;
  }

  const run = await prisma.syncRun.create({ data: { job, startedAt: new Date() } });
  console.log(`\n🚀 Running: ${job} (${remaining} calls remaining)…`);

  try {
    const count = await fn();
    await prisma.syncRun.update({
      where: { id: run.id },
      data: {
        finishedAt: new Date(),
        status: "success",
        callsUsed: remaining - (await callsRemainingToday()),
        message: `${count} records`,
      },
    });
    return count;
  } catch (err) {
    const isBudget = err instanceof BudgetExhaustedError;
    await prisma.syncRun.update({
      where: { id: run.id },
      data: {
        finishedAt: new Date(),
        status: isBudget ? "failed" : "failed",
        callsUsed: remaining - (await callsRemainingToday()),
        message: isBudget
          ? "Budget exhausted — resume tomorrow"
          : (err as Error).message,
      },
    });
    if (isBudget) {
      console.log(`\n⛔ Budget exhausted during "${job}". Remaining jobs skipped.`);
      throw err; // stop the pipeline
    }
    console.error(`\n✗ "${job}" failed: ${(err as Error).message}`);
    return 0;
  }
}

/**
 * Run a full deep sync: leagues → fixtures + standings (major leagues) → squads.
 * Designed for daily cron. On the free tier (100/day) this covers ~15-20 leagues
 * with fixtures + standings and won't hit the budget if data is sparse.
 */
export async function runDailyDeepSync() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  PITCHSCOPE DAILY DEEP SYNC");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const remaining = await callsRemainingToday();
  console.log(`  API calls remaining today: ${remaining}`);

  // Step 1: Ensure leagues + countries are up to date.
  await runJob("leagues", syncLeagues);

  // Step 2: Fixtures + standings for major leagues.
  const majorLeagues = await prisma.league.findMany({
    where: {
      id: { in: [...MAJOR_LEAGUE_IDS, ...INTERNATIONAL_LEAGUE_IDS] },
      syncPriority: "MAJOR",
      currentSeason: { not: null },
    },
  });

  for (const league of majorLeagues) {
    if ((await callsRemainingToday()) <= 0) break;

    // Fixtures (next 7 days + last 3 days).
    await runJob("fixtures", () =>
      syncLeagueNearFixtureWindow(league.id, league.currentSeason!),
    );

    // Standings (1 call per league).
    if ((await callsRemainingToday()) > 0) {
      await runJob("standings", () =>
        syncLeagueStandings(league.id, league.currentSeason!),
      );
    }
  }

  // Step 3: Standard leagues — fixtures only (standings skipped to save budget).
  const standardLeagues = await prisma.league.findMany({
    where: {
      id: { in: STANDARD_LEAGUE_IDS },
      syncPriority: "STANDARD",
      currentSeason: { not: null },
    },
  });

  for (const league of standardLeagues) {
    if ((await callsRemainingToday()) <= 0) break;
    await runJob("fixtures", () =>
      syncLeagueNearFixtureWindow(league.id, league.currentSeason!),
    );
  }

  const after = await callsRemainingToday();
  console.log(`\n✅ Daily deep sync complete. ${after} calls remaining.`);
}

/**
 * Weekly squad sync: refresh rosters for all teams we've seen in fixtures.
 * Best run once per week (e.g. Monday morning). Skipped if budget < 20.
 */
export async function runWeeklySquadSync() {
  const remaining = await callsRemainingToday();
  if (remaining < 20) {
    console.log(`⏭ Skipping squad sync — only ${remaining} calls remaining (need 20+)`);
    return;
  }

  console.log("\n📋 Weekly squad sync…");

  const leagues = await prisma.league.findMany({
    where: { syncPriority: { in: ["MAJOR", "STANDARD"] }, currentSeason: { not: null } },
  });

  for (const league of leagues) {
    if ((await callsRemainingToday()) <= 0) break;
    await runJob("squads", () =>
      syncLeagueSquads(league.id, league.currentSeason!),
    );
  }

  console.log(`\n✅ Weekly squad sync complete. ${await callsRemainingToday()} calls remaining.`);
}
