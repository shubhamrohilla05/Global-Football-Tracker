import { FixtureRow, type FixtureRowData } from "./fixture-row";
import { EmptyState } from "./empty-state";
import { CalendarDays } from "lucide-react";

/** A vertical list of fixture rows with an empty-state fallback. */
export function FixtureList({
  fixtures,
  emptyTitle = "No fixtures",
  emptyDescription = "There are no matches in this view right now.",
  className = "",
}: {
  fixtures: FixtureRowData[];
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}) {
  if (fixtures.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title={emptyTitle}
        description={emptyDescription}
        className={className}
      />
    );
  }
  return (
    <div className={"space-y-2 " + className}>
      {fixtures.map((f) => (
        <FixtureRow key={f.id} fixture={f} />
      ))}
    </div>
  );
}
