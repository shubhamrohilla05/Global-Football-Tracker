/**
 * Seed broadcaster data from the curated map into the DB.
 * Run once after `npm run sync` has populated leagues.
 * Usage: npx tsx src/scripts/seed-broadcasters.ts
 */
import { prisma } from "@/lib/db";
import { BROADCASTER_SEED } from "@/lib/broadcasters/seed-data";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is not set.");
    process.exit(1);
  }

  let created = 0;
  let skipped = 0;

  for (const entry of BROADCASTER_SEED) {
    // Check league exists first.
    const league = await prisma.league.findUnique({ where: { id: entry.leagueId } });
    if (!league) {
      console.warn(`  ⚠ League ${entry.leagueId} not found — skipping`);
      skipped++;
      continue;
    }

    await prisma.broadcaster.upsert({
      where: {
        leagueId_countryCode_broadcaster: {
          leagueId: entry.leagueId,
          countryCode: entry.countryCode,
          broadcaster: entry.broadcaster,
        },
      },
      create: {
        leagueId: entry.leagueId,
        countryCode: entry.countryCode,
        broadcaster: entry.broadcaster,
        streamUrl: entry.streamUrl ?? null,
        platform: entry.platform ?? null,
        source: "CURATED",
      },
      update: {
        streamUrl: entry.streamUrl ?? null,
        platform: entry.platform ?? null,
        updatedAt: new Date(),
      },
    });
    created++;
  }

  console.log(`✅ Seeded ${created} broadcasters (${skipped} skipped — league not in DB)`);
  await prisma.$disconnect();
}

main();
