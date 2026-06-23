/**
 * Data access: the global players directory.
 *
 * Players are sourced from synced squads (`SquadEntry`). For each player we
 * resolve a current club (latest season), a best season rating, and aggregate
 * goals/apps. "Emerging" = under-21. Used by the /players page.
 */
import { prisma } from "@/lib/db";

export interface PlayerCardData {
  id: number;
  name: string;
  photo: string | null;
  /** Short position code: GK / DF / MF / FW. */
  position: string | null;
  age: number | null;
  nationality: string | null;
  club: string | null;
  teamId: number | null;
  /** Shirt number for the latest season, when known. */
  number: number | null;
  /** Best season rating (0–10), when available. */
  rating: number | null;
  goals: number;
  appearances: number;
  /** Under-21. */
  emerging: boolean;
}

/** Position group order used for sorting/grouping (GK → DF → MF → FW). */
export const POSITION_GROUPS = [
  { code: "GK", label: "Goalkeepers" },
  { code: "DF", label: "Defenders" },
  { code: "MF", label: "Midfielders" },
  { code: "FW", label: "Forwards" },
] as const;

const POSITION_RANK: Record<string, number> = { GK: 0, DF: 1, MF: 2, FW: 3 };

const SHORT_POS: Record<string, string> = { GK: "GK", DEF: "DF", MID: "MF", ATT: "FW" };

/** Normalize an API position ("Attacker", "ATT", "Midfielder"…) to GK/DF/MF/FW. */
function shortPosition(pos?: string | null): string | null {
  if (!pos) return null;
  const key = ["GK", "DEF", "MID", "ATT"].find((p) => pos.toUpperCase().startsWith(p));
  if (key) return SHORT_POS[key];
  const p = pos.toLowerCase();
  if (p.startsWith("goal")) return "GK";
  if (p.startsWith("def")) return "DF";
  if (p.startsWith("mid")) return "MF";
  if (p.startsWith("att") || p.startsWith("for")) return "FW";
  // Unrecognized position: return null ("unclassified") rather than an arbitrary
  // 2-char code. Such a code would have no matching filter pill, so the player
  // would be miscounted in the pill totals and could never be isolated — and
  // would vanish whenever any position filter was active. As null they stay
  // visible under "All" and are simply absent from the group pills.
  return null;
}

/**
 * Every player with at least one squad entry, sorted by best rating then
 * appearances. Capped to keep the page snappy (the free-tier sync set is small).
 */
export async function getPlayersDirectory(): Promise<PlayerCardData[]> {
  const players = await prisma.player.findMany({
    where: { squadEntries: { some: {} } },
    include: {
      squadEntries: {
        include: { team: { select: { id: true, name: true } } },
        orderBy: { season: "desc" },
      },
    },
    take: 2000,
  });

  return players
    .map((p): PlayerCardData => {
      const entries = p.squadEntries;
      const latest = entries[0];
      const rating = entries.reduce<number | null>(
        (acc, e) => (e.rating == null ? acc : acc == null ? e.rating : Math.max(acc, e.rating)),
        null,
      );
      const goals = entries.reduce((s, e) => s + e.goals, 0);
      const appearances = entries.reduce((s, e) => s + e.appearances, 0);
      const age = p.age ?? null;
      return {
        id: p.id,
        name: p.name,
        photo: p.photo,
        position: shortPosition(p.position ?? latest?.position ?? null),
        age,
        nationality: p.nationality,
        club: latest?.team?.name ?? null,
        teamId: latest?.team?.id ?? null,
        number: latest?.number ?? null,
        rating,
        goals,
        appearances,
        emerging: age != null && age <= 21,
      };
    })
    .sort((a, b) => {
      // Best rating first when present, then most appearances. With the current
      // free-tier data both are usually absent, so fall back to a stable
      // position-group + name ordering so the grid reads tidily.
      const ra = a.rating ?? -1;
      const rb = b.rating ?? -1;
      if (rb !== ra) return rb - ra;
      if (b.appearances !== a.appearances) return b.appearances - a.appearances;
      const pa = POSITION_RANK[a.position ?? ""] ?? 9;
      const pb = POSITION_RANK[b.position ?? ""] ?? 9;
      if (pa !== pb) return pa - pb;
      return a.name.localeCompare(b.name);
    });
}
