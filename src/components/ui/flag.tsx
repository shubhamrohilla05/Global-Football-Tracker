import { cn } from "@/lib/utils";

/**
 * Country flag display. Country data stored in the DB can carry a `flag` value
 * that is either an emoji, an image URL (API-Football serves SVGs), or nothing.
 * We also fall back to deriving a flag emoji from the country `code`.
 *
 * Codes follow API-Football's convention (lowercased alpha-2, plus legacy
 * names like "eng"/"scotland" for the UK home nations and "world").
 */

// UK home nations + non-alpha-2 codes need explicit emoji.
const SPECIAL_FLAGS: Record<string, string> = {
  world: "🌍",
  eng: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  england: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "gb-eng": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  scotland: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "gb-sct": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  wales: "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
  "gb-wls": "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
  "northern-ireland": "🇬🇧",
};

/**
 * Free-text nationality names (API-Football style, e.g. "Spain", "the
 * Netherlands") → an ISO alpha-2 code (or a special-flag key) so we can derive
 * a flag emoji. Covers the nationalities present in the synced squads.
 */
const NATIONALITY_CODES: Record<string, string> = {
  spain: "es", england: "eng", france: "fr", argentina: "ar", brazil: "br",
  "the netherlands": "nl", netherlands: "nl", portugal: "pt", morocco: "ma",
  germany: "de", belgium: "be", uruguay: "uy", nigeria: "ng", sweden: "se",
  scotland: "scotland", ireland: "ie", senegal: "sn", wales: "wales",
  italy: "it", "côte d'ivoire": "ci", "cote d'ivoire": "ci", "ivory coast": "ci",
  "the united states": "us", "united states": "us", usa: "us", denmark: "dk",
  ukraine: "ua", ghana: "gh", serbia: "rs", colombia: "co", switzerland: "ch",
  cameroon: "cm", norway: "no", "northern ireland": "northern-ireland",
  croatia: "hr", romania: "ro", "the democratic republic of the congo": "cd",
  "dr congo": "cd", mexico: "mx", greece: "gr", turkey: "tr", canada: "ca",
  japan: "jp", austria: "at", "south korea": "kr", hungary: "hu",
  "the czech republic": "cz", "czech republic": "cz", poland: "pl",
  ecuador: "ec", mali: "ml", jamaica: "jm", "the dominican republic": "do",
  zimbabwe: "zw", egypt: "eg", "burkina faso": "bf", guinea: "gn",
  venezuela: "ve", paraguay: "py", "new zealand": "nz", benin: "bj",
  chile: "cl", angola: "ao", slovenia: "si", "guinea-bissau": "gw",
  "the gambia": "gm", gambia: "gm", finland: "fi", albania: "al",
  algeria: "dz", slovakia: "sk", israel: "il", suriname: "sr", iceland: "is",
  australia: "au", panama: "pa", bulgaria: "bg", georgia: "ge", haiti: "ht",
  "trinidad and tobago": "tt", "sierra leone": "sl", guadeloupe: "gp",
  niger: "ne", "the people's republic of china": "cn", china: "cn",
  lithuania: "lt", togo: "tg", kenya: "ke", peru: "pe", tunisia: "tn",
  "south africa": "za", estonia: "ee", "north macedonia": "mk",
  "equatorial guinea": "gq", "cape verde": "cv", latvia: "lv", cuba: "cu",
  uzbekistan: "uz", honduras: "hn", russia: "ru", mozambique: "mz",
  mauritania: "mr", "curaçao": "cw", curacao: "cw",
  // Additional national teams (World Cup coverage).
  "bosnia & herzegovina": "ba", "bosnia and herzegovina": "ba", bosnia: "ba",
  iran: "ir", iraq: "iq", jordan: "jo", qatar: "qa",
  "saudi arabia": "sa", saudia: "sa",
};

/** Resolve a flag emoji from a free-text nationality name, or null. */
export function flagForNationality(nationality?: string | null): string | null {
  if (!nationality) return null;
  const code = NATIONALITY_CODES[nationality.toLowerCase().trim()];
  return code ? flagEmoji(code) : null;
}

/** Convert a 2-letter ISO country code to its flag emoji, or null if not 2 chars. */
function codeToEmoji(code: string): string | null {
  if (code.length !== 2 || !/^[a-z]{2}$/i.test(code)) return null;
  const base = 0x1f1e6;
  const A = "a".charCodeAt(0);
  return String.fromCodePoint(
    base + (code[0].toLowerCase().charCodeAt(0) - A),
    base + (code[1].toLowerCase().charCodeAt(0) - A),
  );
}

/** Resolve the best emoji for a country, or null when we can't. */
export function flagEmoji(code?: string | null, flag?: string | null): string | null {
  // A stored emoji (not a URL) wins.
  if (flag && !/^https?:\/\//i.test(flag) && flag.trim().length <= 8) return flag;
  if (!code) return null;
  const key = code.toLowerCase().trim();
  return SPECIAL_FLAGS[key] ?? codeToEmoji(key);
}

interface FlagProps {
  code?: string | null;
  flag?: string | null;
  /** Accessible label, e.g. the country name. */
  name?: string;
  /** Font size in px for emoji rendering (also sizes the image height). */
  size?: number;
  className?: string;
}

export function Flag({ code, flag, name, size = 18, className }: FlagProps) {
  const emoji = flagEmoji(code, flag);

  if (emoji) {
    return (
      <span
        className={cn("inline-block leading-none", className)}
        style={{ fontSize: size }}
        role="img"
        aria-label={name ? `${name} flag` : "flag"}
      >
        {emoji}
      </span>
    );
  }

  // Image URL fallback (API-Football SVG flags).
  if (flag && /^https?:\/\//i.test(flag)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={flag}
        alt={name ? `${name} flag` : "flag"}
        className={cn("inline-block rounded-[3px] object-cover", className)}
        style={{ height: size, width: size * 1.4 }}
        loading="lazy"
      />
    );
  }

  // Last resort: a neutral globe glyph.
  return (
    <span
      className={cn("inline-block leading-none", className)}
      style={{ fontSize: size }}
      role="img"
      aria-label="international"
    >
      🌐
    </span>
  );
}
