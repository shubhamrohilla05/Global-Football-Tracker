import Link from "next/link";
import { Radio } from "lucide-react";
import { hasDbConfig } from "@/lib/env";
import { getFixturesForDay, getLiveFixtures } from "@/lib/data/fixtures";
import { isLiveStatus, isFinishedStatus } from "@/lib/fixture-status";
import type { FixtureRowData } from "@/components/ui/fixture-row";
import { TickerStrip, type TickerItem } from "./ticker-strip";

function toTicker(f: FixtureRowData): TickerItem {
  const live = isLiveStatus(f.statusShort);
  const finished = isFinishedStatus(f.statusShort);
  const time = new Date(f.date).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return {
    id: f.id,
    home: f.homeTeam.name,
    away: f.awayTeam.name,
    homeLogo: f.homeTeam.logo ?? null,
    awayLogo: f.awayTeam.logo ?? null,
    leagueLogo: f.leagueLogo ?? null,
    score: live || finished ? `${f.goalsHome ?? 0}–${f.goalsAway ?? 0}` : null,
    status: live ? (f.minute ? `${f.minute}'` : "LIVE") : finished ? "FT" : time,
    live,
  };
}

// Editorial preview so the ticker never looks empty before data is synced.
const PREVIEW: TickerItem[] = [
  { id: -1, home: "Real Madrid", away: "Bayern", homeLogo: null, awayLogo: null, leagueLogo: null, score: null, status: "20:00", live: false },
  { id: -2, home: "Man City", away: "Arsenal", homeLogo: null, awayLogo: null, leagueLogo: null, score: "2–1", status: "67'", live: true },
  { id: -3, home: "Barcelona", away: "Atlético", homeLogo: null, awayLogo: null, leagueLogo: null, score: "3–0", status: "FT", live: false },
  { id: -4, home: "Inter", away: "Juventus", homeLogo: null, awayLogo: null, leagueLogo: null, score: "1–1", status: "78'", live: true },
  { id: -5, home: "PSG", away: "Marseille", homeLogo: null, awayLogo: null, leagueLogo: null, score: null, status: "21:00", live: false },
  { id: -6, home: "Liverpool", away: "Chelsea", homeLogo: null, awayLogo: null, leagueLogo: null, score: "2–2", status: "FT", live: false },
];

/** Broadcast-style scrolling score ticker, shown globally under the navbar. */
export async function ScoreTicker() {
  let items: TickerItem[] = [];

  if (hasDbConfig()) {
    try {
      const [live, today] = await Promise.all([
        getLiveFixtures(),
        getFixturesForDay(new Date()),
      ]);
      // Live first, then the rest of today's slate (de-duplicated).
      const seen = new Set<number>();
      const ordered = [...live, ...today].filter((f) => {
        if (seen.has(f.id)) return false;
        seen.add(f.id);
        return true;
      });
      items = ordered.slice(0, 24).map(toTicker);
    } catch {
      items = [];
    }
  }

  const isPreview = items.length === 0;
  if (isPreview) items = PREVIEW;
  const liveCount = items.filter((i) => i.live).length;

  return (
    <div className="sticky top-[66px] z-40 border-b border-[var(--border-subtle)] bg-[#0a0d0ae6] backdrop-blur-xl">
      <div className="flex items-stretch">
        {/* Leading label */}
        <Link
          href="/fixtures"
          className="flex shrink-0 items-center gap-2 border-r border-[var(--border-subtle)] bg-[var(--accent-soft)] px-3 sm:px-4"
        >
          {liveCount > 0 ? (
            <>
              <span className="live-dot" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--live)]">
                {liveCount} Live
              </span>
            </>
          ) : (
            <>
              <Radio className="h-3.5 w-3.5 text-[var(--pitch-bright)]" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--pitch-bright)]">
                Scores
              </span>
            </>
          )}
        </Link>

        {/* Scrolling strip */}
        <TickerStrip items={items} />
      </div>
    </div>
  );
}
