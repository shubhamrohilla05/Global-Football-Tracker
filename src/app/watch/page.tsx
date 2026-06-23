import { Tv, Info, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { PageBackground } from "@/components/layout/page-background";
import { SectionHeading } from "@/components/ui/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { Flag } from "@/components/ui/flag";
import { getAllBroadcastersGrouped } from "@/lib/data/broadcasters";
import { hasDbConfig } from "@/lib/env";
import { BROADCASTER_SEED } from "@/lib/broadcasters/seed-data";

// Render against the live DB each request — otherwise the page can be captured
// as static HTML at build time (before `seed:broadcasters` runs) and keep
// serving the "League {id}" seed placeholders even after the data is populated.
export const dynamic = "force-dynamic";

// Normalized shape used by the renderer, regardless of data source.
interface BroadcastEntry {
  leagueId: number;
  leagueName: string;
  leagueLogo: string | null;
  countryCode: string;
  broadcaster: string;
  streamUrl: string | null;
  platform: string | null;
}

export default async function WatchPage() {
  const configured = hasDbConfig();
  let entries: BroadcastEntry[] = [];

  if (configured) {
    try {
      const grouped = await getAllBroadcastersGrouped();
      for (const [, rows] of grouped) {
        for (const r of rows) {
          entries.push({
            leagueId: r.leagueId,
            leagueName: r.league?.name ?? `League ${r.leagueId}`,
            leagueLogo: r.league?.logo ?? null,
            countryCode: r.countryCode,
            broadcaster: r.broadcaster,
            streamUrl: r.streamUrl,
            platform: r.platform,
          });
        }
      }
    } catch {
      entries = [];
    }
  }

  // Fallback to curated seed data if the DB isn't configured or has nothing.
  if (entries.length === 0) {
    entries = BROADCASTER_SEED.map((s) => ({
      leagueId: s.leagueId,
      leagueName: `League ${s.leagueId}`, // names resolve once synced
      leagueLogo: null,
      countryCode: s.countryCode,
      broadcaster: s.broadcaster,
      streamUrl: s.streamUrl ?? null,
      platform: s.platform ?? null,
    }));
  }

  // Group by league.
  const leagueMap = new Map<number, BroadcastEntry[]>();
  for (const e of entries) {
    if (!leagueMap.has(e.leagueId)) leagueMap.set(e.leagueId, []);
    leagueMap.get(e.leagueId)!.push(e);
  }

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <PageBackground theme="stadium" />
      <PageHeader
        eyebrow="Where to watch"
        title="Broadcast Guide"
        icon={Tv}
        accent
        description={`Official broadcasters for ${leagueMap.size} major competitions across popular regions. Per-competition, per-country — curated from Wikipedia and official league sources.`}
      />

      <div className="mt-6 rounded-2xl border border-[color-mix(in_oklab,var(--info)_30%,transparent)] bg-[color-mix(in_oklab,var(--info)_8%,transparent)] p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--info)_18%,transparent)] text-[var(--info)]">
            <Info className="h-4.5 w-4.5" />
          </span>
          <div>
            <p className="text-sm font-semibold">Per-competition, per-region data</p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--fg-muted)]">
              Sports broadcast rights are territory-licensed and change every few
              years — there&apos;s no comprehensive free feed. This guide maps
              each major competition to its official broadcaster by country.
              Always confirm with the official source for the most current rights.
            </p>
          </div>
        </div>
      </div>

      {leagueMap.size > 0 ? (
        <div className="mt-10 space-y-12">
          {[...leagueMap.entries()].map(([leagueId, items]) => {
            // Group this league's entries by country.
            const byCountry = new Map<string, BroadcastEntry[]>();
            for (const e of items) {
              if (!byCountry.has(e.countryCode)) byCountry.set(e.countryCode, []);
              byCountry.get(e.countryCode)!.push(e);
            }

            return (
              <section key={leagueId}>
                <SectionHeading
                  title={items[0]?.leagueName ?? `League ${leagueId}`}
                  logo={items[0]?.leagueLogo}
                  icon={Tv}
                  href={`/league/${leagueId}`}
                  hrefLabel="View league"
                  accent
                />
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[...byCountry.entries()].map(([countryCode, list]) => (
                    <div key={countryCode} className="panel overflow-hidden">
                      <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] bg-[#ffffff05] px-4 py-2.5">
                        <Flag code={countryCode} name={countryCode} size={15} />
                        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
                          {countryCode.toUpperCase()}
                        </p>
                      </div>
                      <div>
                        {list.map((item) => (
                          <div
                            key={`${leagueId}-${countryCode}-${item.broadcaster}`}
                            className="flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] px-4 py-3 last:border-b-0"
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <Tv className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                              <span className="truncate text-sm font-medium">{item.broadcaster}</span>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              {item.platform && <span className="chip">{item.platform}</span>}
                              {item.streamUrl && (
                                <a
                                  href={item.streamUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[var(--fg-dim)] transition-colors hover:text-[var(--pitch-bright)]"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState
            icon={Tv}
            title="No broadcaster data loaded"
            description="Run `npm run seed:broadcasters` after syncing leagues to populate the broadcast guide."
          />
        </div>
      )}
    </div>
  );
}
