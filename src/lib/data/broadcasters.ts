/**
 * Data access: broadcaster queries.
 */
import { prisma } from "@/lib/db";

export interface BroadcasterInfo {
  broadcaster: string;
  logo: string | null;
  streamUrl: string | null;
  platform: string | null;
  source: string;
}

/**
 * Get broadcasters for a league in a given country.
 * Returns an empty array if no data exists — the caller should show
 * a generic "check locally" message rather than nothing.
 */
export async function getBroadcastersForLeague(
  leagueId: number,
  countryCode: string,
): Promise<BroadcasterInfo[]> {
  const rows = await prisma.broadcaster.findMany({
    where: { leagueId, countryCode: countryCode.toLowerCase() },
    orderBy: { broadcaster: "asc" },
  });
  return rows.map((r) => ({
    broadcaster: r.broadcaster,
    logo: r.logo,
    streamUrl: r.streamUrl,
    platform: r.platform,
    source: r.source,
  }));
}

/** All broadcaster entries grouped by league for the /watch page. */
export async function getAllBroadcastersGrouped() {
  const rows = await prisma.broadcaster.findMany({
    where: { source: { in: ["CURATED", "OFFICIAL"] } },
    include: { league: true },
    orderBy: [{ leagueId: "asc" }, { countryCode: "asc" }, { broadcaster: "asc" }],
  });

  const byLeague = new Map<number, typeof rows>();
  for (const r of rows) {
    if (!byLeague.has(r.leagueId)) byLeague.set(r.leagueId, []);
    byLeague.get(r.leagueId)!.push(r);
  }
  return byLeague;
}
