"use client";

import Link from "next/link";
import { Tv, MapPin } from "lucide-react";
import { TeamLogo } from "./team-logo";
import { StatusBadge } from "./status-badge";
import { Flag } from "./flag";
import { formatMatchTime } from "@/lib/utils";
import { isLiveStatus, isFinishedStatus, isAbnormalStatus } from "@/lib/fixture-status";

export interface FixtureCountry {
  name: string;
  code: string;
  flag?: string | null;
}

export interface FixtureRowData {
  id: number;
  date: string;
  statusShort: string;
  minute?: number | null;
  round?: string | null;
  homeTeam: { id: number; name: string; logo?: string | null };
  awayTeam: { id: number; name: string; logo?: string | null };
  goalsHome?: number | null;
  goalsAway?: number | null;
  venue?: string | null;
  leagueId?: number | null;
  leagueName?: string | null;
  leagueLogo?: string | null;
  country?: FixtureCountry | null;
  broadcaster?: string | null;
}

/**
 * Compact fixture row used across all fixture lists. Shows teams, score or
 * kick-off time, status, venue, and an optional broadcaster badge. Pass
 * `showLeague` when the row isn't already under a league header.
 */
export function FixtureRow({
  fixture,
  showLeague = false,
}: {
  fixture: FixtureRowData;
  showLeague?: boolean;
}) {
  const { time, date } = formatMatchTime(fixture.date);
  const live = isLiveStatus(fixture.statusShort);
  const finished = isFinishedStatus(fixture.statusShort);
  const abnormal = isAbnormalStatus(fixture.statusShort);
  const hasScore = live || finished;
  // Show the status chip for in-play, finished, AND abnormal (postponed /
  // cancelled / abandoned) matches — only genuinely upcoming fixtures show the
  // kick-off time. Without this, a postponed match rendered a bare kick-off
  // time with no indication it wouldn't be played.
  const showStatus = hasScore || abnormal;

  const homeWin = hasScore && (fixture.goalsHome ?? 0) > (fixture.goalsAway ?? 0);
  const awayWin = hasScore && (fixture.goalsAway ?? 0) > (fixture.goalsHome ?? 0);

  // Opaque, lightly status-tinted card so matches stay clearly legible even
  // over a full-page photo background (live = red, finished = green, upcoming =
  // neutral surface). A soft shadow lifts each row off busy backdrops.
  const stateClasses = live
    ? "bg-[color-mix(in_oklab,var(--live)_14%,var(--surface))] border-[color-mix(in_oklab,var(--live)_35%,transparent)] ring-1 ring-[color-mix(in_oklab,var(--live)_22%,transparent)]"
    : finished
      ? "bg-[color-mix(in_oklab,var(--accent)_9%,var(--surface))] border-[var(--border)]"
      : "bg-[var(--surface)] border-[var(--border-subtle)]";

  return (
    <div
      className={
        "hover-lift group relative overflow-hidden rounded-xl border px-3 py-2.5 pl-4 sm:px-4 sm:pl-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.65)] " +
        stateClasses
      }
    >
      {/* Left state rail */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px] rounded-r"
        style={{
          background: live
            ? "var(--live)"
            : finished
              ? "color-mix(in oklab, var(--accent) 55%, transparent)"
              : "var(--border-strong)",
        }}
      />

      {/* Stretched link covers the whole row without nesting the team links */}
      <Link
        href={`/match/${fixture.id}`}
        aria-label={`${fixture.homeTeam.name} vs ${fixture.awayTeam.name} — match details`}
        className="absolute inset-0 z-0 rounded-xl"
      />

      {showLeague && (fixture.leagueName || fixture.country) && (
        <div className="mb-2 flex items-center gap-1.5 text-[11px] text-[var(--fg-dim)]">
          {fixture.country && (
            <Flag
              code={fixture.country.code}
              flag={fixture.country.flag}
              name={fixture.country.name}
              size={13}
            />
          )}
          <span className="truncate font-medium">{fixture.leagueName}</span>
        </div>
      )}

      <div className="flex items-center gap-3">
        {/* Left: status / time */}
        <div className="flex w-14 shrink-0 flex-col items-center gap-1 text-center sm:w-16">
          {showStatus ? (
            <StatusBadge status={fixture.statusShort} minute={fixture.minute} />
          ) : (
            <>
              <span className="nums text-sm font-bold">{time}</span>
              <span className="text-[10px] uppercase tracking-wide text-[var(--fg-dim)]">
                {date.split(",")[0]}
              </span>
            </>
          )}
        </div>

        {/* Middle: teams */}
        <div className="min-w-0 flex-1">
          <TeamLine
            name={fixture.homeTeam.name}
            logo={fixture.homeTeam.logo}
            id={fixture.homeTeam.id}
            highlight={homeWin}
          />
          <TeamLine
            name={fixture.awayTeam.name}
            logo={fixture.awayTeam.logo}
            id={fixture.awayTeam.id}
            highlight={awayWin}
          />
        </div>

        {/* Score */}
        <div className="flex shrink-0 flex-col items-center gap-0.5 px-1 sm:px-2">
          <Score value={fixture.goalsHome} show={hasScore} highlight={homeWin} />
          <Score value={fixture.goalsAway} show={hasScore} highlight={awayWin} />
        </div>

        {/* Right: meta */}
        <div className="hidden w-24 shrink-0 flex-col items-end gap-1 text-right text-[11px] text-[var(--fg-dim)] lg:flex">
          {fixture.broadcaster && (
            <span className="inline-flex items-center gap-1 text-[var(--pitch-bright)]">
              <Tv className="h-3 w-3" />
              <span className="max-w-[88px] truncate">{fixture.broadcaster}</span>
            </span>
          )}
          {fixture.venue && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span className="max-w-[88px] truncate">{fixture.venue}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Score({
  value,
  show,
  highlight,
}: {
  value?: number | null;
  show: boolean;
  highlight: boolean;
}) {
  return (
    <span
      className={
        "nums grid h-7 w-7 place-items-center rounded-md text-base font-extrabold leading-none " +
        (show
          ? highlight
            ? "bg-[var(--accent-soft)] text-[var(--pitch-bright)]"
            : "bg-[#ffffff08] text-[var(--fg-muted)]"
          : "text-transparent")
      }
    >
      {value ?? 0}
    </span>
  );
}

function TeamLine({
  name,
  logo,
  id,
  highlight,
}: {
  name: string;
  logo?: string | null;
  id: number;
  highlight: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 py-0.5">
      <TeamLogo src={logo} name={name} size={22} />
      <Link
        href={`/team/${id}`}
        className={
          "relative z-10 truncate text-sm transition-colors hover:text-[var(--pitch-bright)] " +
          (highlight
            ? "font-bold text-[var(--fg)]"
            : "font-medium text-[var(--fg-muted)]")
        }
      >
        {name}
      </Link>
    </div>
  );
}
