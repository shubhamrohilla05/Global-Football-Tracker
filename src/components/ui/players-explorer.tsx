"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlayerCard } from "./player-card";
import { POSITION_GROUPS, type PlayerCardData } from "@/lib/data/players";

function pillCls(active: boolean) {
  return cn(
    "rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
    active
      ? "bg-[var(--accent)] text-[var(--on-accent)] shadow-[0_0_0_1px_var(--accent),0_4px_14px_-4px_var(--accent)] ring-1 ring-[var(--accent)]"
      : "border border-[var(--border-strong)] text-[var(--fg-muted)] hover:border-[color-mix(in_oklab,var(--accent)_45%,transparent)] hover:text-[var(--fg)]",
  );
}

function Heading({ eyebrow, title, count }: { eyebrow: string; title: string; count: number }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
        {eyebrow}
      </p>
      <div className="mt-1 flex items-center gap-2.5">
        <h2 className="font-display text-2xl font-extrabold tracking-tight">{title}</h2>
        <span className="nums rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-sm font-bold text-[var(--pitch-bright)]">
          {count.toLocaleString()}
        </span>
      </div>
      <div className="rule-fade mt-4" />
    </div>
  );
}

function Grid({ players }: { players: PlayerCardData[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {players.map((p) => (
        <PlayerCard key={p.id} player={p} />
      ))}
    </div>
  );
}

const ALL = "All";

export function PlayersExplorer({ players }: { players: PlayerCardData[] }) {
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<string>(ALL);
  const [club, setClub] = useState<string>(ALL);

  const q = query.trim().toLowerCase();

  // Clubs that actually appear, alphabetised.
  const clubs = useMemo(() => {
    const set = new Set<string>();
    for (const p of players) if (p.club) set.add(p.club);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [players]);

  // Counts per position group for the filter labels.
  const posCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of players) if (p.position) m[p.position] = (m[p.position] ?? 0) + 1;
    return m;
  }, [players]);

  const results = useMemo(() => {
    return players
      .filter((p) => position === ALL || p.position === position)
      .filter((p) => club === ALL || p.club === club)
      .filter(
        (p) =>
          !q ||
          [p.name, p.club, p.nationality].some((v) => v?.toLowerCase().includes(q)),
      );
  }, [players, position, club, q]);

  const filtered = q !== "" || position !== ALL || club !== ALL;

  return (
    <div>
      {/* Search */}
      <div className="mt-8">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--fg-dim)]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search players, clubs, nationalities…"
            className="w-full rounded-full border border-[var(--border)] bg-[var(--surface)] py-2.5 pl-11 pr-4 text-sm text-[var(--fg)] outline-none transition-colors placeholder:text-[var(--fg-dim)] focus:border-[color-mix(in_oklab,var(--accent)_55%,transparent)]"
          />
        </label>
      </div>

      {/* Position filter */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-[var(--fg-dim)]">
          Position
        </span>
        <button type="button" onClick={() => setPosition(ALL)} className={pillCls(position === ALL)}>
          All
        </button>
        {POSITION_GROUPS.map((g) => (
          <button
            key={g.code}
            type="button"
            onClick={() => setPosition(g.code)}
            className={pillCls(position === g.code)}
          >
            {g.label}
            {posCounts[g.code] != null && (
              <span className="nums ml-1.5 opacity-60">{posCounts[g.code]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Club filter */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-[var(--fg-dim)]">
          Club
        </span>
        <div className="relative">
          <select
            value={club}
            onChange={(e) => setClub(e.target.value)}
            className="appearance-none rounded-full border border-[var(--border-strong)] bg-[var(--surface)] py-1.5 pl-3.5 pr-9 text-sm font-semibold text-[var(--fg)] outline-none transition-colors hover:border-[color-mix(in_oklab,var(--accent)_45%,transparent)] focus:border-[color-mix(in_oklab,var(--accent)_55%,transparent)]"
          >
            <option value={ALL}>All clubs ({clubs.length})</option>
            {clubs.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <svg
            aria-hidden
            viewBox="0 0 12 12"
            className="pointer-events-none absolute right-3.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-[var(--fg-dim)]"
          >
            <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        {filtered && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setPosition(ALL);
              setClub(ALL);
            }}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold text-[var(--fg-dim)] transition-colors hover:text-[var(--pitch-bright)]"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Results */}
      <section className="mt-9">
        <Heading
          count={results.length}
          eyebrow={`${results.length.toLocaleString()} ${results.length === 1 ? "player" : "players"}`}
          title={
            club !== ALL
              ? club
              : position !== ALL
                ? POSITION_GROUPS.find((g) => g.code === position)?.label ?? "Players"
                : filtered
                  ? "Search results"
                  : "All players"
          }
        />
        {results.length > 0 ? (
          <Grid players={results} />
        ) : (
          <p className="rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-5 py-10 text-center text-sm text-[var(--fg-muted)]">
            No players match your filters.
          </p>
        )}
      </section>
    </div>
  );
}
