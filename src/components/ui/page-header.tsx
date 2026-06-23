import { cn } from "@/lib/utils";
import { TeamLogo } from "./team-logo";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  /** Optional logo URL — when set, shown as the left badge instead of `icon`. */
  logo?: string | null;
  accent?: boolean;
  children?: React.ReactNode;
  className?: string;
}

/** Standard page header with optional icon/logo badge, eyebrow label, and actions. */
export function PageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  logo,
  accent = false,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="flex items-start gap-4">
        {logo ? (
          <TeamLogo
            src={logo}
            name={title}
            size={56}
            className="!rounded-2xl border border-[var(--border-subtle)] bg-white/5 p-1.5"
          />
        ) : (
          Icon && (
            <span
              className={cn(
                "grid h-13 w-13 shrink-0 place-items-center rounded-2xl border",
                accent
                  ? "border-[color-mix(in_oklab,var(--accent)_45%,transparent)] bg-[var(--accent-soft)] text-[var(--pitch-bright)] shadow-[0_0_40px_-16px_var(--accent-glow)]"
                  : "border-[var(--border)] bg-[#ffffff08] text-[var(--fg-muted)]",
              )}
              style={{ height: 52, width: 52 }}
            >
              <Icon className="h-6 w-6" />
            </span>
          )
        )}
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
              {eyebrow}
            </p>
          )}
          <h1 className="mt-1.5 font-display text-2xl font-extrabold tracking-tight sm:text-[2rem] sm:leading-[1.1]">
            {title}
          </h1>
          {description && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--fg-muted)]">
              {description}
            </p>
          )}
        </div>
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
}
