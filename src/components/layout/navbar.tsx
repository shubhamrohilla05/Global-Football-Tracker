"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Trophy,
  CalendarDays,
  Tv,
  Globe2,
  Users,
  Menu,
  X,
  Goal,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/fixtures", label: "Fixtures", icon: CalendarDays },
  { href: "/international", label: "International", icon: Trophy },
  { href: "/players", label: "Players", icon: Users },
  { href: "/watch", label: "Where to Watch", icon: Tv },
];

const REGION_LINKS = [
  { href: "/region/europe", label: "Europe" },
  { href: "/region/south-america", label: "South America" },
  { href: "/region/north-america", label: "North America" },
  { href: "/region/asia", label: "Asia" },
  { href: "/region/africa", label: "Africa" },
  { href: "/region/oceania", label: "Oceania" },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border-subtle)] bg-[#0a0d0acc] backdrop-blur-xl">
      {/* Top brand-color hairline */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-70" />

      <nav className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        {/* Brand */}
        <Link href="/" className="group flex shrink-0 items-center gap-2.5">
          <span className="brand-mark grid h-9 w-9 place-items-center rounded-xl transition-transform group-hover:scale-105">
            <Goal className="h-5 w-5 text-[var(--on-accent)]" strokeWidth={2.6} />
          </span>
          <span className="hidden sm:block">
            <span className="block font-display text-[16px] font-extrabold leading-none tracking-tight">
              Pitch<span className="text-[var(--accent)]">Pulse</span>
            </span>
            <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--fg-dim)]">
              Global Football
            </span>
          </span>
        </Link>

        {/* Primary nav */}
        <div className="ml-2 hidden items-center gap-1 md:flex">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                isActive(href)
                  ? "bg-[var(--accent-soft)] text-[var(--pitch-bright)]"
                  : "text-[var(--fg-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--fg)]",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </div>

        {/* Right cluster */}
        <div className="ml-auto flex items-center gap-2">
          <Link href="/fixtures" className="btn-primary hidden !px-4 !py-2 sm:inline-flex">
            <CalendarDays className="h-4 w-4" />
            Today&apos;s matches
          </Link>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-full border border-[var(--border-strong)] bg-[#ffffff0a] text-[var(--fg)] transition-colors hover:border-[var(--accent)] hover:text-[var(--pitch-bright)] md:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-[var(--border-subtle)] bg-[#0a0d0af2] px-4 pb-5 pt-3 md:hidden">
          <div className="grid gap-1.5">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors",
                  isActive(href)
                    ? "bg-[var(--accent-soft)] text-[var(--pitch-bright)]"
                    : "text-[var(--fg-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--fg)]",
                )}
              >
                <Icon className="h-4.5 w-4.5" />
                {label}
              </Link>
            ))}
          </div>

          <p className="mb-2 mt-5 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-dim)]">
            <Globe2 className="h-3.5 w-3.5" />
            Regions
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {REGION_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="rounded-lg border border-[var(--border)] bg-[#ffffff06] px-3 py-2 text-xs font-medium text-[var(--fg-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--pitch-bright)]"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
