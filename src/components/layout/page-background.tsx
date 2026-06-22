import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------------------
   Backdrop registry
   ---------------------------------------------------------------------------
   A small set of themed, football-related photos. Each page picks a backdrop
   "theme"; the image is tinted to the lime/near-black palette and washed dark
   so foreground content stays readable.

   To give a section its own imagery (e.g. a real La Liga photo), drop a file in
   /public/images/ and add it to BACKDROPS or LEAGUE_BACKDROPS below — no other
   code changes are needed.
   --------------------------------------------------------------------------- */

export type BackdropTheme = "stadium" | "pitch" | "night";

const BACKDROPS: Record<BackdropTheme, { image: string; align: string }> = {
  stadium: { image: "/images/stadium-dusk.jpg", align: "center 28%" },
  pitch: { image: "/images/pitch-grass.jpg", align: "center 55%" },
  night: { image: "/images/stadium-dusk.jpg", align: "center 60%" },
};

/**
 * Per-league imagery. Keys are matched (case-insensitively) as substrings of
 * the league name, so "La Liga" matches "laliga". Falls back to the `pitch`
 * theme when nothing matches. Point these at dedicated files as you add them
 * (e.g. "/images/leagues/laliga.jpg").
 */
interface LeagueBackdrop {
  match: string;
  image: string;
  align?: string;
  /** When false, skip the lime tint wash and render the photo bright. */
  tint?: boolean;
  /** Photo opacity override (0–1). */
  opacity?: number;
  /** Fix the photo behind the whole page (not just the header band). */
  fullPage?: boolean;
}

const LEAGUE_BACKDROPS: LeagueBackdrop[] = [
  // Real World Cup imagery — the reigning champions (Argentina, Lionel Messi
  // lifting the 2022 FIFA World Cup trophy). Rendered bright with no lime tint
  // and fixed behind the entire page. Also covers "FIFA Club World Cup" via
  // substring match. See /public/images/ATTRIBUTIONS.md for credits.
  {
    match: "world cup",
    image: "/images/worldcup-winner.jpg",
    align: "center 30%",
    tint: false,
    opacity: 0.95,
    fullPage: true,
  },
  // Example mappings — swap the image paths for real league photos when added:
  { match: "champions league", image: "/images/stadium-dusk.jpg", align: "center 25%" },
  { match: "premier league", image: "/images/pitch-grass.jpg" },
  { match: "la liga", image: "/images/pitch-grass.jpg" },
];

/** Resolve a backdrop image (and rendering hints) for a named league. */
export function leagueBackdrop(
  name?: string | null,
): { image: string; align: string; tint?: boolean; opacity?: number; fullPage?: boolean } {
  const n = (name ?? "").toLowerCase();
  const hit = LEAGUE_BACKDROPS.find((b) => n.includes(b.match));
  if (hit) {
    return {
      image: hit.image,
      align: hit.align ?? "center 45%",
      tint: hit.tint,
      opacity: hit.opacity,
      fullPage: hit.fullPage,
    };
  }
  return BACKDROPS.pitch;
}

interface PageBackgroundProps {
  /** Pick a preset theme, or pass an explicit `image`. */
  theme?: BackdropTheme;
  image?: string;
  /** CSS object-position for the photo. */
  align?: string;
  /** Height of the backdrop band (Tailwind class). It fades into the page bg. */
  height?: string;
  /** Strength of the photo (0–1). Defaults higher when `tint` is off. */
  opacity?: number;
  /**
   * Apply the lime "floodlight" wash over the photo. Default true. Set false
   * for imagery that should read bright and true-to-colour (e.g. real event
   * photos) with no neon cast.
   */
  tint?: boolean;
  /**
   * Fix the photo to the viewport behind the entire page (not just the top
   * header band), so it stays visible while scrolling. A readability veil is
   * applied so foreground content stays legible.
   */
  fullPage?: boolean;
  className?: string;
}

/**
 * Full-bleed ambient backdrop for the top of a page. Breaks out of the
 * centered page container to span the viewport width, sits behind content, and
 * fades into the page background. Render it as the first child of a `relative`
 * page wrapper.
 */
export function PageBackground({
  theme = "stadium",
  image,
  align,
  height = "h-[380px]",
  opacity,
  tint = true,
  fullPage = false,
  className,
}: PageBackgroundProps) {
  const preset = BACKDROPS[theme];
  const src = image ?? preset.image;
  const objectPosition = align ?? preset.align;
  // Bright, true-to-colour photos read better when un-tinted, so default to a
  // higher opacity and a lighter wash in that mode.
  const photoOpacity = opacity ?? (tint ? 0.55 : 0.95);
  const filter = tint
    ? "saturate(1.1) brightness(1.1)"
    : "saturate(1.06) brightness(1.12) contrast(1.03)";

  // Full-page mode: fix the photo to the viewport behind the whole page so it
  // stays visible while scrolling, showing through the gutters and gaps between
  // (opaque) cards. A flat veil keeps everything legible; a softer top scrim
  // protects the header text.
  if (fullPage) {
    return (
      <div
        aria-hidden
        className={cn(
          "pointer-events-none fixed inset-0 -z-10 overflow-hidden",
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          style={{ objectPosition, opacity: photoOpacity, filter }}
        />
        {tint && (
          <div className="absolute inset-0 mix-blend-soft-light bg-[radial-gradient(900px_500px_at_80%_8%,var(--accent),transparent_60%)] opacity-60" />
        )}
        {/* Flat readability veil across the whole viewport. */}
        <div className="absolute inset-0 bg-[color-mix(in_oklab,var(--bg)_48%,transparent)]" />
        {/* Softer top scrim so the page header reads cleanly over the photo. */}
        <div className="absolute inset-x-0 top-0 h-[420px] bg-gradient-to-b from-[color-mix(in_oklab,var(--bg)_70%,transparent)] via-[color-mix(in_oklab,var(--bg)_25%,transparent)] to-transparent" />
      </div>
    );
  }

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute left-1/2 top-0 -z-10 w-screen -translate-x-1/2 overflow-hidden",
        height,
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover"
        style={{ objectPosition, opacity: photoOpacity, filter }}
      />
      {/* Lime floodlight wash, blended into the photo. Skipped when un-tinted. */}
      {tint && (
        <div className="absolute inset-0 mix-blend-soft-light bg-[radial-gradient(760px_380px_at_80%_8%,var(--accent),transparent_60%)] opacity-60" />
      )}
      {/* Fade the foot of the band into the page background — a hard fade so the
          photo is constrained to the header band and never bleeds behind cards. */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent from-[20%] via-[color-mix(in_oklab,var(--bg)_72%,transparent)] via-[68%] to-[var(--bg)]" />
      {/* Darken the left, where headings sit, so text stays readable while the
          photo reads clearly on the right. Lighter scrim in bright mode. */}
      <div
        className={
          tint
            ? "absolute inset-0 bg-gradient-to-r from-[var(--bg)] via-[color-mix(in_oklab,var(--bg)_45%,transparent)] to-transparent"
            : "absolute inset-0 bg-gradient-to-r from-[color-mix(in_oklab,var(--bg)_82%,transparent)] via-[color-mix(in_oklab,var(--bg)_18%,transparent)] via-[42%] to-transparent"
        }
      />
    </div>
  );
}
