import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { TeamLogo } from "./team-logo";

interface SectionHeadingProps {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  /** Optional logo URL — when set, shown as the badge instead of `icon`. */
  logo?: string | null;
  href?: string;
  hrefLabel?: string;
  className?: string;
  accent?: boolean;
  children?: React.ReactNode;
}

export function SectionHeading({
  title,
  icon: Icon,
  logo,
  href,
  hrefLabel = "View all",
  className,
  accent = false,
  children,
}: SectionHeadingProps) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div className="flex min-w-0 items-center gap-3">
        {logo ? (
          <TeamLogo
            src={logo}
            name={title}
            size={38}
            className="!rounded-xl border border-[var(--border-subtle)] bg-white/5 p-1"
          />
        ) : (
          Icon && (
            <span
              className={cn(
                "grid h-9 w-9 shrink-0 place-items-center rounded-xl border",
                accent
                  ? "border-[color-mix(in_oklab,var(--accent)_45%,transparent)] bg-[var(--accent-soft)] text-[var(--pitch-bright)]"
                  : "border-[var(--border)] bg-[#ffffff08] text-[var(--fg-muted)]",
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
            </span>
          )
        )}
        <h2 className="truncate font-display text-lg font-bold tracking-tight sm:text-xl">
          {title}
        </h2>
        {children}
      </div>
      {href && (
        <Link
          href={href}
          className="group flex shrink-0 items-center gap-1 rounded-full border border-[var(--border)] bg-[#ffffff06] px-3 py-1.5 text-xs font-semibold text-[var(--fg-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--pitch-bright)]"
        >
          {hrefLabel}
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
