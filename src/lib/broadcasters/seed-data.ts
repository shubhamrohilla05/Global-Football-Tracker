/**
 * Curated broadcaster seed data.
 *
 * Keyed by API-Football league ID → array of { countryCode, broadcaster, logo?, streamUrl?, platform? }.
 * Seeded from Wikipedia broadcast-rights pages and official league broadcaster lists.
 * Coverage is per-competition (not per-fixture) and per-country.
 *
 * Sources:
 * - https://en.wikipedia.org/wiki/List_of_Premier_League_overseas_broadcasters
 * - https://en.wikipedia.org/wiki/List_of_sports_television_broadcast_contracts
 * - Official league pages (premierleague.com, laliga.com, seriea.com, bundesliga.com)
 *
 * TODO: Expand this list as you add leagues. Each entry becomes a Broadcaster row
 * in the DB via the seed script.
 */

export const BROADCASTER_SEED: Array<{
  leagueId: number;
  countryCode: string;
  broadcaster: string;
  streamUrl?: string;
  platform?: string;
}> = [
  // ─── Premier League (39) ──────────────────────────────────────────────
  { leagueId: 39, countryCode: "us", broadcaster: "USA Network / Peacock", streamUrl: "https://www.peacocktv.com", platform: "Both" },
  { leagueId: 39, countryCode: "us", broadcaster: "Telemundo / Universo", platform: "TV", streamUrl: "https://www.telemundo.com" },
  { leagueId: 39, countryCode: "gb", broadcaster: "Sky Sports", platform: "TV", streamUrl: "https://www.skysports.com" },
  { leagueId: 39, countryCode: "gb", broadcaster: "TNT Sports", platform: "Both" },
  { leagueId: 39, countryCode: "in", broadcaster: "Star Sports / JioCinema", streamUrl: "https://www.jiocinema.com", platform: "Streaming" },
  { leagueId: 39, countryCode: "br", broadcaster: "ESPN / Star+", streamUrl: "https://www.starplus.com", platform: "Both" },
  { leagueId: 39, countryCode: "ar", broadcaster: "ESPN / Star+", streamUrl: "https://www.starplus.com", platform: "Both" },
  { leagueId: 39, countryCode: "de", broadcaster: "Sky Deutschland", platform: "TV" },
  { leagueId: 39, countryCode: "fr", broadcaster: "Canal+", platform: "Both" },
  { leagueId: 39, countryCode: "es", broadcaster: "DAZN / Movistar+", platform: "Both" },
  { leagueId: 39, countryCode: "it", broadcaster: "Sky Italia / NOW", platform: "Both" },
  { leagueId: 39, countryCode: "au", broadcaster: "Optus Sport", platform: "Streaming", streamUrl: "https://www.optus.com.au/sport" },
  { leagueId: 39, countryCode: "jp", broadcaster: "ABEMA / SPOTV", platform: "Streaming" },
  { leagueId: 39, countryCode: "sa", broadcaster: "SSN / SuperSport", platform: "Both" },
  { leagueId: 39, countryCode: "ng", broadcaster: "SuperSport / Showmax", platform: "Both" },

  // ─── La Liga (140) ─────────────────────────────────────────────────────
  { leagueId: 140, countryCode: "us", broadcaster: "ESPN+", streamUrl: "https://www.espn.com", platform: "Streaming" },
  { leagueId: 140, countryCode: "gb", broadcaster: "Premier Sports", platform: "Both" },
  { leagueId: 140, countryCode: "in", broadcaster: "Sports18 / JioCinema", streamUrl: "https://www.jiocinema.com", platform: "Both" },
  { leagueId: 140, countryCode: "br", broadcaster: "ESPN / Star+", streamUrl: "https://www.starplus.com", platform: "Both" },
  { leagueId: 140, countryCode: "ar", broadcaster: "ESPN / Star+", streamUrl: "https://www.starplus.com", platform: "Both" },
  { leagueId: 140, countryCode: "es", broadcaster: "Movistar+ / DAZN", platform: "Both" },
  { leagueId: 140, countryCode: "de", broadcaster: "DAZN", platform: "Streaming" },
  { leagueId: 140, countryCode: "fr", broadcaster: "beIN Sports", platform: "Both" },
  { leagueId: 140, countryCode: "it", broadcaster: "DAZN", platform: "Streaming" },

  // ─── Serie A (135) ────────────────────────────────────────────────────
  { leagueId: 135, countryCode: "us", broadcaster: "CBS / Paramount+", streamUrl: "https://www.paramountplus.com", platform: "Both" },
  { leagueId: 135, countryCode: "gb", broadcaster: "Premier Sports", platform: "Both" },
  { leagueId: 135, countryCode: "in", broadcaster: "Sports18 / JioCinema", streamUrl: "https://www.jiocinema.com", platform: "Both" },
  { leagueId: 135, countryCode: "it", broadcaster: "DAZN / Sky Italia", platform: "Both" },
  { leagueId: 135, countryCode: "de", broadcaster: "Sky Deutschland / ONE", platform: "Both" },
  { leagueId: 135, countryCode: "fr", broadcaster: "beIN Sports / Canal+", platform: "Both" },
  { leagueId: 135, countryCode: "br", broadcaster: "ESPN / Star+", streamUrl: "https://www.starplus.com", platform: "Both" },
  { leagueId: 135, countryCode: "au", broadcaster: "Stan Sport", platform: "Streaming" },

  // ─── Bundesliga (78) ─────────────────────────────────────────────────
  { leagueId: 78, countryCode: "us", broadcaster: "ESPN+", streamUrl: "https://www.espn.com", platform: "Streaming" },
  { leagueId: 78, countryCode: "gb", broadcaster: "Sky Sports", platform: "TV" },
  { leagueId: 78, countryCode: "de", broadcaster: "Sky Deutschland / DAZN", platform: "Both" },
  { leagueId: 78, countryCode: "in", broadcaster: "Sports18 / JioCinema", streamUrl: "https://www.jiocinema.com", platform: "Both" },
  { leagueId: 78, countryCode: "au", broadcaster: "Stan Sport", platform: "Streaming" },
  { leagueId: 78, countryCode: "fr", broadcaster: "beIN Sports", platform: "Both" },

  // ─── Ligue 1 (61) ───────────────────────────────────────────────────────
  { leagueId: 61, countryCode: "us", broadcaster: "beIN Sports / Fanatiz", platform: "Both" },
  { leagueId: 61, countryCode: "gb", broadcaster: "TNT Sports", platform: "Both" },
  { leagueId: 61, countryCode: "fr", broadcaster: "DAZN / Canal+", platform: "Both" },
  { leagueId: 61, countryCode: "br", broadcaster: "ESPN / Star+", streamUrl: "https://www.starplus.com", platform: "Both" },
  { leagueId: 61, countryCode: "in", broadcaster: "Sports18 / JioCinema", streamUrl: "https://www.jiocinema.com", platform: "Both" },

  // ─── Eredivisie (88) ────────────────────────────────────────────────────
  { leagueId: 88, countryCode: "us", broadcaster: "ESPN+", streamUrl: "https://www.espn.com", platform: "Streaming" },
  { leagueId: 88, countryCode: "gb", broadcaster: "Mola TV", platform: "Streaming" },

  // ─── Primeira Liga (94) ────────────────────────────────────────────────
  { leagueId: 94, countryCode: "us", broadcaster: "Fanatiz / GolTV", platform: "Both" },
  { leagueId: 94, countryCode: "br", broadcaster: "ESPN / Star+", streamUrl: "https://www.starplus.com", platform: "Both" },

  // ─── Serie A Brazil (71) ────────────────────────────────────────────────
  { leagueId: 71, countryCode: "br", broadcaster: "Globo / SporTV / Premiere", platform: "Both" },
  { leagueId: 71, countryCode: "us", broadcaster: "Paramount+", streamUrl: "https://www.paramountplus.com", platform: "Streaming" },

  // ─── Liga Profesional Argentina (128) ────────────────────────────────────
  { leagueId: 128, countryCode: "ar", broadcaster: "ESPN / Star+", streamUrl: "https://www.starplus.com", platform: "Both" },
  { leagueId: 128, countryCode: "us", broadcaster: "Paramount+", streamUrl: "https://www.paramountplus.com", platform: "Streaming" },

  // ─── MLS (253) ─────────────────────────────────────────────────────────
  { leagueId: 253, countryCode: "us", broadcaster: "Apple TV / MLS Season Pass", streamUrl: "https://tv.apple.com", platform: "Streaming" },
  { leagueId: 253, countryCode: "ca", broadcaster: "TSN / Apple TV", platform: "Both" },

  // ─── J1 League (98) ─────────────────────────────────────────────────────
  { leagueId: 98, countryCode: "jp", broadcaster: "DAZN Japan", platform: "Streaming" },

  // ─── Saudi Pro League (292) ─────────────────────────────────────────────
  { leagueId: 292, countryCode: "sa", broadcaster: "SSC / DAZN", platform: "Both" },

  // ─── UEFA Champions League (2) ─────────────────────────────────────────
  { leagueId: 2, countryCode: "us", broadcaster: "Paramount+ / TNT Sports", streamUrl: "https://www.paramountplus.com", platform: "Both" },
  { leagueId: 2, countryCode: "gb", broadcaster: "TNT Sports / ITV", platform: "Both" },
  { leagueId: 2, countryCode: "in", broadcaster: "Sony TEN / JioCinema", streamUrl: "https://www.jiocinema.com", platform: "Both" },
  { leagueId: 2, countryCode: "de", broadcaster: "Sky Deutschland / DAZN", platform: "Both" },
  { leagueId: 2, countryCode: "fr", broadcaster: "Canal+ / beIN Sports", platform: "Both" },
  { leagueId: 2, countryCode: "es", broadcaster: "Movistar+", platform: "TV" },
  { leagueId: 2, countryCode: "it", broadcaster: "Sky Italia / Amazon Prime", platform: "Both" },
  { leagueId: 2, countryCode: "br", broadcaster: "ESPN / Star+", streamUrl: "https://www.starplus.com", platform: "Both" },
  { leagueId: 2, countryCode: "au", broadcaster: "Stan Sport / Optus", platform: "Both" },
  { leagueId: 2, countryCode: "jp", broadcaster: "ABEMA", platform: "Streaming" },

  // ─── World Cup (1) ──────────────────────────────────────────────────────
  { leagueId: 1, countryCode: "us", broadcaster: "Fox / Telemundo", platform: "TV" },
  { leagueId: 1, countryCode: "gb", broadcaster: "BBC / ITV", platform: "TV" },
  { leagueId: 1, countryCode: "in", broadcaster: "Sports18 / JioCinema", streamUrl: "https://www.jiocinema.com", platform: "Both" },
  { leagueId: 1, countryCode: "br", broadcaster: "Globo / SporTV", platform: "TV" },
  { leagueId: 1, countryCode: "de", broadcaster: "ARD / ZDF / MagentaSport", platform: "TV" },
  { leagueId: 1, countryCode: "fr", broadcaster: "TF1 / beIN Sports", platform: "TV" },
  { leagueId: 1, countryCode: "ar", broadcaster: "TyC Sports / Public TV", platform: "TV" },

  // ─── European Championship (4) ──────────────────────────────────────────
  { leagueId: 4, countryCode: "us", broadcaster: "Fox / fuboTV", platform: "Both" },
  { leagueId: 4, countryCode: "gb", broadcaster: "BBC / ITV", platform: "TV" },
  { leagueId: 4, countryCode: "in", broadcaster: "Sony TEN / JioCinema", streamUrl: "https://www.jiocinema.com", platform: "Both" },

  // ─── Copa América (7) ───────────────────────────────────────────────────
  { leagueId: 7, countryCode: "us", broadcaster: "Fox / Univision / TUDN", platform: "TV" },
  { leagueId: 7, countryCode: "br", broadcaster: "Globo / SporTV", platform: "TV" },
  { leagueId: 7, countryCode: "ar", broadcaster: "TyC Sports / Public TV", platform: "TV" },
];

/** League IDs that have broadcaster data. */
export const LEAGUE_IDS_WITH_BROADCASTERS = [
  ...new Set(BROADCASTER_SEED.map((b) => b.leagueId)),
];
