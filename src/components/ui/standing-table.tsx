import Link from "next/link";
import { TeamLogo } from "./team-logo";
import type { StandingRow } from "@/lib/data/structure";

/** Compact league standings table with form guides and position highlighting. */
export function StandingTable({ rows }: { rows: StandingRow[] }) {
  if (rows.length === 0) return null;

  // Detect if there are multiple groups (e.g. Champions League group stage).
  const groups = new Set(rows.map((r) => r.group ?? ""));

  if (groups.size > 1) {
    return (
      <div className="space-y-6">
        {[...groups].map((g) => (
          <div key={g}>
            <h4 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-[var(--fg-dim)]">
              {g || "Standings"}
            </h4>
            <TableBody rows={rows.filter((r) => (r.group ?? "") === g)} />
          </div>
        ))}
      </div>
    );
  }

  return <TableBody rows={rows} />;
}

function TableBody({ rows }: { rows: StandingRow[] }) {
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
                  <PositionBadge rank={row.rank} total={rows.length} />
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
function PositionBadge({ rank, total }: { rank: number; total: number }) {
  let color = "transparent";
  if (rank <= 4) color = "var(--win)"; // Champions League spots
  else if (rank <= 6) color = "var(--info)"; // Europa / continental
  // Relegation: bottom 3, computed from the actual table size so smaller
  // leagues/groups aren't mislabelled. Only applied when the table is large
  // enough for a meaningful relegation zone.
  else if (total >= 10 && rank > total - 3) color = "var(--live)";

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
