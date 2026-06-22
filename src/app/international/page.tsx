import Link from "next/link";
import { Trophy, CalendarDays, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { PageBackground } from "@/components/layout/page-background";
import { SectionHeading } from "@/components/ui/section-heading";
import { FixtureList } from "@/components/ui/fixture-list";
import { EmptyState } from "@/components/ui/empty-state";
import { hasDbConfig } from "@/lib/env";
import { getUpcomingForLeague, getRecentForLeague } from "@/lib/data/fixtures";
import { getInternationalLeagues } from "@/lib/data/structure";

const HERO_DESC =
  "World Cup, Euros, Nations League, Copa América, Africa Cup of Nations, Asian Cup, Gold Cup, qualifiers and friendlies — all international football in one place.";

export default async function InternationalPage() {
  const configured = hasDbConfig();
  if (!configured) {
    return (
      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <PageBackground theme="stadium" />
        <PageHeader
          eyebrow="Cross-region"
          title="International Fixtures"
          icon={Trophy}
          accent
          description={HERO_DESC}
        />
        <div className="mt-8">
          <EmptyState
            icon={CalendarDays}
            title="No fixtures synced yet"
            description="International fixtures will appear here once you connect a database and run the sync. The international competitions (World Cup, Euros, Nations League, Copa América, AFCON, Asian Cup) are part of the default sync scope."
          />
        </div>
      </div>
    );
  }

  const leagues = await getInternationalLeagues();

  // For each international competition, pull upcoming + recent fixtures.
  const competitions = await Promise.all(
    leagues.map(async (l) => {
      const [upcoming, recent] = await Promise.all([
        getUpcomingForLeague(l.id, 10),
        getRecentForLeague(l.id, 5),
      ]);
      return { league: l, upcoming, recent };
    }),
  );

  const hasAny = competitions.some(
    (c) => c.upcoming.length > 0 || c.recent.length > 0,
  );

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <PageBackground theme="stadium" />
      <PageHeader
        eyebrow="Cross-region"
        title="International Fixtures"
        icon={Trophy}
        accent
        description={HERO_DESC}
      />

      {competitions.length > 0 && (
        <div className="mt-7 flex flex-wrap gap-2">
          {competitions.map((c) => (
            <Link
              key={c.league.id}
              href={`/league/${c.league.id}`}
              className="chip transition-colors hover:border-[color-mix(in_oklab,var(--accent)_45%,transparent)] hover:text-[var(--pitch-bright)]"
            >
              {c.league.logo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.league.logo} alt="" className="h-3.5 w-3.5 object-contain" />
              )}
              {c.league.name}
              <ChevronRight className="h-3 w-3" />
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 space-y-12">
        {hasAny ? (
          competitions
            .filter((c) => c.upcoming.length > 0 || c.recent.length > 0)
            .map(({ league, upcoming, recent }) => (
              <section key={league.id}>
                <SectionHeading
                  title={league.name}
                  logo={league.logo}
                  icon={Trophy}
                  href={`/league/${league.id}`}
                  hrefLabel="Competition"
                  accent
                />
                <div
                  className={
                    "mt-4 grid gap-6 " + (upcoming.length > 0 ? "lg:grid-cols-2" : "")
                  }
                >
                  {upcoming.length > 0 && (
                    <div>
                      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--fg-dim)]">
                        Upcoming
                      </h4>
                      <FixtureList fixtures={upcoming} />
                    </div>
                  )}
                  <div>
                    <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--fg-dim)]">
                      Recent results
                    </h4>
                    <FixtureList
                      fixtures={recent}
                      emptyTitle="No recent results"
                      emptyDescription="No completed matches in the window."
                    />
                  </div>
                </div>
              </section>
            ))
        ) : (
          <EmptyState
            icon={CalendarDays}
            title="No international fixtures in the window"
            description="There are no upcoming or recent international matches in the synced data. International breaks occur between club seasons — check back during the next window."
          />
        )}
      </div>
    </div>
  );
}
