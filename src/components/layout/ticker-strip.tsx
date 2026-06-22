"use client";

import Link from "next/link";
import { TeamLogo } from "@/components/ui/team-logo";

export interface TickerItem {
  id: number;
  home: string;
  away: string;
  homeLogo: string | null;
  awayLogo: string | null;
  leagueLogo: string | null;
  score: string | null;
  status: string;
  live: boolean;
}

/** The scrolling half of the score ticker (client — needs the marquee). */
export function TickerStrip({ items }: { items: TickerItem[] }) {
  if (items.length === 0) return <div className="h-9" />;
  // Duplicate the list so the -50% marquee loops seamlessly.
  const loop = [...items, ...items];

  return (
    <div className="marquee min-w-0 flex-1">
      <div className="marquee-track">
        {loop.map((m, i) => (
          <TickerCell key={`${m.id}-${i}`} item={m} />
        ))}
      </div>
    </div>
  );
}

function TickerCell({ item }: { item: TickerItem }) {
  const href = item.id > 0 ? `/match/${item.id}` : "/fixtures";
  return (
    <Link
      href={href}
      className="group flex shrink-0 items-center gap-2.5 border-r border-[var(--border-subtle)] px-5 py-2 text-xs"
    >
      {item.live && (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[var(--live)]">
          <span className="live-dot" />
          Live
        </span>
      )}
      <span className="flex items-center gap-1.5">
        {item.homeLogo && <TeamLogo src={item.homeLogo} name={item.home} size={15} />}
        <span className="font-semibold text-[var(--fg)] transition-colors group-hover:text-[var(--pitch-bright)]">
          {item.home}
        </span>
      </span>
      <span
        className={
          "nums rounded px-1.5 py-0.5 font-bold " +
          (item.score
            ? item.live
              ? "bg-[color-mix(in_oklab,var(--live)_22%,transparent)] text-[var(--live)]"
              : "bg-[#ffffff14] text-[var(--fg)]"
            : "text-[var(--pitch-bright)]")
        }
      >
        {item.score ?? item.status}
      </span>
      <span className="flex items-center gap-1.5">
        {item.awayLogo && <TeamLogo src={item.awayLogo} name={item.away} size={15} />}
        <span className="font-semibold text-[var(--fg)] transition-colors group-hover:text-[var(--pitch-bright)]">
          {item.away}
        </span>
      </span>
      {item.score && (
        <span
          className={
            "ml-0.5 text-[10px] font-bold uppercase " +
            (item.live ? "text-[var(--live)]" : "text-[var(--fg-muted)]")
          }
        >
          {item.status}
        </span>
      )}
    </Link>
  );
}
