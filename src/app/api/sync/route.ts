/**
 * API route: POST /api/sync
 * Triggered by Vercel Cron or an external cron service (cron-job.org).
 * Runs the daily deep sync. Protected by a shared secret to prevent abuse.
 */
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { runDailyDeepSync } from "@/sync/runner";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes (Vercel hobby plan limit)

// Vercel Cron calls this route automatically. You can also call it manually
// with curl -X POST http://localhost:3000/api/sync?secret=your_cron_secret
const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(request: Request) {
  // Secret check (optional but recommended for production).
  if (CRON_SECRET) {
    const url = new URL(request.url);
    const secret = url.searchParams.get("secret");
    if (secret !== CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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
