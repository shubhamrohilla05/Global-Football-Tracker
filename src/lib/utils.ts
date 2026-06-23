/** Tiny classnames helper — no deps. */
export function cn(
  ...inputs: Array<string | false | null | undefined>
): string {
  return inputs.filter(Boolean).join(" ");
}

/** Format a fixture date/time for display in the user's locale. */
export function formatMatchTime(iso: string): {
  date: string;
  time: string;
} {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    }),
    time: d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

/** Relative day label: Today / Tomorrow / weekday name. */
export function relativeDayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfTarget = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round(
    (startOfTarget.getTime() - startOfToday.getTime()) / 86_400_000,
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long" });
}

/** Abbreviate a long name, e.g. "Manchester City" -> "Man City". */
export function shortTeamName(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length <= 2) return name;
  return words
    .map((w, i) =>
      i === words.length - 1 ? w : w.slice(0, 3).replace(/\.$/, "") + ".",
    )
    .join(" ");
}
