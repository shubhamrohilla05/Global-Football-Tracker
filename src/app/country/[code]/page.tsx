import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Trophy, CalendarDays, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { PageBackground } from "@/components/layout/page-background";
import { SectionHeading } from "@/components/ui/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { FixtureRow, type FixtureRowData } from "@/components/ui/fixture-row";
import { Flag } from "@/components/ui/flag";
import { toFixtureRow } from "@/lib/data/fixtures";

export default async function CountryPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: rawCode } = await params;
  const code = rawCode.toLowerCase();
  const country = await prisma.country.findUnique({
    where: { code },
    include: {
      leagues: {
        where: { syncPriority: { not: "NONE" } },
        orderBy: [{ syncPriority: "desc" }, { name: "asc" }],
      },
    },
  });
  if (!country) notFound();

  // Today's fixtures across this country's leagues.
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  const leagueIds = country.leagues.map((l) => l.id);
  const todayFixtures = leagueIds.length
    ? await prisma.fixture.findMany({
        where: { leagueId: { in: leagueIds }, date: { gte: start, lt: end } },
        include: {
          homeTeam: true,
          awayTeam: true,
          league: { include: { country: true } },
        },
        orderBy: { date: "asc" },
        take: 30,
      })
    : [];
  const todayRows: FixtureRowData[] = todayFixtures.map(toFixtureRow);

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageBackground theme="pitch" />
      <nav className="mb-6 flex items-center gap-1.5 text-xs text-[var(--fg-dim)]">
        <Link
          href={`/region/${country.region.toLowerCase().replace("_", "-")}`}
          className="transition-colors hover:text-[var(--accent)]"
        >
          {country.region.replace("_", " ")}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-[var(--fg-muted)]">{country.name}</span>
      </nav>

      <PageHeader
        eyebrow={country.region === "WORLD" ? "International" : country.region.replace("_", " ")}
        title={country.name}
        icon={MapPin}
        accent
        description={`${country.leagues.length} synced ${country.leagues.length === 1 ? "league" : "leagues"} in this country.`}
      >
        <Flag code={country.code} flag={country.flag} name={country.name} size={34} />
      </PageHeader>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <section>
            <SectionHeading title="Leagues & cups" icon={Trophy} accent />
            {country.leagues.length > 0 ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {country.leagues.map((l) => (
                  <Link
                    key={l.id}
                    href={`/league/${l.id}`}
                    className="glass-card group flex items-center gap-3 p-4"
                  >
                    {l.logo && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={l.logo}
                        alt=""
                        className="h-10 w-10 shrink-0 object-contain"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold transition-colors group-hover:text-[var(--accent)]">
                        {l.name}
                      </p>
                      <p className="text-xs text-[var(--fg-dim)]">
                        {l.type} · {l.syncPriority === "MAJOR" ? "Top division" : l.syncPriority}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[var(--fg-dim)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--accent)]" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mt-4">
                <EmptyState
                  icon={Trophy}
                  title="No synced leagues"
                  description="No leagues from this country are in the current sync scope."
                />
              </div>
            )}
          </section>
        </div>

        <aside>
          <SectionHeading title={`Today in ${country.name}`} icon={CalendarDays} accent />
          <div className="mt-4 space-y-2">
            {todayRows.length > 0 ? (
              todayRows.map((f) => <FixtureRow key={f.id} fixture={f} showLeague />)
            ) : (
              <EmptyState
                icon={CalendarDays}
                title="No fixtures today"
                description={`No ${country.name} matches scheduled today.`}
              />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
