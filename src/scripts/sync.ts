/**
 * Manual sync runner — invoked via `npm run sync`.
 * Loads env, boots Prisma, and runs the daily deep sync + weekly squad sync.
 *
 * Usage:
 *   npm run sync              # daily deep sync
 *   npm run sync -- --squads   # include weekly squad refresh
 */
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { runDailyDeepSync, runWeeklySquadSync } from "@/sync/runner";

async function main() {
  if (!env.API_FOOTBALL_KEY) {
    console.error("❌ API_FOOTBALL_KEY is not set. Add it to .env to run sync.");
    process.exit(1);
  }
  if (!env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is not set. Add it to .env to run sync.");
    process.exit(1);
  }

  console.log(`  API key: ${env.API_FOOTBALL_KEY.slice(0, 6)}…`);
  console.log(`  Daily limit: ${env.API_FOOTBALL_DAILY_LIMIT} calls`);
  console.log(`  Base URL: ${env.API_FOOTBALL_BASE_URL}`);

  const includeSquads = process.argv.includes("--squads");

  try {
    await runDailyDeepSync();

    if (includeSquads) {
      await runWeeklySquadSync();
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("Budget exhausted")) {
      console.log("\n⏭ Sync stopped — budget exhausted. Resume tomorrow.");
    } else {
      console.error("\n💥 Fatal sync error:", err);
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
