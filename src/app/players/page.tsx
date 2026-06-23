import type { Metadata } from "next";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { PageBackground } from "@/components/layout/page-background";
import { EmptyState } from "@/components/ui/empty-state";
import { PlayersExplorer } from "@/components/ui/players-explorer";
import { hasDbConfig } from "@/lib/env";
import { getPlayersDirectory, type PlayerCardData } from "@/lib/data/players";

// Read the DB per request so newly-synced squads appear without a redeploy
// (otherwise the page is captured statically with whatever existed at build).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Players",
  description:
    "Search and filter players from squads synced across every league we cover.",
};

export default async function PlayersPage() {
  const configured = hasDbConfig();

  let players: PlayerCardData[] = [];
  if (configured) {
    try {
      players = await getPlayersDirectory();
    } catch {
      players = [];
    }
  }

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <PageBackground theme="pitch" />
      <PageHeader
        eyebrow="Player registry"
        title="Players"
        icon={Users}
        accent
        description="Squads synced from across the world — search by name, club, or nationality, and filter by position or club."
      />

      {players.length > 0 ? (
        <PlayersExplorer players={players} />
      ) : (
        <div className="mt-10">
          <EmptyState
            icon={Users}
            title="No players synced yet"
            description="Player rosters appear here once squads are synced. Run the deep sync with the squad refresh (npm run sync -- --squads) to populate this page."
          />
        </div>
      )}
    </div>
  );
}
