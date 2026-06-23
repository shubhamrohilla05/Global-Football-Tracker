import { z } from "zod";

// Centralized env validation. App boots only if the shape is right.
// API_FOOTBALL_KEY and DATABASE_URL are required for sync/DB; the UI can
// render without them (e.g. when only scaffolding), so they're optional here
// and checked at the sync boundary instead.
const envSchema = z.object({
  DATABASE_URL: z.string().optional(),
  API_FOOTBALL_KEY: z.string().optional(),
  // Base URL: api-sports.io direct or a RapidAPI proxy. Direct is preferred.
  API_FOOTBALL_BASE_URL: z
    .string()
    .url()
    .default("https://v3.football.api-sports.io"),
  // Free tier = 100/day. Set higher for a paid key. Enforced by the client.
  API_FOOTBALL_DAILY_LIMIT: z.coerce.number().int().positive().default(100),
  // Hosting URL (used for absolute URLs / OG tags). Optional in dev.
  APP_URL: z.string().url().default("http://localhost:3000"),
  // Shared secret guarding POST /api/sync against abuse. Required for the route
  // to run (it fails closed when unset) so the budget-burning sync can't be
  // triggered anonymously.
  CRON_SECRET: z.string().optional(),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("❌ Invalid environment variables:", parsed.error.flatten());
    // Don't throw in the browser/edge; surface a clear server error instead.
    return {
      DATABASE_URL: undefined,
      API_FOOTBALL_KEY: undefined,
      API_FOOTBALL_BASE_URL: "https://v3.football.api-sports.io",
      API_FOOTBALL_DAILY_LIMIT: 100,
      APP_URL: "http://localhost:3000",
      CRON_SECRET: undefined,
    };
  }
  return parsed.data;
}

export const env = loadEnv();

export const hasApiConfig = () => Boolean(env.API_FOOTBALL_KEY);
export const hasDbConfig = () => Boolean(env.DATABASE_URL);
