import type { Flight, SearchRequest, ProviderId } from "../types";

/**
 * Demo provider — deterministic pseudo-random fares so the app works end-to-end
 * with zero API keys. The generator is seeded from route+date, so the same
 * search always returns the same flights (cacheable, testable).
 *
 * Post-search experience: each offer now carries a return leg (when the
 * search is a round trip), a display flight number and stop cities, so the
 * results page can show full itineraries and a price breakdown without any
 * extra API calls.
 */

const AIRLINES = [
  { code: "ET", name: "Ethiopian Airlines" },
  { code: "TK", name: "Turkish Airlines" },
  { code: "QR", name: "Qatar Airways" },
  { code: "EK", name: "Emirates" },
  { code: "SV", name: "Saudia" },
  { code: "KQ", name: "Kenya Airways" },
  { code: "MS", name: "EgyptAir" },
];

/** Plausible connection hubs per airline, used to name stop cities. */
const HUBS: Record<string, string> = {
  ET: "Addis Ababa",
  TK: "Istanbul",
  QR: "Doha",
  EK: "Dubai",
  SV: "Jeddah",
  KQ: "Nairobi",
  MS: "Cairo",
};

/** Typical aircraft per airline for the detail modal. */
const AIRCRAFT: Record<string, string> = {
  ET: "Boeing 737 MAX 8",
  TK: "Airbus A321neo",
  QR: "Boeing 787-9",
  EK: "Boeing 777-300ER",
  SV: "Airbus A320neo",
  KQ: "Boeing 787-8",
  MS: "Boeing 737-800",
};

// Deterministic hash (FNV-1a) so results are stable per route+date.
function hash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

function makeRng(seed: string): () => number {
  let state = hash(seed);
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

/** Flight number 3-digit, 100–899 so "ET 302"-style labels look real. */
function flightNumber(rng: () => number, code: string): string {
  return `${code} ${100 + Math.floor(rng() * 800)}`;
}

function pickViaCities(rng: () => number, stops: number, hub: string): string[] {
  if (stops === 0) return [];
  if (stops === 1) return [hub];
  // 2 stops: hub plus one neighbouring hub.
  const others = Object.values(HUBS).filter((h) => h !== hub);
  return [hub, others[Math.floor(rng() * others.length)]];
}

export async function fetchDemoFlights(req: SearchRequest): Promise<Flight[]> {
  const rng = makeRng(`${req.origin}${req.destination}${req.departureDate}`);
  const count = 6 + Math.floor(rng() * 5); // 6–10 offers, enough to filter

  const flights: Flight[] = [];
  for (let i = 0; i < count; i++) {
    const airline = AIRLINES[Math.floor(rng() * AIRLINES.length)];
    const stops = rng() < 0.5 ? 0 : rng() < 0.8 ? 1 : 2;
    const durationMinutes = 120 + Math.floor(rng() * 300) + stops * 90;
    const depHour = Math.floor(rng() * 24);
    const depMin = Math.floor(rng() * 60);

    const departure = new Date(`${req.departureDate}T${String(depHour).padStart(2, "0")}:${String(depMin).padStart(2, "0")}:00Z`);
    const arrival = new Date(departure.getTime() + durationMinutes * 60000);

    const usd = Math.round(
      (80 + rng() * 420 + stops * 60 + req.passengers * 10) * 100
    ) / 100;

    const flight: Flight = {
      id: `demo-${req.origin}-${req.destination}-${req.departureDate}-${i}`,
      airline: airline.name,
      airlineCode: airline.code,
      price: { usd, etb: 0, currency: "USD" },
      departure: departure.toISOString(),
      arrival: arrival.toISOString(),
      durationMinutes,
      stops,
      cabin: "economy",
      baggageKg: 23,
      bookingUrl: `https://www.ethiopianairlines.com?from=${req.origin}&to=${req.destination}&date=${req.departureDate}`,
      provider: "demo",
      flightNumber: flightNumber(rng, airline.code),
      viaCities: pickViaCities(rng, stops, HUBS[airline.code] ?? "Addis Ababa"),
    };

    // Round trips get a mirrored return leg departing late afternoon.
    if (req.returnDate) {
      const retDep = new Date(`${req.returnDate}T${String(14 + Math.floor(rng() * 6)).padStart(2, "0")}:${String(Math.floor(rng() * 60)).padStart(2, "0")}:00Z`);
      const retStops = stops;
      const retDuration = durationMinutes + Math.floor(rng() * 40);
      flight.returnDeparture = retDep.toISOString();
      flight.returnArrival = new Date(retDep.getTime() + retDuration * 60000).toISOString();
      flight.returnDurationMinutes = retDuration;
      flight.returnStops = retStops;
    }

    flights.push(flight);
  }

  return flights;
}

export const DEMO_PROVIDER: ProviderId = "demo";
