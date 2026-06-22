/**
 * API-Football (api-sports.io) client with hard daily-budget enforcement.
 *
 * The free tier allows 100 requests/day. "All global football activity" far
 * exceeds that, so EVERY upstream call goes through here: we log it to the
 * ApiCallLog ledger and refuse to exceed the configured daily limit. The UI
 * never calls the API directly — it reads from the DB, which is populated by
 * scheduled syncs that budget their calls through this client.
 *
 * Swap in a paid key (higher API_FOOTBALL_DAILY_LIMIT) with zero code changes.
 */
import { env } from "@/lib/env";
import { prisma } from "@/lib/db";

// ---------------------------------------------------------------------------
// Type definitions for the API-Football v3 responses we consume.
// Only the fields we use are typed; the API returns much more.
// ---------------------------------------------------------------------------

// The /leagues endpoint nests league details under `league`, with `country`
// and a `seasons` array as siblings (NOT a flat object).
export interface AFLeague {
  league: { id: number; name: string; type: string; logo: string | null };
  country?: { name: string; code: string | null; flag: string | null };
  seasons?: Array<{
    year: number;
    start: string | null;
    end: string | null;
    current: boolean;
  }>;
}

export interface AFTeam {
  id: number;
  name: string;
  code: string | null;
  logo: string | null;
  country?: string;
  venue?: {
    id: number | null;
    name: string | null;
    address: string | null;
    city: string | null;
    capacity: number | null;
  };
}

export interface AFPlayer {
  id: number;
  name: string;
  firstname: string | null;
  lastname: string | null;
  age: number | null;
  nationality: string | null;
  height: string | null;
  weight: string | null;
  photo: string | null;
  injured?: boolean;
}

export interface AFSquadPlayer {
  id: number;
  name: string;
  age: number | null;
  number: number | null;
  position: string;
  photo: string | null;
}

export interface AFPlayerStat {
  player: {
    id: number;
    name: string;
    firstname: string | null;
    lastname: string | null;
    age: number | null;
    nationality: string | null;
    height: string | null;
    weight: string | null;
    photo: string | null;
    injured?: boolean;
  };
  statistics: Array<{
    team: { id: number; name: string; logo: string | null };
    league: { id: number; name: string; logo: string | null; season: number };
    games: {
      appearences: number | null;
      position: string | null;
      rating: string | null;
    };
    goals: { total: number | null; assists: number | null };
  }>;
}

export interface AFFixture {
  fixture: {
    id: number;
    date: string; // ISO
    timestamp: number;
    timezone: string;
    venue: { id: number | null; name: string | null; city: string | null };
    status: {
      long: string | null;
      short: string;
      elapsed: number | null;
    };
    referee: string | null;
  };
  league: {
    id: number;
    name: string;
    country: string | null;
    logo: string | null;
    flag: string | null;
    season: number;
    round: string | null;
  };
  teams: {
    home: { id: number; name: string; logo: string | null; winner: boolean | null };
    away: { id: number; name: string; logo: string | null; winner: boolean | null };
  };
  goals: { home: number | null; away: number | null };
  score: {
    halftime: { home: number | null; away: number | null };
    fulltime: { home: number | null; away: number | null };
    extratime: { home: number | null; away: number | null };
    penalty: { home: number | null; away: number | null };
  };
}

export interface AFStanding {
  rank: number;
  team: { id: number; name: string; logo: string | null };
  points: number;
  group: string | null;
  goalsDiff: number;
  all: { played: number; win: number; draw: number; lose: number };
  home: { played: number; win: number; draw: number; lose: number };
  away: { played: number; win: number; draw: number; lose: number };
  goalsFor: { total: number | null };
  goalsAgainst: { total: number | null };
  form: string | null;
  description: string | null;
}

export interface AFResponse<T> {
  get: string;
  parameters: Record<string, unknown>;
  errors: unknown[] | string | null;
  results: number;
  paging: { current: number; total: number };
  response: T[];
}

// ---------------------------------------------------------------------------
// Budget enforcement
// ---------------------------------------------------------------------------

/** How many API calls remain today (resets at UTC midnight). */
export async function callsRemainingToday(): Promise<number> {
  if (!env.API_FOOTBALL_KEY) return 0;
  const today = new Date();
  const startOfDay = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  const used = await prisma.apiCallLog.aggregate({
    where: { date: { gte: startOfDay } },
    _sum: { cost: true },
  });
  const usedCount = used._sum.cost ?? 0;
  return Math.max(0, env.API_FOOTBALL_DAILY_LIMIT - usedCount);
}

async function recordCall(endpoint: string, params?: string): Promise<void> {
  const today = new Date();
  await prisma.apiCallLog.create({
    data: {
      date: new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
      ),
      endpoint,
      params,
      cost: 1,
    },
  });
}

class BudgetExhaustedError extends Error {
  constructor(remaining: number) {
    super(
      `API daily budget exhausted (${remaining} calls remaining). Sync will resume tomorrow or when API_FOOTBALL_DAILY_LIMIT is raised.`,
    );
    this.name = "BudgetExhaustedError";
  }
}

// ---------------------------------------------------------------------------
// Core request function
// ---------------------------------------------------------------------------

// Free tier allows ~10 requests/minute. We proactively space calls ~6.5s apart
// to stay under that ceiling, which avoids the 429 storms that retries can't
// recover from. (The 429 retry below remains as a safety net.)
const MIN_CALL_INTERVAL_MS = 6500;
let lastCallAt = 0;
async function throttle() {
  const wait = lastCallAt + MIN_CALL_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCallAt = Date.now();
}

async function request<T>(
  endpoint: string,
  params: Record<string, string | number | undefined> | undefined,
): Promise<T[]> {
  if (!env.API_FOOTBALL_KEY) {
    throw new Error(
      "API_FOOTBALL_KEY is not set. Add it to .env to enable data sync.",
    );
  }

  // Hard gate: check remaining budget before every call.
  const remaining = await callsRemainingToday();
  if (remaining <= 0) {
    throw new BudgetExhaustedError(0);
  }

  await throttle();

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  }
  const url = `${env.API_FOOTBALL_BASE_URL}/${endpoint}${qs.toString() ? `?${qs}` : ""}`;

  // The free tier has a per-minute rate limit on top of the daily budget. When
  // we hit it the API answers HTTP 429 (or a 200 with a `rateLimit` error). A
  // throttled retry burns no budget — we only record successful calls below.
  let body: AFResponse<T> | undefined;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, {
      headers: {
        "x-apisports-key": env.API_FOOTBALL_KEY,
        Accept: "application/json",
      },
      next: { revalidate: 0 },
    });

    const text = await res.text();
    const rateLimited =
      res.status === 429 || /"rateLimit"/.test(text);

    if (rateLimited) {
      if (attempt === 3) {
        throw new Error(`API-Football ${endpoint} → rate limited after 4 attempts`);
      }
      const waitMs = 6000 * (attempt + 1); // 6s, 12s, 18s
      console.log(`  ⏳ Rate limited on ${endpoint} — waiting ${waitMs / 1000}s…`);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }

    if (!res.ok) {
      throw new Error(`API-Football ${endpoint} → HTTP ${res.status}: ${text}`);
    }

    body = JSON.parse(text) as AFResponse<T>;
    break;
  }

  if (!body) {
    throw new Error(`API-Football ${endpoint} → no response`);
  }
  if (body.errors && (Array.isArray(body.errors) ? body.errors.length : body.errors)) {
    throw new Error(`API-Football ${endpoint} errors: ${JSON.stringify(body.errors)}`);
  }

  // Only charge AFTER a successful call so failed retries don't burn budget.
  await recordCall(endpoint, qs.toString() || undefined);
  return body.response;
}

// ---------------------------------------------------------------------------
// Typed endpoint wrappers (one per API-Football resource we consume).
// ---------------------------------------------------------------------------

export const af = {
  leagues: (params?: { id?: number; country?: string; season?: number }) =>
    request<AFLeague>("leagues", params),

  teams: (params: { league?: number; season?: number; id?: number; country?: string }) =>
    request<AFTeam>("teams", params),

  fixtures: (params: {
    league?: number;
    season?: number;
    date?: string; // YYYY-MM-DD
    from?: string;
    to?: string;
    team?: number;
    live?: string;
    round?: string;
    next?: number;
    last?: number;
  }) => request<AFFixture>("fixtures", params),

  squads: (teamId: number) =>
    request<{ team: { id: number; name: string; logo: string | null }; players: AFSquadPlayer[] }>(`players/squads`, { team: teamId }),

  playerStats: (params: { id: number; season: number; league?: number }) =>
    request<AFPlayerStat>("players", params),

  // The /standings endpoint nests the table under response[0].league.standings,
  // which is an array of groups, each group an array of rows. Unwrap it here so
  // callers get AFStanding[][] (one inner array per group/table).
  standings: async (params: { league: number; season: number }) => {
    const res = await request<{ league: { standings: AFStanding[][] } }>(
      "standings",
      params,
    );
    return res[0]?.league?.standings ?? [];
  },
};

export { BudgetExhaustedError };
