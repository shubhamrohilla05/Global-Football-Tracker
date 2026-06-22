/**
 * Sync: upsert leagues and their parent countries from API-Football.
 * This is the first sync step — everything else depends on leagues existing.
 */
import { prisma } from "@/lib/db";
import { af } from "@/lib/api-football/client";
import { resolveRegion } from "@/lib/api-football/country-region";
import {
  MAJOR_LEAGUE_IDS,
  STANDARD_LEAGUE_IDS,
  INTERNATIONAL_LEAGUE_IDS,
  ALL_SYNCED_LEAGUE_IDS,
} from "@/lib/api-football/leagues";
import type { SyncPriority, LeagueType } from "@prisma/client";

function leagueTypeFromApi(raw: string): LeagueType {
  const lower = raw.toLowerCase();
  if (lower.includes("cup") || lower.includes("friendli")) return "CUP";
  if (lower.includes("play-off")) return "PLAYOFF";
  return "LEAGUE";
}

function syncPriorityFor(id: number): SyncPriority {
  if (MAJOR_LEAGUE_IDS.includes(id)) return "MAJOR";
  if (STANDARD_LEAGUE_IDS.includes(id)) return "STANDARD";
  if (INTERNATIONAL_LEAGUE_IDS.includes(id)) return "MAJOR"; // internationals = major
  return "MINOR";
}

export async function syncLeagues() {
  console.log("📊 Syncing leagues…");

  // The /leagues endpoint returns ALL leagues in a single response, so we fetch
  // once and filter to the IDs we care about. (Fetching per-id would be 33 calls
  // and instantly trips the free tier's per-minute rate limit.)
  const wanted = new Set(ALL_SYNCED_LEAGUE_IDS);
  const all = await af.leagues();
  const items = all.filter((item) => wanted.has(item.league.id));
  let upserted = 0;
  let errors = 0;

  for (const item of items) {
    const id = item.league.id;
    try {
      const api = item.league;
        const countryName = item.country?.name;
        const countryCode = item.country?.code?.toLowerCase() ?? null;
        const region = resolveRegion(countryCode);
        const type = leagueTypeFromApi(api.type ?? "");
        const priority = syncPriorityFor(id);
        // Pick the current season's year (fall back to the latest available).
        const currentSeason =
          item.seasons?.find((s) => s.current)?.year ??
          item.seasons?.at(-1)?.year ??
          null;

        // Upsert the country (if this league has one).
        let countryId: number | undefined;
        if (countryName) {
          const country = await prisma.country.upsert({
            where: { code: countryCode ?? countryName.toLowerCase() },
            create: {
              name: countryName,
              code: countryCode ?? countryName.toLowerCase(),
              flag: item.country?.flag ?? null,
              region,
            },
            update: {
              name: countryName,
              flag: item.country?.flag ?? null,
              region,
            },
          });
          countryId = country.id;
        }

        // Upsert the league.
        await prisma.league.upsert({
          where: { id },
          create: {
            id,
            name: api.name,
            type,
            logo: api.logo ?? null,
            countryId: countryId ?? null,
            countryCode: countryCode ?? "world",
            syncPriority: priority,
            currentSeason,
          },
          update: {
            name: api.name,
            type,
            logo: api.logo ?? null,
            countryId: countryId ?? null,
            countryCode: countryCode ?? "world",
            syncPriority: priority,
            currentSeason,
          },
        });
        upserted++;
      } catch (err) {
        console.error(`  ✗ League ${id}: ${(err as Error).message}`);
        errors++;
      }
  }

  console.log(`  ✓ ${upserted} leagues upserted, ${errors} errors`);
  return upserted;
}
