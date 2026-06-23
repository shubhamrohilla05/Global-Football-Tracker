import Link from "next/link";
import { TeamLogo } from "./team-logo";
import type { StandingRow } from "@/lib/data/structure";

/**
 * How qualification/relegation zones are colored:
 * - "league": top-4 Champions League, 5–6 Europa, bottom-3 relegation (only on
 *   tables ≥10 rows). For domestic league tables.
 * - "group": top-2 advance (knockout qualification), no relegation. For group
 *   stages of cups/tournaments.
 * - "cup": no zone coloring (knockout brackets, playoffs).
 */
export type StandingVariant = "league" | "group" | "cup";

/** Compact league standings table with form guides and position highlighting. */
export function StandingTable({
  rows,
  variant = "league",
}: {
  rows: StandingRow[];
  variant?: StandingVariant;
}) {
  if (rows.length === 0) return null;

  // Render per-group sections whenever the rows carry real group names (e.g. a
  // World Cup / Champions League group stage) — even if only one group has been
  // populated so far, so the "Group A" context label isn't dropped.
  const groups = [...new Set(rows.map((r) => r.group ?? ""))];
  const hasNamedGroups = groups.some((g) => g !== "");

  if (hasNamedGroups) {
    return (
      <div className="space-y-6">
        {groups.map((g) => {
          const groupRows = rows.filter((r) => (r.group ?? "") === g);
          return (
            <div key={g}>
              <h4 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-[var(--fg-dim)]">
                {g || "Standings"}
              </h4>
              <TableBody rows={groupRows} variant={variant} />
            </div>
          );
        })}
      </div>
    );
  }

  return <TableBody rows={rows} variant={variant} />;
}

function TableBody({ rows, variant }: { rows: StandingRow[]; variant: StandingVariant }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-[var(--fg-dim)]">
            <th className="px-2 py-2 font-medium">#</th>
            <th className="px-2 py-2 font-medium">Team</th>
            <th className="px-2 py-2 text-center font-medium" title="Played">P</th>
            <th className="hidden px-2 py-2 text-center font-medium sm:table-cell" title="Won">W</th>
            <th className="hidden px-2 py-2 text-center font-medium sm:table-cell" title="Drawn">D</th>
            <th className="hidden px-2 py-2 text-center font-medium sm:table-cell" title="Lost">L</th>
            <th className="px-2 py-2 text-center font-medium" title="Goal difference">GD</th>
            <th className="px-2 py-2 text-center font-semibold text-[var(--fg)]" title="Points">Pts</th>
            <th className="hidden px-2 py-2 text-center font-medium md:table-cell" title="Form">Form</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-t border-[var(--border-subtle)] transition-colors hover:bg-[var(--surface-hover)]"
            >
              <td className="px-2 py-2.5">
                <div className="flex items-center gap-2">
                  <PositionBadge rank={row.rank} total={rows.length} variant={variant} />
                  <span className="nums text-[var(--fg-muted)]">{row.rank}</span>
                </div>
              </td>
              <td className="px-2 py-2.5">
                <Link
                  href={`/team/${row.teamId}`}
                  className="flex items-center gap-2 transition-colors hover:text-[var(--pitch-bright)]"
                >
                  {/* TeamLogo shows the country flag for national teams, the club
                      crest for clubs, or a monogram fallback. */}
                  <TeamLogo src={row.team.logo} name={row.team.name} size={22} />
                  <span className="truncate font-medium">{row.team.name}</span>
                </Link>
              </td>
              <td className="nums px-2 py-2.5 text-center text-[var(--fg-muted)]">{row.played}</td>
              <td className="nums hidden px-2 py-2.5 text-center text-[var(--fg-muted)] sm:table-cell">{row.won}</td>
              <td className="nums hidden px-2 py-2.5 text-center text-[var(--fg-muted)] sm:table-cell">{row.drawn}</td>
              <td className="nums hidden px-2 py-2.5 text-center text-[var(--fg-muted)] sm:table-cell">{row.lost}</td>
              <td className="nums px-2 py-2.5 text-center text-[var(--fg-muted)]">
                {row.goalsDiff > 0 ? `+${row.goalsDiff}` : row.goalsDiff}
              </td>
              <td className="nums px-2 py-2.5 text-center font-extrabold">{row.points}</td>
              <td className="hidden px-2 py-2.5 md:table-cell">
                <FormBadges form={row.form} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Colored bar marking qualification / relegation zones by rank. */
function PositionBadge({
  rank,
  total,
  variant,
}: {
  rank: number;
  total: number;
  variant: StandingVariant;
}) {
  let color = "transparent";
  if (variant === "league") {
    if (rank <= 4) color = "var(--win)"; // Champions League spots
    else if (rank <= 6) color = "var(--info)"; // Europa / continental
    // Relegation: bottom 3, computed from the actual table size so smaller
    // leagues/groups aren't mislabelled. Only applied when the table is large
    // enough for a meaningful relegation zone.
    else if (total >= 10 && rank > total - 3) color = "var(--live)";
  } else if (variant === "group") {
    // Group stage: top two advance to the knockout rounds. No relegation zone.
    if (rank <= 2) color = "var(--win)";
  }
  // "cup": no zone coloring.

  return (
    <span
      className="block h-6 w-1 rounded-full"
      style={{ backgroundColor: color }}
      aria-hidden
    />
  );
}

/** Recent form: W/D/L as colored dots. */
function FormBadges({ form }: { form: string | null }) {
  if (!form) return <span className="text-[var(--fg-dim)]">—</span>;
  const letters = form.slice(-5).split("");
  return (
    <div className="flex justify-center gap-1">
      {letters.map((ch, i) => {
        const bg =
          ch === "W" ? "var(--win)" : ch === "D" ? "var(--gold)" : "var(--live)";
        return (
          <span
            key={i}
            className="grid h-5 w-5 place-items-center rounded text-[10px] font-bold text-[#0a1402]"
            style={{ backgroundColor: bg }}
          >
            {ch}
          </span>
        );
      })}
    </div>
  );
}
