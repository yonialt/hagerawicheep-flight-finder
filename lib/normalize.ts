import type { Flight, ProviderId, CabinClass } from "./types";

/**
 * Normalize provider-specific responses into the unified Flight shape.
 * Field maps:
 *  - Duffel:  offer.total_amount ("580.40"), slices[].segments[].departing_at/arriving_at
 *  - Amadeus: offer.price.total ("250.00"), itineraries[].segments[].departure/arrival .at
 *  - Kiwi:    offer.price ("450"), route[].local_departure/local_arrival (unix seconds)
 *
 * Each mapper is defensive: returns null for anything unusable so one bad
 * record never breaks a whole provider's results.
 */

function num(v: unknown, fallback = 0): number {
  const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function toIso(v: unknown, fallback: Date): string {
  if (typeof v === "string" && !Number.isNaN(new Date(v).getTime())) return new Date(v).toISOString();
  return fallback.toISOString();
}

function cabinFrom(raw: string | undefined): CabinClass {
  const c = (raw ?? "").toLowerCase();
  if (c.includes("business")) return "business";
  if (c.includes("premium")) return "premium_economy";
  if (c.includes("first")) return "first";
  return "economy";
}

function minutesBetween(fromIso: string, toIso: string): number {
  const ms = new Date(toIso).getTime() - new Date(fromIso).getTime();
  return Math.max(Math.round(ms / 60000), 0);
}

// ---------- Duffel ----------

export interface DuffelOffer {
  id?: string;
  total_amount?: string | number;
  total_currency?: string;
  owner?: { name?: string; iata_code?: string };
  slices?: Array<{
    segments?: Array<{
      departing_at?: string;
      arriving_at?: string;
      carrier?: { iata_code?: string; name?: string };
      marketing_carrier_flight_number?: string;
    }>;
  }>;
  conditions?: { change_before_departure?: { allowed_without_penalty?: boolean } };
}

export function normalizeDuffel(offers: DuffelOffer[], rateEtb: number): Flight[] {
  const out: Flight[] = [];
  for (const o of offers ?? []) {
    const first = o.slices?.[0];
    const segs = first?.segments ?? [];
    if (segs.length === 0) continue;
    const dep = toIso(segs[0].departing_at, new Date());
    const arr = toIso(segs[segs.length - 1].arriving_at, new Date());
    const usd = num(o.total_amount);
    if (usd <= 0) continue;
    out.push({
      id: `duffel-${o.id ?? crypto.randomUUID()}`,
      airline: o.owner?.name ?? "Airline",
      airlineCode: o.owner?.iata_code ?? "XX",
      price: { usd, etb: Math.round(usd * rateEtb * 100) / 100, currency: o.total_currency ?? "USD" },
      departure: dep,
      arrival: arr,
      durationMinutes: minutesBetween(dep, arr),
      stops: Math.max(segs.length - 1, 0),
      cabin: "economy",
      baggageKg: 23,
      bookingUrl: `https://www.duffel.com/book/${o.id ?? ""}`,
      provider: "duffel",
      flightNumber:
        segs[0].marketing_carrier_flight_number && o.owner?.iata_code
          ? `${o.owner.iata_code} ${segs[0].marketing_carrier_flight_number}`
          : undefined,
    });
  }
  return out;
}

// ---------- Amadeus ----------

export interface AmadeusOffer {
  id?: string;
  price?: { total?: string | number; currency?: string };
  itineraries?: Array<{
    duration?: string; // e.g. "PT6H15M"
    segments?: Array<{
      departure?: { at?: string };
      arrival?: { at?: string };
      carrierCode?: string;
      number?: string;
    }>;
  }>;
  travelerPricings?: Array<{ fareDetailsBySegment?: Array<{ cabin?: string; includedCheckedBags?: { weight?: number } }> }>;
}

export function parseIsoDuration(d: string | undefined): number {
  // "PT6H15M" -> 375
  if (!d) return 0;
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?$/i.exec(d);
  if (!m) return 0;
  return (parseInt(m[1] ?? "0", 10) * 60) + parseInt(m[2] ?? "0", 10);
}

export function normalizeAmadeus(offers: AmadeusOffer[], rateEtb: number): Flight[] {
  const out: Flight[] = [];
  for (const o of offers ?? []) {
    const itin = o.itineraries?.[0];
    const segs = itin?.segments ?? [];
    if (segs.length === 0) continue;
    const dep = toIso(segs[0].departure?.at, new Date());
    const arr = toIso(segs[segs.length - 1].arrival?.at, new Date());
    const usd = num(o.price?.total);
    if (usd <= 0) continue;
    const fare = o.travelerPricings?.[0]?.fareDetailsBySegment?.[0];
    const carrier = segs[0].carrierCode ?? "XX";
    out.push({
      id: `amadeus-${o.id ?? crypto.randomUUID()}`,
      airline: carrier, // Amadeus self-service returns codes; resolve via airline list later if needed
      airlineCode: carrier,
      price: { usd, etb: Math.round(usd * rateEtb * 100) / 100, currency: o.price?.currency ?? "USD" },
      departure: dep,
      arrival: arr,
      durationMinutes: parseIsoDuration(itin?.duration) || minutesBetween(dep, arr),
      stops: Math.max(segs.length - 1, 0),
      cabin: cabinFrom(fare?.cabin),
      baggageKg: fare?.includedCheckedBags?.weight ?? 23,
      bookingUrl: "", // filled by provider with deep link
      provider: "amadeus",
      flightNumber: segs[0].number ? `${carrier} ${segs[0].number}` : undefined,
    });
  }
  return out;
}

// ---------- Kiwi (Tequila) ----------

export interface KiwiOffer {
  id?: string;
  price?: number | string;
  airline?: string;
  deep_link?: string;
  route?: Array<{
    airline?: string;
    local_departure?: number; // unix seconds
    local_arrival?: number;
    flyTo?: string;
    flight_no?: string;
  }>;
}

export function normalizeKiwi(offers: KiwiOffer[], rateEtb: number): Flight[] {
  const out: Flight[] = [];
  for (const o of offers ?? []) {
    const route = o.route ?? [];
    if (route.length === 0 || typeof o.price !== "number") continue;
    const dep = new Date((route[0].local_departure ?? 0) * 1000).toISOString();
    const arr = new Date((route[route.length - 1].local_arrival ?? 0) * 1000).toISOString();
    const usd = o.price;
    const code = route[0].airline ?? o.airline ?? "XX";
    out.push({
      id: `kiwi-${o.id ?? crypto.randomUUID()}`,
      airline: code,
      airlineCode: code,
      price: { usd, etb: Math.round(usd * rateEtb * 100) / 100, currency: "USD" },
      departure: dep,
      arrival: arr,
      durationMinutes: minutesBetween(dep, arr),
      stops: Math.max(route.length - 1, 0),
      cabin: "economy",
      baggageKg: 0,
      bookingUrl: o.deep_link ?? "",
      provider: "kiwi",
      flightNumber: route[0].flight_no ? `${code} ${route[0].flight_no}` : undefined,
    });
  }
  return out;
}

export function normalizeProvider(
  provider: ProviderId,
  raw: unknown[],
  rateEtb: number
): Flight[] {
  switch (provider) {
    case "duffel":
      return normalizeDuffel(raw as DuffelOffer[], rateEtb);
    case "amadeus":
      return normalizeAmadeus(raw as AmadeusOffer[], rateEtb);
    case "kiwi":
      return normalizeKiwi(raw as KiwiOffer[], rateEtb);
    default:
      return [];
  }
}
