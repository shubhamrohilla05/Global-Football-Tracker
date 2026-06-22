/**
 * Sync: pull fixtures for a date range per league and upsert them.
 * Designed to be called for a single league at a time so the runner can
 * budget and rotate.
 */
import { prisma } from "@/lib/db";
import { af, callsRemainingToday, BudgetExhaustedError } from "@/lib/api-football/client";

export async function syncLeagueFixtures(
  leagueId: number,
  season: number,
  dateFrom: string, // YYYY-MM-DD
  dateTo: string,   // YYYY-MM-DD
) {
  const before = await callsRemainingToday();
  if (before <= 0) throw new BudgetExhaustedError(0);

  const data = await af.fixtures({ league: leagueId, season, from: dateFrom, to: dateTo });
  let upserted = 0;

  for (const f of data) {
    try {
      // Ensure season record exists.
      const seasonRec = await prisma.season.upsert({
        where: { leagueId_year: { leagueId, year: season } },
        create: { leagueId, year: season, current: true },
        update: { current: true },
      });

      await prisma.fixture.upsert({
        where: { id: f.fixture.id },
        create: {
          id: f.fixture.id,
          leagueId,
          seasonId: seasonRec.id,
          seasonYear: season,
          date: new Date(f.fixture.date),
          timezone: f.fixture.timezone,
          statusShort: f.fixture.status.short,
          statusLong: f.fixture.status.long ?? undefined,
          minute: f.fixture.status.elapsed,
          round: f.league.round ?? undefined,
          homeTeamId: f.teams.home.id,
          awayTeamId: f.teams.away.id,
          goalsHome: f.goals.home,
          goalsAway: f.goals.away,
          htHome: f.score.halftime.home,
          htAway: f.score.halftime.away,
          etHome: f.score.extratime.home,
          etAway: f.score.extratime.away,
          penHome: f.score.penalty.home,
          penAway: f.score.penalty.away,
          venue: f.fixture.venue?.name ?? undefined,
          venueCity: f.fixture.venue?.city ?? undefined,
          referee: f.fixture.referee ?? undefined,
        },
        update: {
          leagueId,
          seasonId: seasonRec.id,
          seasonYear: season,
          date: new Date(f.fixture.date),
          timezone: f.fixture.timezone,
          statusShort: f.fixture.status.short,
          statusLong: f.fixture.status.long ?? undefined,
          minute: f.fixture.status.elapsed,
          round: f.league.round ?? undefined,
          homeTeamId: f.teams.home.id,
          awayTeamId: f.teams.away.id,
          goalsHome: f.goals.home,
          goalsAway: f.goals.away,
          htHome: f.score.halftime.home,
          htAway: f.score.halftime.away,
          etHome: f.score.extratime.home,
          etAway: f.score.extratime.away,
          penHome: f.score.penalty.home,
          penAway: f.score.penalty.away,
          venue: f.fixture.venue?.name ?? undefined,
          venueCity: f.fixture.venue?.city ?? undefined,
          referee: f.fixture.referee ?? undefined,
          syncedAt: new Date(),
        },
      });

      // Also upsert the two teams (basic info from fixture payload).
      for (const t of [f.teams.home, f.teams.away]) {
        await prisma.team.upsert({
          where: { id: t.id },
          create: { id: t.id, name: t.name, logo: t.logo },
          update: { name: t.name, logo: t.logo },
        });
      }

      upserted++;
    } catch (err) {
      console.error(`  ✗ Fixture ${f.fixture.id}: ${(err as Error).message}`);
    }
  }

  const after = await callsRemainingToday();
  const used = before - after;
  console.log(
    `  League ${leagueId} (season ${season}): ${upserted} fixtures upserted, ${used} API calls used`,
  );
  return upserted;
}

/**
 * Convenience: sync the next 7 days + last 3 days for a league's current season.
 */
export async function syncLeagueNearFixtureWindow(leagueId: number, season: number) {
  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - 3);
  const to = new Date(today);
  to.setDate(to.getDate() + 7);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return syncLeagueFixtures(leagueId, season, fmt(from), fmt(to));
}
