export interface Airport {
  code: string;
  city: string;
  country: string;
  image?: string;
}

// Ethiopia domestic airports first, then popular international ones.
export const AIRPORTS: Airport[] = [
  { code: "ADD", city: "Addis Ababa", country: "Ethiopia", image: "/images/addis-ababa.jpg" },
  { code: "HBD", city: "Hawassa", country: "Ethiopia", image: "/images/hawassa.jpg" },
  { code: "BJR", city: "Bahir Dar", country: "Ethiopia" },
  { code: "MQX", city: "Mekelle", country: "Ethiopia" },
  { code: "GDQ", city: "Gondar", country: "Ethiopia" },
  { code: "DIR", city: "Dire Dawa", country: "Ethiopia" },
  { code: "AXU", city: "Axum", country: "Ethiopia" },
  { code: "LJR", city: "Lalibela", country: "Ethiopia" },
  { code: "ASO", city: "Arba Minch", country: "Ethiopia" },
  { code: "JIM", city: "Jimma", country: "Ethiopia" },
  { code: "DXB", city: "Dubai", country: "UAE", image: "/images/dubai.jpg" },
  { code: "NBO", city: "Nairobi", country: "Kenya" },
  { code: "JKA", city: "Jeddah", country: "Saudi Arabia" },
  { code: "IST", city: "Istanbul", country: "Turkiye" },
  { code: "CAI", city: "Cairo", country: "Egypt" },
  { code: "JFK", city: "New York", country: "USA", image: "/images/new-york.jpg" },
  { code: "IAD", city: "Washington", country: "USA" },
  { code: "LHR", city: "London", country: "UK" },
  { code: "FRA", city: "Frankfurt", country: "Germany" },
  { code: "BOM", city: "Mumbai", country: "India" },
  { code: "PEK", city: "Beijing", country: "China" },
  { code: "CPT", city: "Cape Town", country: "South Africa" },
];

const BY_CODE = new Map(AIRPORTS.map((a) => [a.code.toUpperCase(), a]));

export function lookupAirport(code: string): Airport | undefined {
  return BY_CODE.get(code.trim().toUpperCase());
}

export function airportCity(code: string): string {
  return lookupAirport(code)?.city ?? code.toUpperCase();
}

export function airportImage(code: string): string | null {
  return lookupAirport(code)?.image ?? null;
}

/** City photos shipped in /public/images (the same pool the hero cycles). */
const FALLBACK_IMAGES = [
  "/images/addis-ababa.jpg",
  "/images/dubai.jpg",
  "/images/new-york.jpg",
  "/images/hawassa.jpg",
];

/**
 * Background photo for an airport: its own city photo when we have one,
 * otherwise a deterministic pick from the photo pool (stable per code, so
 * server and client render the same choice — no hydration mismatch).
 */
export function airportBackgroundImage(code: string): string {
  const own = lookupAirport(code)?.image;
  if (own) return own;
  const seed = code || "ADD";
  const sum = [...seed].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return FALLBACK_IMAGES[sum % FALLBACK_IMAGES.length];
}

const ETHIOPIAN_AIRPORTS = new Set(
  AIRPORTS.filter((a) => a.country === "Ethiopia").map((a) => a.code)
);

export function isDomesticRoute(origin: string, destination: string): boolean {
  return ETHIOPIAN_AIRPORTS.has(origin.toUpperCase()) && ETHIOPIAN_AIRPORTS.has(destination.toUpperCase());
}

export function routeTypeFor(origin: string, destination: string): "domestic" | "international" {
  return isDomesticRoute(origin, destination) ? "domestic" : "international";
}

/**
 * Resolve free-text input ("Dubai", "dxb", "Addis", "addis ababa") to an
 * IATA code. Order: exact IATA code → exact city name → known aliases →
 * unique prefix match. Returns null when nothing matches (validation error).
 */
const CITY_CODE_RE = /\((\w{3})\)/;

export function resolveCityToCode(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;

  // Accept the "City (CODE)" format shown in the autocomplete dropdown
  // (e.g. "Addis Ababa (ADD)") by preferring the parenthesised code.
  const inParens = CITY_CODE_RE.exec(trimmed);
  if (inParens) {
    const code = inParens[1].toUpperCase();
    if (BY_CODE.has(code)) return code;
  }

  const q = trimmed.toUpperCase();

  // 1. Already an IATA code we know.
  if (BY_CODE.has(q)) return q;

  // 2. Exact city name ("DUBAI" → DXB).
  const exact = AIRPORTS.find((a) => a.city.toUpperCase() === q);
  if (exact) return exact.code;

  // 3. Common aliases (colloquial/local spellings, full country names).
  const ALIASES: Record<string, string> = {
    "ADDIS": "ADD",
    "ADDIS ABABA": "ADD",
    "HAWASSA": "HBD",
    "BAHIR DAR": "BJR",
    "BAHIRDAR": "BJR",
    "MEKELLE": "MQX",
    "MEKELE": "MQX",
    "GONDAR": "GDQ",
    "DIRE DAWA": "DIR",
    "AXUM": "AXU",
    "AKSUM": "AXU",
    "LALIBELA": "LJR",
    "ARBA MINCH": "ASO",
    "JIMMA": "JIM",
    "ABU DHABI": "DXB",
    "DUBAI": "DXB",
    "NAIROBI": "NBO",
    "JEDDAH": "JKA",
    "JEDDA": "JKA",
    "ISTANBUL": "IST",
    "CAIRO": "CAI",
    "NEW YORK": "JFK",
    "NYC": "JFK",
    "WASHINGTON": "IAD",
    "LONDON": "LHR",
    "FRANKFURT": "FRA",
    "MUMBAI": "BOM",
    "BEIJING": "PEK",
    "CAPE TOWN": "CPT",
  };
  if (ALIASES[q]) return ALIASES[q];

  // 4. Country name ("Kenya" → NBO), only when it maps to exactly one
  //    airport in the list ("USA" or "Ethiopia" stay ambiguous → null).
  const inCountry = AIRPORTS.filter((a) => a.country.toUpperCase() === q);
  if (inCountry.length === 1) return inCountry[0].code;

  // 5. Prefix match ("ADDIS A" → ADD), only when unambiguous.
  const hits = AIRPORTS.filter(
    (a) => a.city.toUpperCase().startsWith(q) || a.code.startsWith(q)
  );
  if (hits.length === 1) return hits[0].code;

  return null;
}
