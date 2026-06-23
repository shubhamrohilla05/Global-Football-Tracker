import type { Region } from "@prisma/client";

/**
 * Maps API-Football country codes (and a few names) to our Region enum.
 *
 * API-Football's `country.code` is an ISO 3166-1 alpha-2 code (lowercased here),
 * with the UK home nations as "gb-eng" / "gb-sct" / "gb-wls" / "gb-nir". So the
 * map is keyed primarily by ISO code; legacy names/codes are kept as fallbacks.
 *
 * Anything not listed defaults to WORLD (international) — see resolveRegion().
 */
export const COUNTRY_REGION: Record<string, Region> = {
  // --- Europe (ISO alpha-2) ---
  al: "EUROPE", ad: "EUROPE", at: "EUROPE", by: "EUROPE", be: "EUROPE",
  ba: "EUROPE", bg: "EUROPE", hr: "EUROPE", cy: "EUROPE", cz: "EUROPE",
  dk: "EUROPE", ee: "EUROPE", fo: "EUROPE", fi: "EUROPE", fr: "EUROPE",
  de: "EUROPE", gi: "EUROPE", gr: "EUROPE", hu: "EUROPE", is: "EUROPE",
  ie: "EUROPE", it: "EUROPE", xk: "EUROPE", lv: "EUROPE", li: "EUROPE",
  lt: "EUROPE", lu: "EUROPE", mt: "EUROPE", md: "EUROPE", mc: "EUROPE",
  me: "EUROPE", nl: "EUROPE", mk: "EUROPE", no: "EUROPE", pl: "EUROPE",
  pt: "EUROPE", ro: "EUROPE", ru: "EUROPE", sm: "EUROPE", rs: "EUROPE",
  sk: "EUROPE", si: "EUROPE", es: "EUROPE", se: "EUROPE", ch: "EUROPE",
  tr: "EUROPE", ua: "EUROPE", gb: "EUROPE",
  "gb-eng": "EUROPE", "gb-sct": "EUROPE", "gb-wls": "EUROPE", "gb-nir": "EUROPE",
  // Legacy/name fallbacks
  eng: "EUROPE", england: "EUROPE", scotland: "EUROPE", wales: "EUROPE",
  "northern-ireland": "EUROPE", "europe-uefa": "EUROPE",

  // --- South America ---
  ar: "SOUTH_AMERICA", bo: "SOUTH_AMERICA", br: "SOUTH_AMERICA",
  cl: "SOUTH_AMERICA", co: "SOUTH_AMERICA", ec: "SOUTH_AMERICA",
  gy: "SOUTH_AMERICA", py: "SOUTH_AMERICA", pe: "SOUTH_AMERICA",
  sr: "SOUTH_AMERICA", uy: "SOUTH_AMERICA", ve: "SOUTH_AMERICA",
  "south-america-conmebol": "SOUTH_AMERICA",

  // --- North & Central America + Caribbean ---
  us: "NORTH_AMERICA", ca: "NORTH_AMERICA", mx: "NORTH_AMERICA",
  cr: "NORTH_AMERICA", hn: "NORTH_AMERICA", pa: "NORTH_AMERICA",
  gt: "NORTH_AMERICA", sv: "NORTH_AMERICA", ni: "NORTH_AMERICA",
  jm: "NORTH_AMERICA", tt: "NORTH_AMERICA", cu: "NORTH_AMERICA",
  do: "NORTH_AMERICA", ht: "NORTH_AMERICA",
  "north-central-america-concacaf": "NORTH_AMERICA",

  // --- Asia ---
  jp: "ASIA", kr: "ASIA", kp: "ASIA", sa: "ASIA", cn: "ASIA", in: "ASIA",
  ir: "ASIA", iq: "ASIA", ae: "ASIA", qa: "ASIA", kw: "ASIA", bh: "ASIA",
  om: "ASIA", jo: "ASIA", sy: "ASIA", lb: "ASIA", uz: "ASIA", th: "ASIA",
  vn: "ASIA", id: "ASIA", my: "ASIA", sg: "ASIA", hk: "ASIA",
  "asia-afc": "ASIA",

  // --- Africa ---
  eg: "AFRICA", ng: "AFRICA", za: "AFRICA", ma: "AFRICA", dz: "AFRICA",
  tn: "AFRICA", gh: "AFRICA", sn: "AFRICA", ci: "AFRICA", ke: "AFRICA",
  cm: "AFRICA", ml: "AFRICA", cd: "AFRICA", ao: "AFRICA", ug: "AFRICA",
  zm: "AFRICA", et: "AFRICA",
  "africa-caf": "AFRICA",

  // --- Oceania ---
  au: "OCEANIA", nz: "OCEANIA", fj: "OCEANIA", pg: "OCEANIA",
  "oceania-ofc": "OCEANIA",

  // --- International / cross-region ---
  world: "WORLD",
};

/** Normalize a country code/name (case-insensitive) to a Region. */
export function resolveRegion(countryCode?: string | null): Region {
  if (!countryCode) return "WORLD";
  const key = countryCode.toLowerCase().trim();
  if (COUNTRY_REGION[key]) return COUNTRY_REGION[key];
  // UK home-nation codes like "gb-eng" — fall back to the "gb" prefix.
  if (key.startsWith("gb")) return "EUROPE";
  return "WORLD";
}

/** Display names for the Region enum (UI). */
export const REGION_LABELS: Record<Region, string> = {
  EUROPE: "Europe",
  SOUTH_AMERICA: "South America",
  NORTH_AMERICA: "North America",
  ASIA: "Asia",
  AFRICA: "Africa",
  OCEANIA: "Oceania",
  WORLD: "International",
};

/** Order regions appear in the UI. */
export const REGION_ORDER: Region[] = [
  "EUROPE",
  "SOUTH_AMERICA",
  "NORTH_AMERICA",
  "ASIA",
  "AFRICA",
  "OCEANIA",
  "WORLD",
];
