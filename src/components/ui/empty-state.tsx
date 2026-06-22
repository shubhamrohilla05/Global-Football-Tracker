import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[var(--border-strong)] bg-[#0c100c80] px-6 py-14 text-center",
        className,
      )}
    >
      <div className="pitch-stripes pointer-events-none absolute inset-0 opacity-30" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(50%_100%_at_50%_0%,var(--accent-soft),transparent_70%)]" />
      {Icon && (
        <div className="relative mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-hover)] text-[var(--fg-dim)]">
          <Icon className="h-7 w-7" />
        </div>
      )}
      <h3 className="relative text-base font-semibold text-[var(--fg)]">{title}</h3>
      {description && (
        <p className="relative mt-1.5 max-w-sm text-sm leading-relaxed text-[var(--fg-muted)]">
          {description}
        </p>
      )}
      {action && <div className="relative mt-5">{action}</div>}
    </div>
  );
}
