import { cn } from "@/lib/utils";
import { flagForNationality } from "./flag";

interface TeamLogoProps {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
}

/** Two-letter monogram from a team/league name (e.g. "Aston Villa" → "AV"). */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Deterministic accent-family hue from a name, so each crest fallback is
 *  distinct but stays on-palette. */
const TINTS = ["var(--accent)", "var(--info)", "var(--gold)", "var(--pitch-bright)"];
function tintFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}

/**
 * Team/league crest. Resolution order:
 *   1. A real logo URL (clubs) → render the image.
 *   2. No logo but the name is a country (national teams) → render its flag.
 *   3. Otherwise → a colored monogram chip from the initials.
 */
export function TeamLogo({ src, name, size = 32, className }: TeamLogoProps) {
  // National teams have no club crest — show the country flag instead.
  if (!src) {
    const flag = flagForNationality(name);
    if (flag) {
      return (
        <span
          className={cn("grid shrink-0 place-items-center leading-none", className)}
          style={{ width: size, height: size, fontSize: Math.round(size * 0.82) }}
          role="img"
          aria-label={`${name} flag`}
        >
          {flag}
        </span>
      );
    }
  }
  if (!src) {
    const tint = tintFor(name);
    return (
      <span
        className={cn(
          "grid shrink-0 place-items-center rounded-lg font-display font-bold leading-none",
          className,
        )}
        style={{
          width: size,
          height: size,
          fontSize: Math.max(9, size * 0.4),
          color: tint,
          backgroundColor: `color-mix(in oklab, ${tint} 16%, var(--surface))`,
          boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${tint} 38%, transparent)`,
        }}
        aria-hidden
      >
        {initials(name)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`${name} logo`}
      width={size}
      height={size}
      className={cn("shrink-0 rounded-lg object-contain", className)}
      style={{ width: size, height: size }}
      loading="lazy"
    />
  );
}
