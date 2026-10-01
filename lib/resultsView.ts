/**
 * Client-side helpers for the post-search results experience.
 * Pure functions so they are trivially testable and shared between the
 * results page and its components.
 *
 * NOTE: the Flight type carries one "price" per offer. For round trips the
 * providers quote the whole round trip, so `total` here = price.etb. The
 * breakdown (base/taxes/fees) is derived deterministically for display.
 */

import type { Flight, SearchResponse } from "./types";
import { lookupAirport } from "./airports";

// ---------- Formatting ----------

export function formatEtb(n: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function stopsLabel(stops: number): string {
  return stops === 0 ? "Non-stop" : stops === 1 ? "1 stop" : `${stops} stops`;
}

export function viaLabel(f: Flight): string {
  if (f.stops === 0 || !f.viaCities?.length) return stopsLabel(f.stops);
  return `${stopsLabel(f.stops)} · via ${f.viaCities.join(", ")}`;
}

/** "Tue, Sep 30" from a date-only ISO string (no TZ shifting). */
export function formatDayLabel(dateIso: string): string {
  const [y, m, d] = dateIso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function airportCity(code: string): string {
  return lookupAirport(code)?.city ?? code.toUpperCase();
}

// ---------- Search summary line ----------

export interface SearchSummary {
  originCity: string;
  originCode: string;
  destCity: string;
  destCode: string;
  dates: string;
  trip: string;
  passengers: string;
  cabin: string;
}

export function searchSummary(resp: SearchResponse): SearchSummary {
  const meta = resp.meta;
  const originCode = meta.origin ?? "";
  const destCode = meta.destination ?? "";
  const dep = meta.departureDate ?? "";
  const ret = meta.returnDate ?? null;

  const dates = ret
    ? `${formatDayLabel(dep)} – ${formatDayLabel(ret)}`
    : formatDayLabel(dep);

  const CABIN_LABEL: Record<string, string> = {
    economy: "Economy",
    premium_economy: "Premium economy",
    business: "Business",
    first: "First",
  };

  return {
    originCity: airportCity(originCode),
    originCode,
    destCity: airportCity(destCode),
    destCode,
    dates,
    trip: ret ? "Round trip" : "One way",
    passengers: `${meta.passengers ?? 1} ${meta.passengers === 1 ? "passenger" : "passengers"}`,
    cabin: CABIN_LABEL[meta.cabin ?? "economy"] ?? "Economy",
  };
}

// ---------- Sorting ----------

export type SortKey = "cheapest" | "fastest" | "best";

export function sortFlights(flights: Flight[], sort: SortKey): Flight[] {
  const arr = [...flights];
  if (sort === "fastest") {
    arr.sort(
      (a, b) =>
        a.durationMinutes - b.durationMinutes || a.price.usd - b.price.usd
    );
  } else if (sort === "best") {
    // Best: balanced score — normalized price + duration + stops.
    const cheapest = Math.min(...arr.map((f) => f.price.usd), 1);
    const priciest = Math.max(...arr.map((f) => f.price.usd), cheapest + 1);
    const fastest = Math.min(...arr.map((f) => f.durationMinutes), 1);
    const slowest = Math.max(...arr.map((f) => f.durationMinutes), fastest + 1);
    const score = (f: Flight) =>
      0.6 * ((f.price.usd - cheapest) / (priciest - cheapest)) +
      0.3 * ((f.durationMinutes - fastest) / (slowest - fastest)) +
      0.1 * Math.min(f.stops / 2, 1);
    arr.sort((a, b) => score(a) - score(b));
  } else {
    arr.sort(
      (a, b) => a.price.usd - b.price.usd || a.durationMinutes - b.durationMinutes
    );
  }
  return arr;
}

/** Flights that win each sort category, for the "Top pick" badge. */
export function bestFlightIds(flights: Flight[]): Record<SortKey, string | undefined> {
  const cheapest = sortFlights(flights, "cheapest")[0];
  const fastest = sortFlights(flights, "fastest")[0];
  const best = sortFlights(flights, "best")[0];
  return { cheapest: cheapest?.id, fastest: fastest?.id, best: best?.id };
}

// ---------- Filters ----------

export interface Filters {
  maxPrice: number; // ETB
  stops: Set<number>; // empty = any
  airlines: Set<string>; // empty = any
  depWindow: TimeWindow | null;
  arrWindow: TimeWindow | null;
  baggageOnly: boolean; // only flights with checked bag included
}

export type TimeWindow = "morning" | "afternoon" | "evening";

export const TIME_WINDOWS: Array<{ id: TimeWindow; label: string; range: string }> = [
  { id: "morning", label: "Morning", range: "00:00 – 11:59" },
  { id: "afternoon", label: "Midday", range: "12:00 – 17:59" },
  { id: "evening", label: "Evening", range: "18:00 – 23:59" },
];

export function hourOf(iso: string): number {
  return new Date(iso).getUTCHours();
}

export function inWindow(iso: string, w: TimeWindow | null): boolean {
  if (!w) return true;
  const h = hourOf(iso);
  if (w === "morning") return h < 12;
  if (w === "afternoon") return h >= 12 && h < 18;
  return h >= 18;
}

export const DEFAULT_FILTERS: Filters = {
  maxPrice: Number.MAX_SAFE_INTEGER,
  stops: new Set(),
  airlines: new Set(),
  depWindow: null,
  arrWindow: null,
  baggageOnly: false,
};

export function makeDefaultFilters(maxPrice?: number): Filters {
  return { ...DEFAULT_FILTERS, maxPrice: maxPrice ?? Number.MAX_SAFE_INTEGER };
}

export function applyFilters(flights: Flight[], f: Filters): Flight[] {
  return flights.filter((fl) => {
    if (f.maxPrice < Number.MAX_SAFE_INTEGER && fl.price.etb > f.maxPrice) return false;
    if (f.stops.size > 0) {
      if (!f.stops.has(fl.stops)) return false;
      if (f.stops.has(2) && fl.stops >= 2 && !f.stops.has(fl.stops)) return false;
    }
    if (f.airlines.size > 0 && !f.airlines.has(fl.airline)) return false;
    if (!inWindow(fl.departure, f.depWindow)) return false;
    if (f.arrWindow !== null && !inWindow(fl.arrival, f.arrWindow)) return false;
    if (f.baggageOnly && fl.baggageKg <= 0) return false;
    return true;
  });
}

// ---------- Price breakdown ----------

export interface PriceBreakdown {
  base: number;
  taxes: number;
  fees: number;
  total: number;
}

/**
 * Deterministic breakdown derived from the total (providers quote a total;
 * base/taxes/fees are a stable split for display). Round trip = whole-trip
 * total, as quoted by the providers.
 */
export function breakdownFor(f: Flight): PriceBreakdown {
  const total = Math.round(f.price.etb);
  const base = Math.round(total * 0.78);
  const taxes = Math.round(total * 0.17);
  const fees = total - base - taxes;
  return { base, taxes, fees, total };
}
