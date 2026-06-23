/**
 * Canonical fixture-status groupings (API-Football short codes).
 *
 * This is a dependency-free leaf module (no Prisma, no server-only imports) so
 * both server data helpers and client components can share ONE source of truth.
 * `src/lib/data/fixtures.ts` re-exports these for the documented "reuse the
 * canonical groupings" convention; client components import them directly here.
 */

/** Match is in progress (any phase, including half-time / penalties). */
export const LIVE_STATUSES: string[] = ["1H", "2H", "HT", "ET", "BT", "P", "LIVE"];

/** Match has a final result. */
export const FINISHED_STATUSES: string[] = ["FT", "AET", "PEN"];

/** Abnormal outcomes — no normal full-time result (postponed/cancelled/etc.). */
export const ABNORMAL_STATUSES: string[] = ["PST", "CANC", "ABD", "AWD", "WO"];

export const isLiveStatus = (s: string): boolean => LIVE_STATUSES.includes(s);
export const isFinishedStatus = (s: string): boolean => FINISHED_STATUSES.includes(s);
export const isAbnormalStatus = (s: string): boolean => ABNORMAL_STATUSES.includes(s);
