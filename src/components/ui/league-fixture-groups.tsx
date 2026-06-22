import Link from "next/link";
import { ChevronRight, CalendarDays } from "lucide-react";
import { FixtureRow, type FixtureRowData } from "./fixture-row";
import { TeamLogo } from "./team-logo";
import { Flag } from "./flag";
import { EmptyState } from "./empty-state";
import { groupFixturesByLeague } from "@/lib/data/fixtures";

/**
 * Fixtures grouped under league headers. Each header shows the competition
 * logo, the country flag + name, and the league name — so it's always clear
 * which league a block of fixtures belongs to.
 */
export function LeagueFixtureGroups({
  fixtures,
  emptyTitle = "No fixtures",
  emptyDescription = "There are no matches in this view right now.",
}: {
  fixtures: FixtureRowData[];
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (fixtures.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  const groups = groupFixturesByLeague(fixtures);

  return (
    <div className="space-y-5">
      {groups.map((g) => {
        const header = (
          <>
            <TeamLogo
              src={g.leagueLogo}
              name={g.leagueName}
              size={30}
              className="!rounded-lg bg-white/5 p-0.5"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--fg-dim)]">
                {g.country && (
                  <Flag
                    code={g.country.code}
                    flag={g.country.flag}
                    name={g.country.name}
                    size={13}
                  />
                )}
                <span className="truncate">{g.country?.name ?? "International"}</span>
              </div>
              <p className="truncate text-sm font-bold leading-tight">
                {g.leagueName}
              </p>
            </div>
          </>
        );

        return (
          <section
            key={g.leagueId}
            className="panel overflow-hidden"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[#ffffff06] px-3 py-2.5 sm:px-4">
              {g.leagueId > 0 ? (
                <Link
                  href={`/league/${g.leagueId}`}
                  className="group flex min-w-0 items-center gap-2.5"
                >
                  {header}
                </Link>
              ) : (
                <div className="flex min-w-0 items-center gap-2.5">{header}</div>
              )}
              <span className="hidden shrink-0 items-center gap-1.5 text-[11px] font-medium text-[var(--fg-dim)] sm:flex">
                {g.fixtures.length} {g.fixtures.length === 1 ? "match" : "matches"}
              </span>
            </div>
            <div className="space-y-1.5 p-2 sm:p-2.5">
              {g.fixtures.map((f) => (
                <FixtureRow key={f.id} fixture={f} />
              ))}
            </div>
            {g.leagueId > 0 && (
              <Link
                href={`/league/${g.leagueId}`}
                className="group flex items-center justify-center gap-1 border-t border-[var(--border-subtle)] py-2.5 text-xs font-semibold text-[var(--fg-dim)] transition-colors hover:bg-[#ffffff06] hover:text-[var(--pitch-bright)]"
              >
                View league
                <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            )}
          </section>
        );
      })}
    </div>
  );
}
