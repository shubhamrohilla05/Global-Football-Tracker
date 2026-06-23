import Link from "next/link";
import { notFound } from "next/navigation";
import { Trophy, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { PageBackground, leagueBackdrop } from "@/components/layout/page-background";
import { FixtureList } from "@/components/ui/fixture-list";
import { EmptyState } from "@/components/ui/empty-state";
import { getLeague } from "@/lib/data/structure";
import { getLeagueSeasonResults } from "@/lib/data/fixtures";
import type { FixtureRowData } from "@/components/ui/fixture-row";

// Render live so results reflect the latest synced fixtures, not a stale cache.
export const dynamic = "force-dynamic";

/** Group fixtures (already newest-first) into [dateLabel, fixtures] sections. */
function groupByDay(fixtures: FixtureRowData[]): [string, FixtureRowData[]][] {
  const groups: [string, FixtureRowData[]][] = [];
  for (const f of fixtures) {
    const label = new Date(f.date).toLocaleDateString(undefined, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const last = groups[groups.length - 1];
    if (last && last[0] === label) last[1].push(f);
    else groups.push([label, [f]]);
  }
  return groups;
}

export default async function LeagueResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const leagueId = Number(id);
  if (!Number.isFinite(leagueId)) notFound();

  const league = await getLeague(leagueId);
  if (!league) notFound();

  const { season, fixtures } = await getLeagueSeasonResults(leagueId);
  const days = groupByDay(fixtures);

  return (
    <div className="relative mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <PageBackground {...leagueBackdrop(league.name)} />
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-xs text-[var(--fg-dim)]">
        <Link href="/fixtures" className="transition-colors hover:text-[var(--accent)]">
          Fixtures
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link
          href={`/league/${leagueId}`}
          className="transition-colors hover:text-[var(--accent)]"
        >
          {league.name}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-[var(--fg-muted)]">Results</span>
      </nav>

      <PageHeader
        eyebrow={league.country ? league.country.name : "International"}
        title={`${league.name} — Results`}
        icon={Trophy}
        accent
        description={
          season
            ? `Season ${season}/${season + 1} · ${fixtures.length} matches played`
            : `${fixtures.length} matches played`
        }
      />

      <div className="mt-8 space-y-8">
        {days.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="No results yet"
            description="No completed matches have been synced for this league's season."
          />
        ) : (
          days.map(([label, dayFixtures]) => (
            <section key={label}>
              <h2 className="mb-3 px-1 text-sm font-semibold text-[var(--fg-muted)]">
                {label}
              </h2>
              <FixtureList fixtures={dayFixtures} />
            </section>
          ))
        )}
      </div>
    </div>
  );
}
