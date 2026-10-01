import type { CabinClass, SearchRequest } from "./types";
import { resolveCityToCode } from "./airports";

const IATA_RE = /^[A-Za-z]{3}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const CABINS: CabinClass[] = ["economy", "premium_economy", "business", "first"];

export interface ValidationOk {
  ok: true;
  value: SearchRequest;
}

export interface ValidationErr {
  ok: false;
  error: string;
  status: number;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function isValidDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function validateSearch(body: unknown): ValidationOk | ValidationErr {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Request body must be a JSON object", status: 400 };
  }
  const b = body as Record<string, unknown>;

  const originRaw = typeof b.origin === "string" ? b.origin.trim() : "";
  const destinationRaw = typeof b.destination === "string" ? b.destination.trim() : "";

  // Accept either an IATA code ("ADD") or a city name ("Addis Ababa",
  // "dxb", "addis"); everything is normalized to an IATA code here so
  // downstream logic, storage, and analytics stay code-based.
  const origin = resolveCityToCode(originRaw);
  if (!origin) {
    return {
      ok: false,
      error: `origin "${originRaw}" is not a known city or 3-letter IATA code (e.g. Addis Ababa or ADD)`,
      status: 400,
    };
  }
  const destination = resolveCityToCode(destinationRaw);
  if (!destination) {
    return {
      ok: false,
      error: `destination "${destinationRaw}" is not a known city or 3-letter IATA code (e.g. Dubai or DXB)`,
      status: 400,
    };
  }
  if (origin === destination) {
    return { ok: false, error: "Origin and destination must differ", status: 400 };
  }

  const departureDate = typeof b.departureDate === "string" ? b.departureDate.trim() : "";
  if (!isValidDate(departureDate)) {
    return { ok: false, error: "departureDate must be a valid date in YYYY-MM-DD format", status: 400 };
  }
  if (departureDate < todayIso()) {
    return { ok: false, error: "departureDate cannot be in the past", status: 400 };
  }

  let returnDate: string | null = null;
  if (typeof b.returnDate === "string" && b.returnDate.trim() !== "") {
    returnDate = b.returnDate.trim();
    if (!isValidDate(returnDate)) {
      return { ok: false, error: "returnDate must be a valid date in YYYY-MM-DD format", status: 400 };
    }
    if (returnDate < departureDate) {
      return { ok: false, error: "returnDate must be on or after departureDate", status: 400 };
    }
  }

  let passengers = 1;
  if (b.passengers !== undefined) {
    const p = typeof b.passengers === "string" ? parseInt(b.passengers, 10) : b.passengers;
    if (typeof p !== "number" || !Number.isInteger(p) || p < 1 || p > 9) {
      return { ok: false, error: "passengers must be an integer between 1 and 9", status: 400 };
    }
    passengers = p;
  }

  let sortBy: SearchRequest["sortBy"] = "price";
  if (b.sortBy !== undefined) {
    if (b.sortBy !== "price" && b.sortBy !== "duration" && b.sortBy !== "stops") {
      return { ok: false, error: "sortBy must be one of: price, duration, stops", status: 400 };
    }
    sortBy = b.sortBy;
  }

  let cabin: CabinClass = "economy";
  if (b.cabin !== undefined) {
    if (typeof b.cabin !== "string" || !CABINS.includes(b.cabin as CabinClass)) {
      return { ok: false, error: `cabin must be one of: ${CABINS.join(", ")}`, status: 400 };
    }
    cabin = b.cabin as CabinClass;
  }

  return {
    ok: true,
    value: { origin, destination, departureDate, returnDate, passengers, sortBy, cabin },
  };
}
