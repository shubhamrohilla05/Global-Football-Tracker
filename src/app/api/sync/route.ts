/**
 * API route: POST /api/sync
 * Triggered by Vercel Cron or an external cron service (cron-job.org).
 * Runs the daily deep sync. Protected by a shared secret to prevent abuse.
 */
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { runDailyDeepSync } from "@/sync/runner";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes (Vercel hobby plan limit)

// Vercel Cron calls this route automatically. You can also call it manually
// with curl -X POST http://localhost:3000/api/sync?secret=your_cron_secret

/** Constant-time secret comparison (avoids leaking the secret via timing). */
function secretMatches(provided: string | null, expected: string): boolean {
  if (provided == null) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // timingSafeEqual requires equal-length buffers; unequal length ⇒ no match.
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  // Fail closed: without a configured secret the budget-burning sync must not
  // be triggerable anonymously. (Local/manual runs use `npm run sync`.)
  if (!env.CRON_SECRET) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured; sync endpoint is disabled" },
      { status: 503 },
    );
  }

  const secret = new URL(request.url).searchParams.get("secret");
  if (!secretMatches(secret, env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!env.API_FOOTBALL_KEY || !env.DATABASE_URL) {
    return NextResponse.json(
      { error: "API_FOOTBALL_KEY and DATABASE_URL must be set" },
      { status: 500 },
    );
  }

  try {
    await runDailyDeepSync();
    return NextResponse.json({ status: "ok", message: "Daily deep sync complete" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ status: "error", message: msg }, { status: 500 });
  }
}
