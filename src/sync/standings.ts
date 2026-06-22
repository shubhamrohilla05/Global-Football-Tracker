/**
 * Sync: pull standings for a league/season and upsert them.
 */
import { prisma } from "@/lib/db";
import { af } from "@/lib/api-football/client";

export async function syncLeagueStandings(leagueId: number, season: number) {
  const data = await af.standings({ league: leagueId, season });
  if (!data.length) return 0;

  // Ensure season record exists.
  const seasonRec = await prisma.season.upsert({
    where: { leagueId_year: { leagueId, year: season } },
    create: { leagueId, year: season, current: true },
    update: { current: true },
  });

  let upserted = 0;

  for (const group of data) {
    for (const row of group) {
      try {
        await prisma.standing.upsert({
          where: {
            leagueId_seasonId_teamId_group: {
              leagueId,
              seasonId: seasonRec.id,
              teamId: row.team.id,
              group: row.group ?? "",
            },
          },
          create: {
            leagueId,
            seasonId: seasonRec.id,
            seasonYear: season,
            teamId: row.team.id,
            group: row.group ?? undefined,
            rank: row.rank,
            points: row.points,
            played: row.all.played,
            won: row.all.win,
            drawn: row.all.draw,
            lost: row.all.lose,
            goalsFor: row.goalsFor.total ?? 0,
            goalsAgainst: row.goalsAgainst.total ?? 0,
            goalsDiff: row.goalsDiff,
            form: row.form ?? undefined,
            description: row.description ?? undefined,
          },
          update: {
            rank: row.rank,
            points: row.points,
            played: row.all.played,
            won: row.all.win,
            drawn: row.all.draw,
            lost: row.all.lose,
            goalsFor: row.goalsFor.total ?? 0,
            goalsAgainst: row.goalsAgainst.total ?? 0,
            goalsDiff: row.goalsDiff,
            form: row.form ?? undefined,
            description: row.description ?? undefined,
            syncedAt: new Date(),
          },
        });

        // Ensure team exists.
        await prisma.team.upsert({
          where: { id: row.team.id },
          create: { id: row.team.id, name: row.team.name, logo: row.team.logo },
          update: { name: row.team.name, logo: row.team.logo },
        });

        upserted++;
      } catch (err) {
        console.error(
          `  ✗ Standing ${leagueId}/${season}/${row.team.id}: ${(err as Error).message}`,
        );
      }
    }
  }

  console.log(`  League ${leagueId}: ${upserted} standings upserted`);
  return upserted;
}
