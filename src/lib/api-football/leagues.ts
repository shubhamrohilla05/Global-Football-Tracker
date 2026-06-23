/**
 * Curated scope of leagues we sync on the free tier.
 *
 * Free tier = 100 API calls/day, which can't cover all 1,200+ leagues deeply.
 * So we prioritize:
 *   - MAJOR:    the top domestic league per major football country + marquee
 *               international competitions. Deep daily sync.
 *   - STANDARD: secondary domestic leagues in those same countries. Fixtures +
 *               standings only.
 *   - MINOR:    everything else — deferred until you upgrade to a paid key.
 *               (The schema & sync code support them; the scope list just
 *               doesn't include them yet to protect the budget.)
 *
 * League IDs are API-Football's stable IDs. Add to these lists as you expand
 * (no other code changes needed). When you move to a paid tier, bump
 * API_FOOTBALL_DAILY_LIMIT and add more leagues here.
 */

export const MAJOR_LEAGUE_IDS = [
  // --- Europe: top domestic leagues (deep daily sync) ---
  39, // Premier League (England)
  140, // La Liga (Spain)
  135, // Serie A (Italy)
  78, // Bundesliga (Germany)
  61, // Ligue 1 (France)
  88, // Eredivisie (Netherlands)
  94, // Primeira Liga (Portugal)
  203, // Süper Lig (Turkey)
  144, // Jupiler Pro League (Belgium)
  218, // Bundesliga (Austria)
  207, // Super League (Switzerland)
  197, // Super League 1 (Greece)
  179, // Premiership (Scotland)
  119, // Superliga (Denmark)
  103, // Eliteserien (Norway)
  113, // Allsvenskan (Sweden)
  106, // Ekstraklasa (Poland)
  210, // HNL (Croatia)
  286, // Super Liga (Serbia)
  283, // Liga I (Romania)
  345, // Czech Liga (Czechia)
  333, // Premier League (Ukraine)
  235, // Premier League (Russia)
  271, // NB I (Hungary)
  357, // Premier Division (Ireland)
  // --- South America ---
  71, // Serie A (Brazil)
  128, // Liga Profesional (Argentina)
  // --- North America ---
  253, // MLS (USA)
  // --- Asia ---
  98, // J1 League (Japan)
  169, // K League 1 (South Korea)
  292, // Saudi Pro League (Saudi Arabia)
];

export const STANDARD_LEAGUE_IDS = [
  // Second tiers (fixtures + standings only)
  40, // Championship (England)
  41, // League One (England)
  141, // La Liga 2 / Segunda División (Spain)
  136, // Serie B (Italy)
  79, // 2. Bundesliga (Germany)
  62, // Ligue 2 (France)
  89, // Eerste Divisie (Netherlands)
  95, // Segunda Liga (Portugal)
  145, // Challenger Pro League (Belgium)
  219, // 2. Liga (Austria)
  204, // 1. Lig (Turkey)
  180, // Championship (Scotland)
];

// --- International competitions (cross-region) -----------------------------
// These power the "International" section. IDs are API-Football's stable ids;
// names below are verified against what /leagues actually returns for each id
// (an earlier pass had them mislabeled). Split for clarity into national-team
// tournaments and club continental cups — both are cross-region, so both live
// under the "world" pseudo-country the app groups internationals by.

// National-team tournaments — what the /international hero highlights.
export const NATIONAL_TEAM_LEAGUE_IDS = [
  1, // World Cup
  4, // Euro Championship
  5, // UEFA Nations League
  6, // Africa Cup of Nations
  7, // Asian Cup
  // Not yet tracked (add once the API-Football id is confirmed, don't guess):
  // Copa América, CONCACAF Gold Cup, World Cup / Euro qualifiers, friendlies.
];

// Club continental competitions.
export const CLUB_INTERNATIONAL_LEAGUE_IDS = [
  2, // UEFA Champions League
  3, // UEFA Europa League
  11, // CONMEBOL Sudamericana
  13, // CONMEBOL Libertadores
  15, // FIFA Club World Cup
  16, // CONCACAF Champions League
  27, // OFC Champions League
];

export const INTERNATIONAL_LEAGUE_IDS = [
  ...NATIONAL_TEAM_LEAGUE_IDS,
  ...CLUB_INTERNATIONAL_LEAGUE_IDS,
];

// Convenience: every league we sync at all (MAJOR + STANDARD + INTERNATIONAL).
export const ALL_SYNCED_LEAGUE_IDS = [
  ...MAJOR_LEAGUE_IDS,
  ...STANDARD_LEAGUE_IDS,
  ...INTERNATIONAL_LEAGUE_IDS,
];

