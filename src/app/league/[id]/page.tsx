import Link from "next/link";
import { notFound } from "next/navigation";
import { Trophy, CalendarDays, ChevronRight, MapPin } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { PageBackground, leagueBackdrop } from "@/components/layout/page-background";
import { SectionHeading } from "@/components/ui/section-heading";
import { FixtureList } from "@/components/ui/fixture-list";
import { StandingTable } from "@/components/ui/standing-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Flag } from "@/components/ui/flag";
import { getLeague, getStandings, getGroupStandings } from "@/lib/data/structure";
import { getUpcomingForLeague, getRecentForLeague } from "@/lib/data/fixtures";

// Always render against the live DB so fixtures and standings reflect the
// latest synced results (otherwise the route is cached as static HTML and the
// standings/points go stale until a redeploy).
export const dynamic = "force-dynamic";

export default async function LeaguePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const leagueId = Number(id);
  if (!Number.isFinite(leagueId)) notFound();

  const league = await getLeague(leagueId);
  if (!league) notFound();

  const [upcoming, recent, syncedStandings] = await Promise.all([
    getUpcomingForLeague(leagueId, 30),
    getRecentForLeague(leagueId, 15),
    getStandings(leagueId),
  ]);

  // Fall back to standings computed from finished group-stage fixtures when no
  // standings have been synced (e.g. World Cup and other group tournaments).
  const usingSynced = syncedStandings.rows.length > 0;
  const standings = usingSynced ? syncedStandings : await getGroupStandings(leagueId);
  // Pick zone-coloring rules: real league tables get CL/Europa/relegation zones;
  // cups/playoffs get none; computed group tables get top-2-advance.
  const standingsVariant = usingSynced
    ? league.type === "CUP" || league.type === "PLAYOFF"
      ? "cup"
      : "league"
    : "group";

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageBackground {...leagueBackdrop(league.name)} />
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-xs text-[var(--fg-dim)]">
        <Link href="/fixtures" className="transition-colors hover:text-[var(--accent)]">
          Fixtures
        </Link>
        <ChevronRight className="h-3 w-3" />
        {league.country && (
          <>
            <span className="inline-flex items-center gap-1">
              <Flag code={league.country.code} flag={league.country.flag} name={league.country.name} size={12} />
              {league.country.name}
            </span>
            <ChevronRight className="h-3 w-3" />
          </>
        )}
        <span className="text-[var(--fg-muted)]">{league.name}</span>
      </nav>

      <PageHeader
        eyebrow={league.country ? league.country.name : "International"}
        title={league.name}
        icon={Trophy}
        accent
        logo={league.logo}
        description={
          league.currentSeason
            ? `${league.type} · Season ${league.currentSeason}/${league.currentSeason + 1}`
            : league.type
        }
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Fixtures column (2/3). When there are no upcoming fixtures, lead with
            recent results and demote the empty "upcoming" block to a note. */}
        <div className="space-y-8 lg:col-span-2">
          {upcoming.length > 0 ? (
            <>
              <section>
                <SectionHeading title="Upcoming fixtures" icon={CalendarDays} />
                <div className="mt-4">
                  <FixtureList fixtures={upcoming} />
                </div>
              </section>

              <section>
                <SectionHeading
                  title="Recent results"
                  icon={Trophy}
                  href={recent.length > 0 ? `/league/${leagueId}/results` : undefined}
                  hrefLabel="All results"
                />
                <div className="mt-4">
                  <FixtureList
                    fixtures={recent}
                    emptyTitle="No recent results"
                    emptyDescription="No completed matches in the synced window yet."
                  />
                </div>
              </section>
            </>
          ) : (
            <>
              <section>
                <SectionHeading
                  title="Recent results"
                  icon={Trophy}
                  href={recent.length > 0 ? `/league/${leagueId}/results` : undefined}
                  hrefLabel="All results"
                />
                <div className="mt-4">
                  <FixtureList
                    fixtures={recent}
                    emptyTitle="No recent results"
                    emptyDescription="No completed matches in the synced window yet."
                  />
                </div>
              </section>

              <p className="flex items-center gap-2 rounded-xl border border-dashed border-[var(--border-subtle)] bg-[#0c100c80] px-4 py-3 text-xs text-[var(--fg-dim)]">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                No upcoming {league.name} fixtures scheduled — the season may be on a break.
              </p>
            </>
          )}
        </div>

        {/* Standings column (1/3) */}
        <aside className="space-y-4">
          <div className="glass-card p-4 sm:p-5">
            <SectionHeading title="Standings" icon={Trophy} accent />
            {standings && standings.rows.length > 0 ? (
              <>
                {standings.season && (
                  <p className="mb-2 mt-3 px-1 text-[11px] text-[var(--fg-dim)]">
                    Season {standings.season}/{standings.season + 1}
                  </p>
                )}
                <StandingTable rows={standings.rows} variant={standingsVariant} />
              </>
            ) : (
              <div className="mt-4">
                <EmptyState
                  icon={Trophy}
                  title="Standings unavailable"
                  description="Standings for this league haven't been synced yet, or the season hasn't started."
                />
              </div>
            )}
          </div>

          {league.country && (
            <Link
              href={`/country/${league.country.code}`}
              className="glass-card group flex items-center justify-between p-4"
            >
              <div>
                <p className="text-sm font-semibold">More from {league.country.name}</p>
                <p className="mt-0.5 text-xs text-[var(--fg-dim)]">All leagues & fixtures</p>
              </div>
              <MapPin className="h-4 w-4 text-[var(--fg-dim)] transition-colors group-hover:text-[var(--accent)]" />
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}
