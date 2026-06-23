import Link from "next/link";
import {
  Globe2,
  Trophy,
  Users,
  Tv,
  CalendarDays,
  ArrowRight,
  Shield,
  Star,
  Zap,
  ChevronRight,
  Radio,
  Goal,
  Sparkles,
} from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { REGION_LABELS, REGION_ORDER } from "@/lib/api-football/country-region";
import { hasApiConfig, hasDbConfig } from "@/lib/env";
import { LeagueFixtureGroups } from "@/components/ui/league-fixture-groups";
import { FixtureRow, type FixtureRowData } from "@/components/ui/fixture-row";
import { getFixturesForDay, getLiveFixtures, getHomeStats } from "@/lib/data/fixtures";

// Render per-request so every refresh re-settles fixtures and shows live data.
export const dynamic = "force-dynamic";

const FEATURES = [
  {
    icon: Globe2,
    title: "Global coverage",
    desc: "Every domestic league, organized by country and region — from the Premier League to the Saudi Pro League.",
  },
  {
    icon: Trophy,
    title: "International hub",
    desc: "World Cup, Euros, Nations League, Copa América, AFCON, Asian Cup, qualifiers and friendlies in one section.",
  },
  {
    icon: Users,
    title: "Squads & players",
    desc: "Full team rosters, positions, and a highlighted Player to Watch for every club — auto-picked from stats.",
  },
  {
    icon: Tv,
    title: "Where to watch",
    desc: "Per-region official broadcaster badges so you know exactly where the match is showing in your country.",
  },
];

const REGIONS = REGION_ORDER.map((r) => ({ code: r, label: REGION_LABELS[r] }));

export default async function Home() {
  const configured = hasApiConfig() && hasDbConfig();

  // Fetch live data only when the DB is connected. Wrap in try/catch so the
  // page renders gracefully (with empty sections) if the DB isn't reachable.
  let live: FixtureRowData[] = [];
  let today: FixtureRowData[] = [];
  let stats: Awaited<ReturnType<typeof getHomeStats>> | null = null;
  if (configured) {
    try {
      [live, today, stats] = await Promise.all([
        getLiveFixtures(),
        getFixturesForDay(new Date()),
        getHomeStats(),
      ]);
    } catch {
      live = [];
      today = [];
      stats = null;
    }
  }

  const heroMatches = (live.length > 0 ? live : today).slice(0, 3);

  return (
    <div>
      {/* ============================ HERO ============================ */}
      <section className="relative overflow-hidden border-b border-[var(--border-subtle)]">
        {/* Stadium-at-dusk backdrop, tinted into the sunset palette */}
        <div className="pointer-events-none absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/stadium-dusk.jpg"
            alt=""
            aria-hidden
            className="h-full w-full object-cover object-center opacity-40"
          />
          {/* Readability + palette wash: solid on the left where the copy sits,
              revealing more of the photo on the right; fade top & bottom. */}
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg)] via-[color-mix(in_oklab,var(--bg)_82%,transparent)] to-[color-mix(in_oklab,var(--bg)_30%,transparent)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-transparent to-[color-mix(in_oklab,var(--bg)_55%,transparent)]" />
          <div className="absolute inset-0 mix-blend-soft-light bg-[radial-gradient(800px_400px_at_75%_20%,var(--accent),transparent_60%)] opacity-50" />
        </div>
        {/* Floodlights */}
        <div className="pointer-events-none absolute -top-40 left-[10%] h-96 w-96 rounded-full bg-[var(--accent)] opacity-[0.16] blur-[150px]" />
        <div className="pointer-events-none absolute -top-24 right-[4%] h-80 w-80 rounded-full bg-[var(--live)] opacity-[0.12] blur-[140px]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[var(--bg)] to-transparent" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Left copy */}
          <div className="max-w-2xl">
            <span className="chip chip-accent rise-in">
              <Sparkles className="h-3.5 w-3.5" />
              {stats
                ? `${stats.leagues} leagues · ${stats.teams.toLocaleString()} teams tracked`
                : "1,200+ leagues tracked worldwide"}
            </span>
            <h1 className="mt-6 text-balance font-display text-[2.9rem] font-extrabold leading-[0.98] tracking-tight sm:text-[4.4rem]">
              <span className="block text-gradient">Every football</span>
              <span className="block">
                match, <span className="text-[var(--accent)]">one</span> pitch.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-[var(--fg-muted)] sm:text-lg">
              PitchPulse tracks all global football activity — every domestic
              league grouped by country and region, plus a dedicated
              international hub. Fixtures, squads, players to watch, and where to
              tune in.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/fixtures" className="btn-primary">
                <CalendarDays className="h-4.5 w-4.5" />
                Browse fixtures
              </Link>
              <Link href="/international" className="btn-ghost">
                <Trophy className="h-4.5 w-4.5" />
                International
              </Link>
            </div>

            {/* Live stat strip */}
            <div className="mt-10 grid grid-cols-3 gap-3 sm:max-w-lg">
              <Stat value={stats ? String(stats.totalToday) : "—"} label="Today" icon={CalendarDays} />
              <Stat value={stats ? String(stats.live) : "—"} label="Live now" icon={Radio} live />
              <Stat value={stats ? `${stats.leagues}` : "1,200+"} label="Leagues" icon={Shield} />
            </div>
          </div>

          {/* Right: featured match card */}
          <div className="relative rise-in" style={{ animationDelay: "120ms" }}>
            <div className="panel relative overflow-hidden p-5 sm:p-6">
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[var(--accent)] opacity-[0.12] blur-[70px]" />
              <div className="relative flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--fg-dim)]">
                  <Goal className="h-4 w-4 text-[var(--accent)]" />
                  {live.length > 0 ? "Live right now" : "Today's slate"}
                </span>
                {live.length > 0 ? (
                  <span className="chip chip-live">
                    <span className="live-dot" />
                    {live.length} live
                  </span>
                ) : (
                  <span className="chip chip-accent">Matchday</span>
                )}
              </div>

              <div className="relative mt-4 space-y-2.5">
                {heroMatches.map((f) => (
                  <FixtureRow key={f.id} fixture={f} showLeague />
                ))}
                {heroMatches.length === 0 && (
                  <>
                    <PreviewFixture league="UEFA Champions League" home="Real Madrid" away="Bayern München" status="20:00" />
                    <PreviewFixture league="Premier League" home="Man City" away="Arsenal" status="67'" live score="2-1" />
                    <PreviewFixture league="La Liga" home="Barcelona" away="Atlético" status="Full time" score="3-0" />
                  </>
                )}
              </div>

              <Link
                href="/fixtures"
                className="relative mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--pitch-bright)] transition-colors hover:text-[var(--accent)]"
              >
                See all of today&apos;s fixtures
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">

      {!configured && <SetupNotice hasApi={hasApiConfig()} hasDb={hasDbConfig()} />}

      {/* ====================== LIVE STRIP ====================== */}
      {configured && live.length > 0 && (
        <section className="mt-14">
          <SectionHeading title="Live now" icon={Radio} accent href="/fixtures" hrefLabel="All live" />
          <div className="mt-5 grid gap-2 lg:grid-cols-2">
            {live.slice(0, 6).map((f) => (
              <FixtureRow key={f.id} fixture={f} showLeague />
            ))}
          </div>
        </section>
      )}

      {/* ====================== TODAY'S FIXTURES ====================== */}
      {configured && (
        <section className="mt-14">
          <SectionHeading
            title="Today's fixtures"
            icon={CalendarDays}
            href="/fixtures"
            hrefLabel="All fixtures"
            accent
          />
          <div className="mt-5">
            <LeagueFixtureGroups
              fixtures={today}
              emptyTitle="No fixtures today"
              emptyDescription="There are no matches scheduled today across the synced leagues. Check back tomorrow, or browse by region."
            />
          </div>
        </section>
      )}

      {/* ====================== FEATURE GRID ====================== */}
      <section className="mt-16">
        <SectionHeading title="Everything you need to follow the game" icon={Star} accent />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="glass-card rise-in p-5"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <span className="grid h-12 w-12 place-items-center rounded-xl border border-[color-mix(in_oklab,var(--accent)_30%,transparent)] bg-[var(--accent-soft)] text-[var(--pitch-bright)]">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-display text-base font-bold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--fg-muted)]">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ====================== REGION EXPLORER ====================== */}
      <section className="mt-16">
        <SectionHeading title="Explore by region" icon={Globe2} href="/fixtures" hrefLabel="All regions" />
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {REGIONS.map((r, i) => (
            <Link
              key={r.code}
              href={`/region/${r.code.toLowerCase().replace("_", "-")}`}
              className="group glass-card rise-in flex items-center justify-between p-4"
              style={{ animationDelay: `${i * 45}ms` }}
            >
              <div>
                <p className="text-sm font-semibold transition-colors group-hover:text-[var(--pitch-bright)]">
                  {r.label}
                </p>
                <p className="mt-0.5 text-xs text-[var(--fg-dim)]">Domestic leagues & cups</p>
              </div>
              <ChevronRight className="h-4 w-4 text-[var(--fg-dim)] transition-all group-hover:translate-x-1 group-hover:text-[var(--accent)]" />
            </Link>
          ))}
        </div>
      </section>

      {/* ====================== HOW IT WORKS ====================== */}
      <section className="mt-16">
        <div className="panel overflow-hidden">
          <div className="grid gap-0 lg:grid-cols-2">
            <div className="p-7 sm:p-10">
              <span className="chip">
                <Zap className="h-3.5 w-3.5 text-[var(--accent)]" />
                How PitchPulse works
              </span>
              <h2 className="mt-4 font-display text-2xl font-bold tracking-tight sm:text-3xl">
                Budget-smart sync, instant page loads
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[var(--fg-muted)]">
                Football data is pulled from API-Football into a database via
                scheduled sync jobs — so the app never burns your API quota on
                page loads. Start free, scale to full global coverage on a paid
                key with zero code changes.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Major leagues & internationals synced daily (deep)",
                  "Squads refreshed weekly; near-live polling optional",
                  "Curated per-region broadcaster map",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--pitch-bright)]">
                      <ArrowRight className="h-3 w-3" strokeWidth={3} />
                    </span>
                    <span className="text-[var(--fg-muted)]">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="pitch-stripes relative border-t border-[var(--border-subtle)] bg-[#0a0d0a80] p-7 sm:p-10 lg:border-l lg:border-t-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-dim)]">
                Today at a glance
              </p>
              <div className="mt-4 space-y-2.5">
                {today.slice(0, 3).map((f) => (
                  <FixtureRow key={f.id} fixture={f} showLeague />
                ))}
                {today.length === 0 && (
                  <>
                    <PreviewFixture league="UEFA Champions League" home="Real Madrid" away="Bayern München" status="20:00" />
                    <PreviewFixture league="Premier League" home="Man City" away="Arsenal" status="67'" live score="2-1" />
                    <PreviewFixture league="La Liga" home="Barcelona" away="Atlético" status="Full time" score="3-0" />
                  </>
                )}
              </div>
              <Link
                href="/fixtures"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--pitch-bright)] transition-colors hover:text-[var(--accent)]"
              >
                See all of today&apos;s fixtures
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
      </div>
    </div>
  );
}

function Stat({
  value,
  label,
  icon: Icon,
  live = false,
}: {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  live?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[#0c100c99] px-3 py-3.5 text-center backdrop-blur-sm">
      <Icon className={"mx-auto mb-1.5 h-4 w-4 " + (live ? "text-[var(--live)]" : "text-[var(--accent)]")} />
      <div className="nums font-display text-xl font-extrabold tracking-tight">{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-[var(--fg-dim)]">{label}</div>
    </div>
  );
}

function PreviewFixture({
  league,
  home,
  away,
  status,
  score,
  live,
}: {
  league: string;
  home: string;
  away: string;
  status: string;
  score?: string;
  live?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[#0c100c99] px-3.5 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] text-[var(--fg-dim)]">{league}</p>
        <p className="truncate text-sm font-semibold">{home}</p>
        <p className="truncate text-sm font-medium text-[var(--fg-muted)]">{away}</p>
      </div>
      <div className="shrink-0 text-right">
        {score && <p className="nums text-base font-bold">{score}</p>}
        <span className={"chip " + (live ? "chip-live" : "")}>
          {live && <span className="live-dot" />}
          {status}
        </span>
      </div>
    </div>
  );
}

function SetupNotice({ hasApi, hasDb }: { hasApi: boolean; hasDb: boolean }) {
  return (
    <div className="mt-12 rounded-2xl border border-[color-mix(in_oklab,var(--gold)_35%,transparent)] bg-[color-mix(in_oklab,var(--gold)_8%,transparent)] p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--gold)_18%,transparent)] text-[var(--gold)]">
          <Zap className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">Finish setup to load live data</h3>
          <p className="mt-1 text-sm text-[var(--fg-muted)]">
            The UI is ready. Connect a database and API key to sync fixtures,
            then run{" "}
            <code className="rounded bg-[#0c100c] px-1.5 py-0.5 text-[var(--pitch-bright)]">npm run sync</code>.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className={"chip " + (hasApi ? "chip-accent" : "chip-gold")}>
              {hasApi ? "✓ API key set" : "API_FOOTBALL_KEY needed"}
            </span>
            <span className={"chip " + (hasDb ? "chip-accent" : "chip-gold")}>
              {hasDb ? "✓ Database set" : "DATABASE_URL needed"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
