import Link from "next/link";
import { notFound } from "next/navigation";
import {
  MapPin,
  Calendar,
  Tv,
  ChevronRight,
  Clock,
  UserCog,
  ExternalLink,
  Globe,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { PageBackground } from "@/components/layout/page-background";
import { TeamLogo } from "@/components/ui/team-logo";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Flag } from "@/components/ui/flag";
import { formatMatchTime } from "@/lib/utils";
import { BROADCASTER_SEED } from "@/lib/broadcasters/seed-data";

const LIVE = ["1H", "2H", "HT", "ET", "BT", "P", "LIVE"];
const FINISHED = ["FT", "AET", "PEN"];

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isFinite(matchId)) notFound();

  const match = await prisma.fixture.findUnique({
    where: { id: matchId },
    include: {
      homeTeam: { include: { country: true } },
      awayTeam: { include: { country: true } },
      league: { include: { country: true } },
    },
  });
  if (!match) notFound();

  const { date, time } = formatMatchTime(match.date.toISOString());
  const hasScore = match.goalsHome !== null && match.goalsAway !== null;
  const live = LIVE.includes(match.statusShort);
  const finished = FINISHED.includes(match.statusShort);
  const homeWin = hasScore && (match.goalsHome ?? 0) > (match.goalsAway ?? 0);
  const awayWin = hasScore && (match.goalsAway ?? 0) > (match.goalsHome ?? 0);

  return (
    <div className="relative mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <PageBackground theme="night" height="h-[380px]" />
      {/* Breadcrumb */}
      <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-xs text-[var(--fg-dim)]">
        <Link
          href={match.league ? `/league/${match.leagueId}` : "/fixtures"}
          className="transition-colors hover:text-[var(--pitch-bright)]"
        >
          {match.league?.name ?? "League"}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-[var(--fg-muted)]">
          {match.homeTeam.name} vs {match.awayTeam.name}
        </span>
      </nav>

      {/* Scoreboard */}
      <div className="panel pitch-markings relative overflow-hidden">
        <div className="pitch-stripes pointer-events-none absolute inset-0 opacity-40" />
        <div
          className={
            "pointer-events-none absolute inset-x-0 top-0 h-40 " +
            (live
              ? "bg-[radial-gradient(60%_100%_at_50%_0%,color-mix(in_oklab,var(--live)_18%,transparent),transparent_70%)]"
              : "bg-[radial-gradient(60%_100%_at_50%_0%,var(--accent-soft),transparent_70%)]")
          }
        />

        <div className="relative flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-3">
          <Link
            href={`/league/${match.leagueId}`}
            className="flex items-center gap-2 text-sm transition-colors hover:text-[var(--pitch-bright)]"
          >
            {match.league?.logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={match.league.logo} alt="" className="h-5 w-5 object-contain" />
            )}
            <span className="font-semibold">{match.league?.name}</span>
            {match.league?.country && (
              <Flag
                code={match.league.country.code}
                flag={match.league.country.flag}
                name={match.league.country.name}
                size={14}
              />
            )}
          </Link>
          <StatusBadge status={match.statusShort} minute={match.minute} />
        </div>

        <div className="relative grid grid-cols-3 items-center gap-4 px-6 py-10 sm:px-10">
          {/* Home team */}
          <Link
            href={`/team/${match.homeTeamId}`}
            className="group flex flex-col items-center gap-3 text-center"
          >
            <TeamLogo src={match.homeTeam.logo} name={match.homeTeam.name} size={76} />
            <span
              className={
                "text-sm font-bold transition-colors group-hover:text-[var(--pitch-bright)] sm:text-base " +
                (awayWin ? "text-[var(--fg-muted)]" : "")
              }
            >
              {match.homeTeam.name}
            </span>
          </Link>

          {/* Score / time */}
          <div className="flex flex-col items-center">
            {hasScore ? (
              <div className="nums flex items-center gap-3 font-display text-5xl font-extrabold sm:text-6xl">
                <span className={homeWin ? "text-[var(--pitch-bright)]" : "text-[var(--fg)]"}>
                  {match.goalsHome}
                </span>
                <span className="text-2xl text-[var(--fg-dim)] sm:text-3xl">–</span>
                <span className={awayWin ? "text-[var(--pitch-bright)]" : "text-[var(--fg)]"}>
                  {match.goalsAway}
                </span>
              </div>
            ) : (
              <div className="text-center">
                <div className="nums font-display text-4xl font-bold sm:text-5xl">{time}</div>
                <div className="mt-1.5 text-xs uppercase tracking-wider text-[var(--fg-dim)]">
                  Kick-off
                </div>
              </div>
            )}
            {match.round && <span className="chip mt-4">{match.round}</span>}
          </div>

          {/* Away team */}
          <Link
            href={`/team/${match.awayTeamId}`}
            className="group flex flex-col items-center gap-3 text-center"
          >
            <TeamLogo src={match.awayTeam.logo} name={match.awayTeam.name} size={76} />
            <span
              className={
                "text-sm font-bold transition-colors group-hover:text-[var(--pitch-bright)] sm:text-base " +
                (homeWin ? "text-[var(--fg-muted)]" : "")
              }
            >
              {match.awayTeam.name}
            </span>
          </Link>
        </div>

        {/* Half-time score line */}
        {hasScore && match.htHome !== null && match.htAway !== null && (
          <div className="relative border-t border-[var(--border-subtle)] px-5 py-2.5 text-center text-xs text-[var(--fg-dim)]">
            Half time: {match.htHome} – {match.htAway}
            {finished && match.penHome !== null && match.penAway !== null && (
              <> · Penalties: {match.penHome} – {match.penAway}</>
            )}
          </div>
        )}
      </div>

      {/* Match facts */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Fact icon={Calendar} label="Date" value={`${date}`} />
        <Fact icon={Clock} label="Kick-off" value={time} />
        <Fact icon={MapPin} label="Venue" value={match.venue ?? "TBD"} sub={match.venueCity ?? undefined} />
        <Fact icon={UserCog} label="Referee" value={match.referee ?? "TBD"} />
      </div>

      {/* Where to watch */}
      <section className="mt-10">
        <PageHeader eyebrow="Broadcast" title="Where to watch" icon={Tv} accent />
        <div className="mt-4">
          <BroadcasterGrid leagueId={match.leagueId} />
        </div>
      </section>

      {/* Teams quick links */}
      <section className="mt-8 grid gap-3 sm:grid-cols-2">
        <TeamCard
          id={match.homeTeamId}
          name={match.homeTeam.name}
          logo={match.homeTeam.logo}
          country={match.homeTeam.country?.name}
          venue={match.homeTeam.venue ?? undefined}
        />
        <TeamCard
          id={match.awayTeamId}
          name={match.awayTeam.name}
          logo={match.awayTeam.logo}
          country={match.awayTeam.country?.name}
          venue={match.awayTeam.venue ?? undefined}
        />
      </section>
    </div>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="glass-card flex items-start gap-3 p-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[#0c100c80] text-[var(--fg-muted)]">
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--fg-dim)]">
          {label}
        </p>
        <p className="truncate text-sm font-semibold">{value}</p>
        {sub && <p className="truncate text-xs text-[var(--fg-dim)]">{sub}</p>}
      </div>
    </div>
  );
}

/**
 * Renders the broadcaster grid for a match's competition. Reads from the DB
 * if populated, otherwise falls back to the curated seed data so the section
 * always shows something useful.
 */
async function BroadcasterGrid({ leagueId }: { leagueId: number }) {
  // Try DB first.
  let entries: Array<{
    countryCode: string;
    broadcaster: string;
    streamUrl: string | null;
    platform: string | null;
  }> = [];
  try {
    const rows = await prisma.broadcaster.findMany({
      where: { leagueId },
      orderBy: [{ countryCode: "asc" }, { broadcaster: "asc" }],
    });
    entries = rows.map((r) => ({
      countryCode: r.countryCode,
      broadcaster: r.broadcaster,
      streamUrl: r.streamUrl,
      platform: r.platform,
    }));
  } catch {
    entries = [];
  }

  // Fallback to seed.
  if (entries.length === 0) {
    entries = BROADCASTER_SEED.filter((s) => s.leagueId === leagueId).map((s) => ({
      countryCode: s.countryCode,
      broadcaster: s.broadcaster,
      streamUrl: s.streamUrl ?? null,
      platform: s.platform ?? null,
    }));
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={Tv}
        title="No broadcaster info for this competition"
        description="Broadcast data isn't available for this competition yet. Check official league sources or your local TV listings."
      />
    );
  }

  // Group by country.
  const byCountry = new Map<string, typeof entries>();
  for (const e of entries) {
    if (!byCountry.has(e.countryCode)) byCountry.set(e.countryCode, []);
    byCountry.get(e.countryCode)!.push(e);
  }

  return (
    <>
      <div className="mb-3 flex items-center gap-2 text-xs text-[var(--fg-dim)]">
        <Globe className="h-3.5 w-3.5" />
        Per-region official broadcasters for this competition
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[...byCountry.entries()].map(([countryCode, items]) => (
          <div key={countryCode} className="glass-card p-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--pitch-bright)]">
              <Flag code={countryCode} name={countryCode} size={14} />
              {countryCode.toUpperCase()}
            </p>
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.broadcaster} className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Tv className="h-3.5 w-3.5 shrink-0 text-[var(--fg-muted)]" />
                    <span className="truncate text-sm font-medium">{item.broadcaster}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {item.platform && <span className="chip">{item.platform}</span>}
                    {item.streamUrl && (
                      <a
                        href={item.streamUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--fg-dim)] transition-colors hover:text-[var(--pitch-bright)]"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function TeamCard({
  id,
  name,
  logo,
  country,
  venue,
}: {
  id: number;
  name: string;
  logo: string | null;
  country?: string;
  venue?: string;
}) {
  return (
    <Link href={`/team/${id}`} className="glass-card group flex items-center gap-3 p-4">
      <TeamLogo src={logo} name={name} size={44} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold transition-colors group-hover:text-[var(--pitch-bright)]">
          {name}
        </p>
        <p className="truncate text-xs text-[var(--fg-dim)]">
          {[country, venue].filter(Boolean).join(" · ")}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 text-[var(--fg-dim)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--accent)]" />
    </Link>
  );
}
