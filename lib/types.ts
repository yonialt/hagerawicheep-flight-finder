export type ProviderId = "demo" | "duffel" | "amadeus" | "kiwi" | "local_agent";

export type CabinClass = "economy" | "premium_economy" | "business" | "first";

export type RouteType = "domestic" | "international";

export interface Flight {
  id: string;
  airline: string;
  airlineCode: string;
  price: { usd: number; etb: number; currency: string };
  departure: string; // ISO timestamp
  arrival: string; // ISO timestamp
  durationMinutes: number;
  stops: number;
  cabin: CabinClass;
  baggageKg: number;
  bookingUrl: string;
  provider: ProviderId;

  /** Display flight number, e.g. "ET 302". Optional: providers that don't
   *  supply one fall back to "—" in the UI. */
  flightNumber?: string;
  /** Return leg (round trips): mirrored shape of the outbound fields. */
  returnDeparture?: string; // ISO timestamp
  returnArrival?: string; // ISO timestamp
  returnDurationMinutes?: number;
  returnStops?: number;
  /** Stop cities when known, e.g. ["Nairobi"]. Empty/undefined for non-stop. */
  viaCities?: string[];
}

export interface SearchRequest {
  origin: string; // IATA code, e.g. ADD
  destination: string; // IATA code, e.g. DXB
  departureDate: string; // YYYY-MM-DD
  returnDate?: string | null;
  passengers: number;
  sortBy?: "price" | "duration" | "stops";
  cabin?: CabinClass;
}

export interface SearchMeta {
  searchId: string;
  totalResults: number;
  routeType: RouteType;
  cached: boolean;
  cachedUntil: string | null;
  providersQueried: ProviderId[];
  providersFailed: ProviderId[];

  /** Echo of the query the user ran, so the results page can show
   *  "Addis Ababa → Dubai · Sep 30 – Oct 10 · Round trip · 1 passenger"
   *  without guessing from the flight list. */
  origin?: string;
  destination?: string;
  departureDate?: string;
  returnDate?: string | null;
  passengers?: number;
  cabin?: CabinClass;
}

export interface SearchResponse {
  results: Flight[];
  meta: SearchMeta;
}

export interface RouteInfo {
  origin: string;
  destination: string;
  routeType: RouteType;
}

/**
 * Supporting travel info for a destination is defined in lib/tripInfo.ts
 * (hotel, car, eSIM, visa, currency, Ethiopian restaurants) and rendered on
 * flight cards (short snapshots) and the Trip Details page (full sections).
 * All of that data is sample/demo data, never live availability.
 */

export interface PopularRoute {
  destinationCode: string;
  city: string;
  country: string;
  image: string | null;
  routeType: RouteType;
  priceEtb: number;
  priceUsd: number;
  airlineCode: string;
  capturedAt: string;
}
