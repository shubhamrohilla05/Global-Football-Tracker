import Link from "next/link";
import { Shirt } from "lucide-react";
import { flagForNationality } from "./flag";
import type { PlayerCardData } from "@/lib/data/players";

/** Two-letter monogram from a player's name (e.g. "Lamine Yamal" → "LY"). */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Tint a position group with a palette colour. */
const POS_TINT: Record<string, string> = {
  GK: "var(--gold)",
  DF: "var(--info)",
  MF: "var(--accent)",
  FW: "var(--live)",
};

/**
 * Compact player tile. A small monogram (or photo) avatar on the left, the
 * player's name as the hero, a club · nationality (+flag) line beneath, with a
 * position chip and a de-emphasised, clearly-labelled jersey number on the
 * right. No full-height photo well is reserved when `photo` is null. Links to
 * the player's club when known.
 */
export function PlayerCard({ player }: { player: PlayerCardData }) {
  const pos = player.position;
  const tint = (pos && POS_TINT[pos]) || "var(--accent)";
  const flag = flagForNationality(player.nationality);

  const inner = (
    <>
      {/* Avatar: photo when present, otherwise a tinted monogram chip. */}
      <span
        aria-hidden
        className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl font-display text-base font-extrabold leading-none"
        style={{
          color: tint,
          backgroundColor: `color-mix(in oklab, ${tint} 14%, var(--surface))`,
          border: `1px solid color-mix(in oklab, ${tint} 35%, transparent)`,
        }}
      >
        {player.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={player.photo}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-top"
          />
        ) : (
          initials(player.name)
        )}
      </span>

      {/* Identity: name is the visual hero, then club · nationality. */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {pos && (
            <span
              className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              style={{
                color: tint,
                backgroundColor: `color-mix(in oklab, ${tint} 12%, transparent)`,
                border: `1px solid color-mix(in oklab, ${tint} 40%, transparent)`,
              }}
            >
              {pos}
            </span>
          )}
          {player.rating != null && (
            <span className="nums shrink-0 rounded bg-[var(--gold-soft)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--gold)]">
              {player.rating.toFixed(1)}
            </span>
          )}
        </div>
        <h3 className="mt-1 truncate font-display text-[15px] font-bold leading-tight transition-colors group-hover:text-[var(--pitch-bright)]">
          {player.name}
        </h3>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--fg-muted)]">
          {flag && (
            <span className="leading-none" style={{ fontSize: 13 }} aria-hidden>
              {flag}
            </span>
          )}
          <span className="truncate">
            {[player.club, player.nationality].filter(Boolean).join(" · ")}
          </span>
        </div>
      </div>

      {/* De-emphasised, clearly-labelled jersey number. */}
      {player.number != null && (
        <span
          aria-label={`Jersey number ${player.number}`}
          className="nums inline-flex shrink-0 items-center gap-0.5 self-start text-xs font-bold text-[var(--fg-dim)] transition-colors group-hover:text-[var(--fg-muted)]"
        >
          <Shirt className="h-3 w-3" />
          {player.number}
        </span>
      )}
    </>
  );

  const className =
    "group glass-card relative flex items-center gap-3 overflow-hidden p-3";

  if (player.teamId) {
    return (
      <Link href={`/team/${player.teamId}`} className={className}>
        {inner}
      </Link>
    );
  }
  return <div className={className}>{inner}</div>;
}
