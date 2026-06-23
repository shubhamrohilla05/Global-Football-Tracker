import Link from "next/link";
import { CalendarDays, Globe2, Radio, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { PageBackground } from "@/components/layout/page-background";
import { SectionHeading } from "@/components/ui/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { LeagueFixtureGroups } from "@/components/ui/league-fixture-groups";
import { REGION_LABELS, REGION_ORDER } from "@/lib/api-football/country-region";
import { hasDbConfig } from "@/lib/env";
import { getFixturesForDay, getLiveFixtures } from "@/lib/data/fixtures";

// Render per-request so every refresh re-settles fixtures and shows live data.
export const dynamic = "force-dynamic";

export default async function FixturesPage() {
  const configured = hasDbConfig();

  let today: Awaited<ReturnType<typeof getFixturesForDay>> = [];
  let live: Awaited<ReturnType<typeof getLiveFixtures>> = [];
  if (configured) {
    try {
      [today, live] = await Promise.all([
        getFixturesForDay(new Date()),
        getLiveFixtures(),
      ]);
    } catch {
      today = [];
      live = [];
    }
  }

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <PageBackground theme="stadium" />
      <PageHeader
        eyebrow="Browse"
        title="All Fixtures"
        icon={CalendarDays}
        accent
        description="Every match across every synced league. Drill in by region to see domestic leagues grouped by country."
      >
        {live.length > 0 && (
          <span className="chip chip-live">
            <span className="live-dot" />
            {live.length} live
          </span>
        )}
      </PageHeader>

      {/* Live strip */}
      {configured && live.length > 0 && (
        <section className="mt-10">
          <SectionHeading title={`Live now`} icon={Radio} accent />
          <div className="mt-4">
            <LeagueFixtureGroups fixtures={live} emptyTitle="" />
          </div>
        </section>
      )}

      {/* Today's fixtures */}
      {configured && (
        <section className="mt-10">
          <SectionHeading title="Today's fixtures" icon={CalendarDays} accent />
          <div className="mt-4">
            <LeagueFixtureGroups
              fixtures={today}
              emptyTitle="No fixtures today"
              emptyDescription="There are no matches scheduled today across the synced leagues."
            />
          </div>
        </section>
      )}

      {/* Region picker — always available */}
      <section className={configured ? "mt-12" : "mt-10"}>
        <SectionHeading title="Filter by region" icon={Globe2} />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {REGION_ORDER.map((r) => (
            <Link
              key={r}
              href={`/region/${r.toLowerCase().replace("_", "-")}`}
              className="group glass-card flex items-center justify-between p-4"
            >
              <div>
                <p className="text-sm font-semibold transition-colors group-hover:text-[var(--pitch-bright)]">
                  {REGION_LABELS[r]}
                </p>
                <p className="mt-0.5 text-xs text-[var(--fg-dim)]">View leagues</p>
              </div>
              <ChevronRight className="h-4 w-4 text-[var(--fg-dim)] transition-all group-hover:translate-x-1 group-hover:text-[var(--accent)]" />
            </Link>
          ))}
        </div>
      </section>

      {!configured && (
        <div className="mt-10">
          <EmptyState
            icon={CalendarDays}
            title="No fixtures synced yet"
            description="Fixtures will populate here once a database is connected and the sync runs. The daily sync covers major leagues across all regions plus all international competitions."
          />
        </div>
      )}
    </div>
  );
}
