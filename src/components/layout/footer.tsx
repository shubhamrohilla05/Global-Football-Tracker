import Link from "next/link";
import { Goal, Github, Heart, ArrowUpRight } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative mt-24 overflow-hidden border-t border-[var(--border-subtle)]">
      {/* Grass-pitch ambiance, dropped low and washed into the base color */}
      <div className="pointer-events-none absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/pitch-grass.jpg"
          alt=""
          aria-hidden
          className="h-full w-full object-cover opacity-[0.12]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg)] via-[color-mix(in_oklab,var(--bg)_85%,transparent)] to-[color-mix(in_oklab,var(--bg)_70%,transparent)]" />
      </div>
      {/* Floodlit base glow */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-[radial-gradient(60%_120%_at_50%_140%,var(--accent-soft),transparent_70%)]" />
      <div className="pitch-stripes absolute inset-0 opacity-40" />

      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5">
              <span className="brand-mark grid h-9 w-9 place-items-center rounded-xl">
                <Goal className="h-5 w-5 text-[var(--on-accent)]" strokeWidth={2.6} />
              </span>
              <span className="font-display text-[16px] font-extrabold tracking-tight">
                Pitch<span className="text-[var(--accent)]">Pulse</span>
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-[var(--fg-muted)]">
              Tracking every football match worldwide — domestic leagues by
              country and region, international fixtures, squads, and where to
              watch. Built on API-Football with a budget-aware sync engine.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="chip chip-accent">Live scores</span>
              <span className="chip">Squads</span>
              <span className="chip chip-gold">Where to watch</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-sm sm:grid-cols-3">
            <div className="space-y-2.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-dim)]">
                Browse
              </h4>
              <FooterLink href="/fixtures">All Fixtures</FooterLink>
              <FooterLink href="/international">International</FooterLink>
              <FooterLink href="/watch">Where to Watch</FooterLink>
            </div>
            <div className="space-y-2.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-dim)]">
                Regions
              </h4>
              <FooterLink href="/region/europe">Europe</FooterLink>
              <FooterLink href="/region/south-america">South America</FooterLink>
              <FooterLink href="/region/asia">Asia</FooterLink>
              <FooterLink href="/region/africa">Africa</FooterLink>
            </div>
            <div className="space-y-2.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-dim)]">
                More
              </h4>
              <FooterLink href="/region/north-america">North America</FooterLink>
              <FooterLink href="/region/oceania">Oceania</FooterLink>
              <FooterLink href="/">Home</FooterLink>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[var(--border-subtle)] pt-6 text-xs text-[var(--fg-dim)] sm:flex-row">
          <p className="max-w-xl text-center sm:text-left">
            Football data © API-Football / api-sports.io. For informational use.
            Broadcaster info may be incomplete — verify with official sources.
          </p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              Built with{" "}
              <Heart className="h-3.5 w-3.5 fill-[var(--live)] text-[var(--live)]" />{" "}
              for the game
            </span>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-1.5 transition-colors hover:text-[var(--pitch-bright)]"
            >
              <Github className="h-3.5 w-3.5" />
              GitHub
              <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block text-[var(--fg-muted)] transition-colors hover:text-[var(--pitch-bright)]"
    >
      {children}
    </Link>
  );
}
