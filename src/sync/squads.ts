/**
 * Sync: pull squad rosters for each team and upsert players + squad entries.
 * Called weekly since squads change rarely (transfer windows).
 */
import { prisma } from "@/lib/db";
import { af } from "@/lib/api-football/client";

export async function syncTeamSquad(teamId: number, season: number) {
  const data = await af.squads(teamId);
  if (!data.length) return 0;

  // The API returns [{ team: {...}, players: [...] }] — one entry per team.
  const squad = data[0]?.players ?? [];
  let upserted = 0;

  for (const p of squad) {
    try {
      // Upsert the player record.
      await prisma.player.upsert({
        where: { id: p.id },
        create: {
          id: p.id,
          name: p.name,
          age: p.age,
          photo: p.photo ?? null,
          position: p.position,
        },
        update: {
          name: p.name,
          age: p.age,
          photo: p.photo ?? null,
          position: p.position,
        },
      });

      // Upsert the squad entry (team + player + season).
      await prisma.squadEntry.upsert({
        where: {
          teamId_playerId_season: { teamId, playerId: p.id, season },
        },
        create: {
          teamId,
          playerId: p.id,
          season,
          number: p.number ?? undefined,
          position: p.position,
        },
        update: {
          number: p.number ?? undefined,
          position: p.position,
        },
      });

      upserted++;
    } catch (err) {
      console.error(`  ✗ Squad ${teamId}/${p.id}: ${(err as Error).message}`);
    }
  }

  await prisma.team.update({
    where: { id: teamId },
    data: { squadSyncedAt: new Date() },
  });

  return upserted;
}

/**
 * Sync squads for all teams in a given league/season.
 * Iterates teams from fixtures to know which teams are active.
 */
export async function syncLeagueSquads(leagueId: number, season: number) {
  const teams = await prisma.$queryRaw<{ teamId: number }[]>`
    SELECT DISTINCT "homeTeamId" AS "teamId" FROM "Fixture"
    WHERE "leagueId" = ${leagueId} AND "seasonYear" = ${season}
    UNION
    SELECT DISTINCT "awayTeamId" AS "teamId" FROM "Fixture"
    WHERE "leagueId" = ${leagueId} AND "seasonYear" = ${season}
  `;

  let total = 0;
  for (const { teamId } of teams) {
    total += await syncTeamSquad(teamId, season);
  }
  console.log(`  League ${leagueId}: ${total} squad entries upserted across ${teams.length} teams`);
  return total;
}
