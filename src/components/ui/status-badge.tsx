import { cn } from "@/lib/utils";
import { isLiveStatus, isFinishedStatus, isAbnormalStatus } from "@/lib/fixture-status";

/**
 * Fixture status badge. Translates API-Football status short codes into
 * visually distinct chips: live (red, pulsing), finished (muted), upcoming
 * (accent), and abnormal (postponed/cancelled — gold).
 */
export function StatusBadge({
  status,
  minute,
  className,
}: {
  status: string;
  minute?: number | null;
  className?: string;
}) {
  const live = isLiveStatus(status);
  const finished = isFinishedStatus(status);
  const abnormal = isAbnormalStatus(status);

  if (live) {
    return (
      <span className={cn("chip chip-live", className)}>
        <span className="live-dot" />
        {status === "HT"
          ? "HT"
          : status === "P"
            ? "Pens"
            : minute
              ? `${minute}'`
              : "Live"}
      </span>
    );
  }
  if (finished) {
    return (
      <span className={cn("chip", className)}>
        {status === "AET" ? "FT (aet)" : status === "PEN" ? "FT (pens)" : "Full time"}
      </span>
    );
  }
  if (abnormal) {
    const label =
      status === "PST"
        ? "Postponed"
        : status === "CANC"
          ? "Cancelled"
          : status === "ABD"
            ? "Abandoned"
            : status;
    return <span className={cn("chip chip-gold", className)}>{label}</span>;
  }
  // Upcoming / not started
  return <span className={cn("chip chip-accent", className)}>Upcoming</span>;
}
