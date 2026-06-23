import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Star,
  MapPin,
  CalendarDays,
  Trophy,
  Users,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { PageBackground } from "@/components/layout/page-background";
import { FixtureList } from "@/components/ui/fixture-list";
import { EmptyState } from "@/components/ui/empty-state";
import { Flag } from "@/components/ui/flag";
import { TeamLogo } from "@/components/ui/team-logo";
import { getTeam, getTeamSquad, getPlayerToWatch, getTeamStanding } from "@/lib/data/teams";
import { getTeamFixtures } from "@/lib/data/fixtures";

// Render per-request so every refresh re-settles fixtures and shows live data.
export const dynamic = "force-dynamic";
import { FavoriteButton } from "@/components/ui/favorite-button";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const teamId = Number(id);
  if (!Number.isFinite(teamId)) notFound();

  const team = await getTeam(teamId);
  if (!team) notFound();

  const [squad, playerToWatch, fixtures, standing] = await Promise.all([
    getTeamSquad(teamId),
    getPlayerToWatch(teamId),
    getTeamFixtures(teamId),
    getTeamStanding(teamId),
  ]);

  const hasUpcoming = fixtures.upcoming.length > 0;

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <PageBackground theme="pitch" />
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-xs text-[var(--fg-dim)]">
        {team.country && (
          <>
            <Link
              href={`/country/${team.country.code}`}
              className="transition-colors hover:text-[var(--pitch-bright)]"
            >
              {team.country.name}
            </Link>
            <ChevronRight className="h-3 w-3" />
          </>
        )}
        <span className="text-[var(--fg-muted)]">{team.name}</span>
      </nav>

      {/* Hero banner */}
      <div className="panel pitch-markings relative overflow-hidden p-6 sm:p-8">
        <div className="pitch-stripes pointer-events-none absolute inset-0 opacity-40" />
        <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-[var(--accent)] opacity-[0.10] blur-[90px]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <TeamLogo
              src={team.logo}
              name={team.name}
              size={72}
              className="!rounded-2xl border border-[var(--border-subtle)] bg-white/5 p-2"
            />
            <div className="min-w-0">
              {team.country && (
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                  <Flag
                    code={team.country.code}
                    flag={team.country.flag}
                    name={team.country.name}
                    size={13}
                  />
                  {team.country.name}
                </p>
              )}
              <h1 className="mt-1.5 font-display text-2xl font-extrabold tracking-tight sm:text-[2rem]">
                {team.name}
              </h1>
              {(team.venue || team.venueCity) && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-[var(--fg-muted)]">
                  <MapPin className="h-3.5 w-3.5" />
                  {[team.venue, team.venueCity].filter(Boolean).join(", ")}
                </p>
              )}
            </div>
          </div>
          <FavoriteButton teamId={team.id} teamName={team.name} />
        </div>

        {/* Stat chips from the league standing — keeps the hero data-rich
            even when the crest is missing. */}
        {standing && (
          <div className="relative mt-6 flex flex-wrap items-center gap-2.5">
            <Link
              href={`/league/${standing.leagueId}`}
              className="chip chip-accent transition-colors hover:text-[var(--pitch-bright)]"
            >
              <Trophy className="h-3 w-3" />
              {standing.leagueName ? `${standing.leagueName} · ` : ""}
              <span className="nums font-bold">#{standing.rank}</span>
            </Link>
            <StatChip label="Pts" value={standing.points} accent />
            <StatChip label="Pld" value={standing.played} />
            <StatChip label="W" value={standing.won} />
            <StatChip label="D" value={standing.drawn} />
            <StatChip label="L" value={standing.lost} />
            <StatChip
              label="GF / GA"
              value={`${standing.goalsFor}/${standing.goalsAgainst}`}
            />
            <StatChip
              label="GD"
              value={standing.goalsDiff > 0 ? `+${standing.goalsDiff}` : standing.goalsDiff}
            />
            {standing.form && <FormChips form={standing.form} />}
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-8 lg:col-span-2">
          {/* Player to watch */}
          <section className="glass-card overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[#ffffff05] px-5 py-3">
              <SectionHeading title="Player to watch" icon={Star} accent className="!mb-0" />
            </div>
            {playerToWatch ? (
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                <div className="relative shrink-0">
                  {playerToWatch.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={playerToWatch.photo}
                      alt={playerToWatch.name}
                      className="h-20 w-20 rounded-2xl border border-[var(--border)] object-cover"
                    />
                  ) : (
                    <span className="grid h-20 w-20 place-items-center rounded-2xl border border-[var(--border)] bg-[var(--surface-hover)]">
                      <Users className="h-8 w-8 text-[var(--fg-dim)]" />
                    </span>
                  )}
                  <span className="absolute -right-1.5 -top-1.5 grid h-7 w-7 place-items-center rounded-full border border-[color-mix(in_oklab,var(--gold)_40%,transparent)] bg-[color-mix(in_oklab,var(--gold)_18%,transparent)] text-[var(--gold)]">
                    <Star className="h-3.5 w-3.5 fill-current" />
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-lg font-bold">{playerToWatch.name}</h3>
                  {playerToWatch.position && (
                    <p className="text-sm text-[var(--fg-muted)]">{playerToWatch.position}</p>
                  )}
                  <p className="mt-1.5 text-sm text-[var(--fg-muted)]">{playerToWatch.reason}</p>
                  <span className="chip chip-gold mt-2.5">
                    {playerToWatch.source === "override"
                      ? "Editorial pick"
                      : "Auto-picked from stats"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-5">
                <EmptyState
                  icon={Star}
                  title="No player data yet"
                  description="Once squad stats are synced, the top contributor is auto-highlighted here. Run the weekly squad sync to populate."
                />
              </div>
            )}
          </section>

          {/* Squad */}
          <section>
            <SectionHeading title="Squad" icon={Users} accent />
            {squad && squad.length > 0 ? (
              <div className="mt-4 space-y-6">
                {squad.map((group) => (
                  <div key={group.position}>
                    <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--fg-dim)]">
                      <span className="grid h-5 w-7 place-items-center rounded bg-[var(--accent-soft)] text-[10px] font-bold text-[var(--pitch-bright)]">
                        {group.position}
                      </span>
                      {group.label}
                      <span className="text-[var(--fg-dim)]">({group.players.length})</span>
                    </h4>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {group.players.map((p) => (
                        <div
                          key={p.id}
                          className="hover-lift flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[#0c100c80] px-3.5 py-2.5"
                        >
                          <span className="nums grid h-7 w-7 shrink-0 place-items-center rounded-md bg-[var(--surface-hover)] text-xs font-bold text-[var(--fg-muted)]">
                            {p.number ?? "–"}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{p.name}</p>
                            <p className="truncate text-xs text-[var(--fg-dim)]">{p.position}</p>
                          </div>
                          {(p.goals > 0 || p.assists > 0) && (
                            <div className="flex shrink-0 gap-2 text-[11px]">
                              {p.goals > 0 && (
                                <span className="inline-flex items-center gap-0.5 text-[var(--pitch-bright)]">
                                  <TrendingUp className="h-3 w-3" />
                                  {p.goals}G
                                </span>
                              )}
                              {p.assists > 0 && (
                                <span className="text-[var(--fg-muted)]">{p.assists}A</span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4">
                <EmptyState
                  icon={Users}
                  title="Squad not synced yet"
                  description="This team's roster hasn't been synced. Run the weekly squad sync (npm run sync -- --squads) to populate the squad."
                />
              </div>
            )}
          </section>
        </div>

        {/* Sidebar: fixtures. When there are no upcoming matches, lead with
            recent results and demote the empty "Next matches" block. */}
        <aside className="space-y-8">
          {hasUpcoming ? (
            <>
              <section>
                <SectionHeading title="Next matches" icon={CalendarDays} accent />
                <div className="mt-4">
                  <FixtureList fixtures={fixtures.upcoming} />
                </div>
              </section>

              <section>
                <SectionHeading title="Recent results" icon={Trophy} />
                <div className="mt-4">
                  <FixtureList
                    fixtures={fixtures.recent}
                    emptyTitle="No recent results"
                    emptyDescription="No completed matches for this team in the synced window."
                  />
                </div>
              </section>
            </>
          ) : (
            <>
              <section>
                <SectionHeading title="Recent results" icon={Trophy} accent />
                <div className="mt-4">
                  <FixtureList
                    fixtures={fixtures.recent}
                    emptyTitle="No recent results"
                    emptyDescription="No completed matches for this team in the synced window."
                  />
                </div>
              </section>

              <p className="flex items-center gap-2 rounded-xl border border-dashed border-[var(--border-subtle)] bg-[#0c100c80] px-4 py-3 text-xs text-[var(--fg-dim)]">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                No upcoming matches scheduled in the synced window.
              </p>
            </>
          )}

          {team.venue && (
            <div className="glass-card flex items-start gap-3 p-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[#0c100c80] text-[var(--fg-muted)]">
                <MapPin className="h-4.5 w-4.5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{team.venue}</p>
                {team.venueCity && (
                  <p className="text-xs text-[var(--fg-dim)]">{team.venueCity}</p>
                )}
                {team.capacity && (
                  <p className="nums mt-1 text-xs text-[var(--fg-dim)]">
                    Capacity {team.capacity.toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

/** A compact stat pill for the team hero (e.g. "12 Pts"). */
function StatChip({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[#0c100c80] px-2.5 py-1">
      <span
        className={
          "nums text-sm font-bold leading-none " +
          (accent ? "text-[var(--pitch-bright)]" : "text-[var(--fg)]")
        }
      >
        {value}
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--fg-dim)]">
        {label}
      </span>
    </span>
  );
}

const FORM_TINT: Record<string, string> = {
  W: "var(--pitch-bright)",
  D: "var(--gold)",
  L: "var(--live)",
};

/** Render a "WWDLW" form string as small coloured result dots (latest last). */
function FormChips({ form }: { form: string }) {
  const results = form.slice(-5).toUpperCase().split("");
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--fg-dim)]">
        Form
      </span>
      <span className="flex items-center gap-1">
        {results.map((r, i) => {
          const tint = FORM_TINT[r] ?? "var(--fg-dim)";
          return (
            <span
              key={i}
              className="grid h-5 w-5 place-items-center rounded text-[10px] font-bold leading-none"
              style={{
                color: tint,
                backgroundColor: `color-mix(in oklab, ${tint} 16%, transparent)`,
                border: `1px solid color-mix(in oklab, ${tint} 38%, transparent)`,
              }}
            >
              {r}
            </span>
          );
        })}
      </span>
    </span>
  );
}
