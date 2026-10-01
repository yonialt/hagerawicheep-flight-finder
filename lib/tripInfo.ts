/**
 * Trip information — supporting travel data for a destination, shown as short
 * snapshots on flight cards and as full sections on the Trip Details page.
 *
 * ⚠️ ALL DATA HERE IS SAMPLE / DEMO. Nothing is live availability, live
 * pricing, or live visa/currency info. Every UI surface that renders this
 * data must keep a "sample data" label visible and must NEVER present it as
 * live information or as official visa advice.
 */

import { lookupAirport } from "./airports";

// ---------- Shapes ----------

export interface TripHotelInfo {
  name: string;
  area: string;
  rating: number;
  pricePerNightEtb: number;
  /** Extra rows revealed by "View details". */
  extras: string[];
}

export interface TripCarInfo {
  company: string;
  car: string;
  pickup: string;
  pricePerDayEtb: number;
  extras: string[];
}

export interface TripEsimInfo {
  provider: string;
  /** Short data label, e.g. "10GB". */
  dataLabel: string;
  validityDays: number;
  priceEtb: number;
  extras: string[];
}

export interface TripVisaInfo {
  destination: string;
  /** Short chip line for the flight card, e.g. "eVisa guide". */
  short: string;
  /** One-sentence status for the Trip Details page. */
  requirement: string;
  extras: string[];
  /** Official source when we can point at a real government portal. */
  sourceLabel?: string;
  sourceUrl?: string;
}

export interface TripCurrencyInfo {
  code: string;
  name: string;
  /** e.g. "1 AED ≈ 42.8 ETB". Undefined when we don't quote a sample rate. */
  sampleRateLabel?: string;
  /** e.g. "ETB 10,000 ≈ AED 234". */
  sampleConversionLabel?: string;
  extras: string[];
}

export interface TripRestaurantInfo {
  name: string;
  location: string;
  rating: number;
  /** Approximate price band, e.g. "ETB 1,200 – 2,000 / meal". */
  priceCategory: string;
}

export interface TripInfoBundle {
  destinationCode: string;
  city: string;
  /** True when we have curated copy for this destination (vs. generic fallback). */
  curated: boolean;
  hotel: TripHotelInfo;
  car: TripCarInfo;
  esim: TripEsimInfo;
  visa: TripVisaInfo;
  currency: TripCurrencyInfo;
  restaurants: TripRestaurantInfo[];
  /** Sample estimate for meals & local transport for the whole trip (ETB). */
  otherCostsEtb: number;
}

// ---------- Curated destinations (sample data) ----------

const DXB: TripInfoBundle = {
  destinationCode: "DXB",
  city: "Dubai",
  curated: true,
  hotel: {
    name: "Aurora Deira Hotel",
    area: "Deira, Dubai",
    rating: 4.4,
    pricePerNightEtb: 4200,
    extras: [
      "About 8 minutes from DXB by taxi",
      "Free cancellation on most rooms",
      "Breakfast available for ≈ ETB 600",
    ],
  },
  car: {
    company: "Gulfrent Cars",
    car: "Toyota Corolla (economy)",
    pickup: "Dubai Intl (DXB) · arrivals desk",
    pricePerDayEtb: 3100,
    extras: [
      "Ethiopian license + passport, or IDP",
      "Refundable deposit ≈ ETB 8,000 (card hold)",
      "Free cancellation up to 48 hours",
    ],
  },
  esim: {
    provider: "Airalo (sample)",
    dataLabel: "10GB",
    validityDays: 30,
    priceEtb: 900,
    extras: [
      "QR delivered by email — scan on arrival",
      "Data-only: calls via WhatsApp / Telegram",
      "Top-up packs from ≈ ETB 450",
    ],
  },
  visa: {
    destination: "United Arab Emirates",
    short: "eVisa guide",
    requirement: "Visa typically required for Ethiopian passport holders",
    extras: [
      "Passport valid 6+ months",
      "Return ticket + hotel booking",
      "Processing: 3–5 working days (typical)",
    ],
    sourceLabel: "UAE ICP — official portal",
    sourceUrl: "https://icp.gov.ae",
  },
  currency: {
    code: "AED",
    name: "UAE Dirham",
    sampleRateLabel: "1 AED ≈ 42.8 ETB",
    sampleConversionLabel: "ETB 10,000 ≈ AED 234",
    extras: [
      "Exchange houses in Deira usually beat airport kiosks",
      "Cards widely accepted; carry cash for taxis and souks",
    ],
  },
  restaurants: [
    { name: "Abyssinia Restaurant", location: "Deira", rating: 4.5, priceCategory: "ETB 1,200 – 2,000 / meal" },
    { name: "Habesha Restaurant", location: "Al Rigga", rating: 4.3, priceCategory: "ETB 900 – 1,600 / meal" },
    { name: "Little Ethiopia", location: "Al Sabkha", rating: 4.1, priceCategory: "Under ETB 900 / meal" },
  ],
  otherCostsEtb: 4500,
};

const IST: TripInfoBundle = {
  destinationCode: "IST",
  city: "Istanbul",
  curated: true,
  hotel: {
    name: "Sultan Suites Boutique",
    area: "Sultanahmet, Istanbul",
    rating: 4.5,
    pricePerNightEtb: 3800,
    extras: [
      "Walking distance to the Blue Mosque",
      "Free cancellation on most rooms",
      "Airport transfer available on request",
    ],
  },
  car: {
    company: "Bosphorus Rent a Car",
    car: "Fiat Egea (economy)",
    pickup: "Istanbul Airport (IST) · meet & greet",
    pricePerDayEtb: 2900,
    extras: [
      "Ethiopian license + passport, or IDP",
      "Best for day trips — Şile, Princes' Islands",
      "In the city, tram + Istanbulkart is faster",
    ],
  },
  esim: {
    provider: "Turkcell Tourist (sample)",
    dataLabel: "15GB",
    validityDays: 30,
    priceEtb: 1100,
    extras: [
      "Activate by scanning the QR on arrival",
      "Passport registration required",
      "Top-up in any Turkcell store",
    ],
  },
  visa: {
    destination: "Türkiye",
    short: "eVisa guide",
    requirement: "eVisa available — check eligibility before booking",
    extras: [
      "Passport valid 150+ days",
      "Return ticket + accommodation proof",
      "Official portal only — beware lookalike sites",
    ],
    sourceLabel: "Türkiye eVisa — official portal",
    sourceUrl: "https://www.evisa.gov.tr/en/",
  },
  currency: {
    code: "TRY",
    name: "Turkish Lira",
    sampleRateLabel: "1 TRY ≈ 4.6 ETB",
    sampleConversionLabel: "ETB 10,000 ≈ TRY 2,170",
    extras: [
      "Authorized exchange offices (döviz) give better rates than hotels",
      "Cards accepted almost everywhere; contactless is standard",
    ],
  },
  restaurants: [
    { name: "Habesha Restaurant", location: "Aksaray", rating: 4.4, priceCategory: "ETB 900 – 1,500 / meal" },
    { name: "Axum Cafe", location: "Fatih", rating: 4.2, priceCategory: "ETB 700 – 1,200 / meal" },
  ],
  otherCostsEtb: 3800,
};

// ---------- Generic fallback (any destination) ----------

function generic(destCode: string): TripInfoBundle {
  const code = destCode.toUpperCase();
  const city = lookupAirport(code)?.city ?? code;
  return {
    destinationCode: code,
    city,
    curated: false,
    hotel: {
      name: "Central stays",
      area: `City centre, ${city}`,
      rating: 4.2,
      pricePerNightEtb: 3600,
      extras: [
        "Sample range — compare on booking platforms",
        "Staying near the centre keeps transport cheap",
      ],
    },
    car: {
      company: "Airport desk rental (sample)",
      car: "Economy class",
      pickup: `${city} airport · arrivals hall`,
      pricePerDayEtb: 3000,
      extras: [
        "Ethiopian license + passport, or IDP",
        "Check insurance excess before booking",
      ],
    },
    esim: {
      provider: "Travel eSIM (sample)",
      dataLabel: "10GB",
      validityDays: 30,
      priceEtb: 1000,
      extras: [
        "Buy before departure or at an arrivals kiosk",
        "Passport needed for registration in most countries",
      ],
    },
    visa: {
      destination: lookupAirport(code)?.country ?? city,
      short: "Info available",
      requirement: "Entry requirements depend on your passport",
      extras: [
        "Check visa-free, eVisa or embassy paths",
        "Passport validity, return ticket and accommodation are commonly asked for",
      ],
    },
    currency: {
      code: "Local currency",
      name: `Money in ${city}`,
      extras: [
        "Exchange a small amount on arrival and compare kiosk rates",
        "Notify your bank before travel",
      ],
    },
    restaurants: [
      {
        name: "Ethiopian restaurants",
        location: city,
        rating: 4.3,
        priceCategory: "Search \"Ethiopian restaurant\" + district name",
      },
    ],
    otherCostsEtb: 3000,
  };
}

/** Deterministic bundle per destination code. */
export function tripInfoFor(destCode: string): TripInfoBundle {
  const code = (destCode || "").toUpperCase();
  if (code === "DXB") return DXB;
  if (code === "IST") return IST;
  return generic(code);
}

// ---------- Flight-card snapshots (six short items) ----------

export interface TripSnapshot {
  key: "hotel" | "car" | "esim" | "visa" | "currency" | "food";
  emoji: string;
  label: string;
  value: string;
}

/** Short, scannable items for the flight card travel strip. */
export function tripSnapshots(b: TripInfoBundle): TripSnapshot[] {
  return [
    { key: "hotel", emoji: "🏨", label: "Hotel", value: `From ETB ${b.hotel.pricePerNightEtb.toLocaleString("en-US")}/night` },
    { key: "car", emoji: "🚗", label: "Car rental", value: `From ETB ${b.car.pricePerDayEtb.toLocaleString("en-US")}/day` },
    { key: "esim", emoji: "📶", label: "eSIM", value: `${b.esim.dataLabel} / ${b.esim.validityDays} days` },
    { key: "visa", emoji: "🛂", label: "Visa", value: b.visa.short },
    { key: "currency", emoji: "💱", label: "Currency", value: `ETB → ${b.currency.code}` },
    { key: "food", emoji: "🍽️", label: "Ethiopian food", value: "Available" },
  ];
}

// ---------- Estimated trip cost helpers ----------

/** Whole nights between departure and return dates (min 1). Date-only ISO. */
export function nightsBetween(departDate: string, returnDate?: string | null): number {
  if (!departDate) return 1;
  const dep = new Date(`${departDate.slice(0, 10)}T00:00:00Z`).getTime();
  const end = returnDate
    ? new Date(`${returnDate.slice(0, 10)}T00:00:00Z`).getTime()
    : NaN;
  if (!Number.isFinite(end) || end <= dep) return 1;
  return Math.max(1, Math.round((end - dep) / 86_400_000));
}

export interface EstimatedTripCosts {
  flightEtb: number;
  hotelEtb: number;
  carEtb: number;
  esimEtb: number;
  otherEtb: number;
  totalEtb: number;
  nights: number;
}

/**
 * Sample-based estimate. The flight total comes from the search result; every
 * other line is derived from the sample bundle above and must be presented as
 * an estimate, never as a quote.
 */
export function estimatedTripCosts(
  bundle: TripInfoBundle,
  flightTotalEtb: number,
  nights: number
): EstimatedTripCosts {
  const hotelEtb = bundle.hotel.pricePerNightEtb * nights;
  const carEtb = bundle.car.pricePerDayEtb * nights;
  const esimEtb = bundle.esim.priceEtb;
  const otherEtb = bundle.otherCostsEtb;
  const totalEtb = flightTotalEtb + hotelEtb + carEtb + esimEtb + otherEtb;
  return { flightEtb: flightTotalEtb, hotelEtb, carEtb, esimEtb, otherEtb, totalEtb, nights };
}
