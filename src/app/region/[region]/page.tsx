import Link from "next/link";
import { notFound } from "next/navigation";
import { Globe2, CalendarDays, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { PageBackground } from "@/components/layout/page-background";
import { EmptyState } from "@/components/ui/empty-state";
import { TeamLogo } from "@/components/ui/team-logo";
import { Flag } from "@/components/ui/flag";
import { REGION_LABELS, REGION_ORDER } from "@/lib/api-football/country-region";
import { hasDbConfig } from "@/lib/env";
import { prisma } from "@/lib/db";

export const dynamicParams = false;

export function generateStaticParams() {
  return REGION_ORDER.map((r) => ({
    region: r.toLowerCase().replace("_", "-"),
  }));
}

export default async function RegionPage({
  params,
}: {
  params: Promise<{ region: string }>;
}) {
  const { region: slug } = await params;
  const code = slug.toUpperCase().replace("-", "_") as (typeof REGION_ORDER)[number];
  if (!REGION_ORDER.includes(code)) notFound();

  const label = REGION_LABELS[code];
  const configured = hasDbConfig();

  // Fetch countries + leagues for this region.
  let countries: Array<{
    id: number;
    name: string;
    code: string;
    flag: string | null;
    leagues: Array<{ id: number; name: string; logo: string | null; type: string }>;
  }> = [];
  let todayCount = 0;

  if (configured) {
    try {
      if (code === "WORLD") {
        // International competitions (no country).
        const leagues = await prisma.league.findMany({
          where: {
            syncPriority: { not: "NONE" },
            OR: [{ country: null }, { countryCode: "world" }],
          },
          orderBy: { name: "asc" },
        });
        countries = [
          {
            id: 0,
            name: "International",
            code: "world",
            flag: null,
            leagues: leagues.map((l) => ({ id: l.id, name: l.name, logo: l.logo, type: l.type })),
          },
        ];
      } else {
        const result = await prisma.country.findMany({
          where: { region: code },
          include: {
            leagues: {
              where: { syncPriority: { not: "NONE" } },
              orderBy: [{ syncPriority: "desc" }, { name: "asc" }],
            },
          },
          orderBy: { name: "asc" },
        });
        countries = result
          .filter((c) => c.leagues.length > 0)
          .map((c) => ({
            id: c.id,
            name: c.name,
            code: c.code,
            flag: c.flag,
            leagues: c.leagues.map((l) => ({ id: l.id, name: l.name, logo: l.logo, type: l.type })),
          }));

        // Count today's fixtures for this region.
        const leagueIds = result.flatMap((c) => c.leagues.map((l) => l.id));
        if (leagueIds.length) {
          const start = new Date();
          start.setUTCHours(0, 0, 0, 0);
          const end = new Date(start);
          end.setUTCDate(end.getUTCDate() + 1);
          todayCount = await prisma.fixture.count({
            where: { leagueId: { in: leagueIds }, date: { gte: start, lt: end } },
          });
        }
      }
    } catch {
      countries = [];
    }
  }

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageBackground theme="pitch" />
      <PageHeader
        eyebrow="Region"
        title={label}
        icon={Globe2}
        accent
        description={
          code === "WORLD"
            ? "International competitions — World Cup, continental tournaments, qualifiers and friendlies."
            : `Domestic leagues and cups across ${label}.${todayCount > 0 ? ` ${todayCount} match${todayCount === 1 ? "" : "es"} today.` : ""}`
        }
      />

      <div className="mt-8">
        {!configured ? (
          <EmptyState
            icon={CalendarDays}
            title="No leagues synced yet"
            description={`Leagues in ${label} will appear here once a database is connected and the sync runs.`}
          />
        ) : countries.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title={`No synced leagues in ${label} yet`}
            description="This region isn't in the current free-tier sync scope. Expand MAJOR_LEAGUE_IDS or upgrade the API key to add coverage."
          />
        ) : (
          <div className="space-y-8">
            {countries.map((country) => (
              <section key={country.code}>
                {/* Country header — flag + name make the leagues' origin clear */}
                <div className="flex items-end justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[var(--border-subtle)] bg-[#ffffff08]">
                      <Flag code={country.code} flag={country.flag} name={country.name} size={24} />
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate text-xl font-bold tracking-tight sm:text-2xl">
                        {country.name}
                      </h2>
                      <p className="text-xs text-[var(--fg-dim)]">
                        {country.leagues.length} {country.leagues.length === 1 ? "competition" : "competitions"}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={country.code !== "world" ? `/country/${country.code}` : "/international"}
                    className="group flex shrink-0 items-center gap-1 text-sm font-semibold text-[var(--fg-muted)] transition-colors hover:text-[var(--accent)]"
                  >
                    Country
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {country.leagues.map((l) => (
                    <Link
                      key={l.id}
                      href={`/league/${l.id}`}
                      className="glass-card group flex items-center gap-3 p-4"
                    >
                      <TeamLogo src={l.logo} name={l.name} size={36} className="!rounded-md bg-white/5 p-1" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold transition-colors group-hover:text-[var(--accent)]">
                          {l.name}
                        </p>
                        <p className="flex items-center gap-1.5 text-xs text-[var(--fg-dim)]">
                          <Flag code={country.code} flag={country.flag} name={country.name} size={12} />
                          <span className="truncate">{country.name} · {l.type}</span>
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-[var(--fg-dim)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--accent)]" />
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
