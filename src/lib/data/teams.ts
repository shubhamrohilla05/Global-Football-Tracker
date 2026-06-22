/**
 * Data access: teams, squads, and the "Player to Watch" computation.
 *
 * The Player to Watch is auto-picked from squad stats (weighted goals +
 * rating), unless an editorial override exists for that team/league.
 */
import { prisma } from "@/lib/db";

export async function getTeam(id: number) {
  return prisma.team.findUnique({
    where: { id },
    include: { country: true },
  });
}

export interface TeamStanding {
  leagueId: number;
  leagueName: string | null;
  rank: number;
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalsDiff: number;
  form: string | null;
}

/**
 * The team's most recent league standing row (latest synced season),
 * used to make the team hero data-rich even without a crest.
 */
export async function getTeamStanding(teamId: number): Promise<TeamStanding | null> {
  const row = await prisma.standing.findFirst({
    where: { teamId },
    include: { league: { select: { name: true } } },
    orderBy: [{ seasonYear: "desc" }, { syncedAt: "desc" }],
  });
  if (!row) return null;
  return {
    leagueId: row.leagueId,
    leagueName: row.league?.name ?? null,
    rank: row.rank,
    points: row.points,
    played: row.played,
    won: row.won,
    drawn: row.drawn,
    lost: row.lost,
    goalsFor: row.goalsFor,
    goalsAgainst: row.goalsAgainst,
    goalsDiff: row.goalsDiff,
    form: row.form,
  };
}

export interface SquadGroup {
  position: string;
  label: string;
  players: Array<{
    id: number;
    name: string;
    photo: string | null;
    number: number | null;
    position: string | null;
    goals: number;
    assists: number;
    appearances: number;
    rating: number | null;
  }>;
}

const POSITION_LABELS: Record<string, string> = {
  GK: "Goalkeepers",
  DEF: "Defenders",
  MID: "Midfielders",
  ATT: "Forwards",
};

/** A team's squad for the current season, grouped by position. */
export async function getTeamSquad(teamId: number) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true },
  });
  if (!team) return null;

  // We don't strictly know the season; use the most recent squad entries.
  const entries = await prisma.squadEntry.findMany({
    where: { teamId },
    include: { player: true },
    orderBy: { player: { position: "asc" } },
  });

  if (entries.length === 0) return [];

  // Bucket by the standard position prefix (GK / DEF / MID / ATT).
  const buckets = new Map<string, SquadGroup["players"]>();
  for (const e of entries) {
    const pos = e.player.position ?? e.position ?? "MID";
    const key = ["GK", "DEF", "MID", "ATT"].find((p) => pos.startsWith(p)) ?? "MID";
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push({
      id: e.player.id,
      name: e.player.name,
      photo: e.player.photo,
      number: e.number,
      position: e.player.position,
      goals: e.goals,
      assists: e.assists,
      appearances: e.appearances,
      rating: e.rating,
    });
  }

  return (["GK", "DEF", "MID", "ATT"] as const)
    .filter((k) => buckets.has(k))
    .map((k) => ({ position: k, label: POSITION_LABELS[k], players: buckets.get(k)! }));
}

export interface PlayerToWatch {
  playerId: number;
  name: string;
  photo: string | null;
  position: string | null;
  reason: string;
  source: "override" | "computed";
}

/**
 * Pick the Player to Watch for a team:
 *   1. If an editorial override exists, use it.
 *   2. Otherwise compute the top contributor from squad stats — a blend of
 *      goals (×3), assists (×2), and rating (×4), normalized over appearances.
 */
export async function getPlayerToWatch(teamId: number): Promise<PlayerToWatch | null> {
  // 1. Editorial override.
  const override = await prisma.playerToWatchOverride.findFirst({
    where: { teamId },
    include: { player: true },
    orderBy: { updatedAt: "desc" },
  });
  if (override) {
    return {
      playerId: override.player.id,
      name: override.player.name,
      photo: override.player.photo,
      position: override.player.position,
      reason: override.reason,
      source: "override",
    };
  }

  // 2. Computed: rank squad entries by a weighted score.
  const entries = await prisma.squadEntry.findMany({
    where: { teamId },
    include: { player: true },
  });
  if (entries.length === 0) return null;

  const ranked = entries
    .map((e) => {
      const rating = e.rating ?? 0;
      const score = e.goals * 3 + e.assists * 2 + rating * 4;
      return { entry: e, score };
    })
    .sort((a, b) => b.score - a.score);

  const top = ranked[0];
  if (!top) return null;

  const reasonParts: string[] = [];
  if (top.entry.goals > 0) reasonParts.push(`${top.entry.goals} goals`);
  if (top.entry.assists > 0) reasonParts.push(`${top.entry.assists} assists`);
  if (top.entry.appearances > 0) reasonParts.push(`${top.entry.appearances} apps`);
  if (top.entry.rating) reasonParts.push(`${top.entry.rating.toFixed(1)} avg rating`);
  const reason = reasonParts.length
    ? `Top contributor: ${reasonParts.join(", ")}`
    : "Key squad member";

  return {
    playerId: top.entry.player.id,
    name: top.entry.player.name,
    photo: top.entry.player.photo,
    position: top.entry.player.position,
    reason,
    source: "computed",
  };
}
