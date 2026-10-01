"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "./icons";
import AirportInput from "./AirportInput";
import DatePicker, { formatShortDate } from "./DatePicker";
import Passengers from "./Passengers";
import { onSeedDestination, onSeedRoute } from "../lib/searchEvents";
import type { CabinClass } from "../lib/types";

/**
 * Search bar wired to POST /api/search (roadmap 1.5).
 * On success, routes to /results?id=<searchId> where the results page
 * re-reads the cached search. Dates come from the DatePicker popover
 * (Applied values); the popover closes on Apply, outside click or Escape.
 */

/** Short cabin labels for the collapsed Passengers field. */
const CABIN_SHORT: Record<CabinClass, string> = {
  economy: "Economy",
  premium_economy: "Prem. economy",
  business: "Business",
  first: "First",
};

function isoDaysFromNow(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

export default function SearchBar() {
  const router = useRouter();

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [departureDate, setDepartureDate] = useState(isoDaysFromNow(7));
  const [returnDate, setReturnDate] = useState<string | null>(isoDaysFromNow(14));
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [cabin, setCabin] = useState<CabinClass>("economy");
  const [paxOpen, setPaxOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [datesOpen, setDatesOpen] = useState(false);
  const destInputRef = useRef<HTMLInputElement>(null);
  const datesWrapRef = useRef<HTMLDivElement>(null);
  const datePopRef = useRef<HTMLDivElement>(null);
  const paxWrapRef = useRef<HTMLDivElement>(null);
  const paxPopRef = useRef<HTMLDivElement>(null);

  // Popular-route cards prefill the destination field, then bring the
  // search bar into view and focus it so the user can pick dates.
  useEffect(
    () =>
      onSeedDestination((city) => {
        setDestination(city);
        setError(null);
        destInputRef.current?.focus();
      }),
    []
  );

  // Popular Flight List accordions prefill BOTH endpoints (Addis → X).
  useEffect(
    () =>
      onSeedRoute((originCity, destCity) => {
        setOrigin(originCity);
        setDestination(destCity);
        setError(null);
        destInputRef.current?.focus();
      }),
    []
  );

  // Close the date popover on outside click or Escape.
  useEffect(() => {
    if (!datesOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (datesWrapRef.current?.contains(t) || datePopRef.current?.contains(t)) return;
      setDatesOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDatesOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [datesOpen]);

  const datesLabel =
    returnDate
      ? `${formatShortDate(departureDate)} – ${formatShortDate(returnDate)}`
      : formatShortDate(departureDate);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: origin.trim(),
          destination: destination.trim(),
          departureDate,
          returnDate,
          passengers: adults + children,
          cabin,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Search failed. Please try again.");
        setLoading(false);
        return;
      }
      router.push(`/results?id=${data.meta.searchId}`);
    } catch {
      setError("Network error — please try again.");
      setLoading(false);
    }
  };

  return (
    <form className="search" role="search" onSubmit={handleSearch}>
      <AirportInput
        label="From"
        placeholder="Addis Ababa or ADD"
        ariaLabel="Origin city or airport code"
        value={origin}
        onChange={setOrigin}
        disabled={loading}
      />

      <span className="divider" aria-hidden="true" />

      <AirportInput
        label="Where to"
        placeholder="Dubai or DXB"
        ariaLabel="Destination city or airport code"
        value={destination}
        onChange={setDestination}
        required
        disabled={loading}
        ref={destInputRef}
      />

      <span className="divider" aria-hidden="true" />

      <div className="field field-button date-field" ref={datesWrapRef}>
        <button
          type="button"
          className="date-field-btn"
          aria-haspopup="dialog"
          aria-expanded={datesOpen}
          onClick={() => setDatesOpen((o) => !o)}
        >
          <span className="field-label">Dates</span>
          <span className="field-value">{datesLabel}</span>
        </button>
        {datesOpen && (
          <DatePicker
            departureDate={departureDate}
            returnDate={returnDate}
            popRef={datePopRef}
            onApply={(dep, ret) => {
              setDepartureDate(dep);
              setReturnDate(ret);
              setDatesOpen(false);
            }}
          />
        )}
      </div>

      <span className="divider" aria-hidden="true" />

      <div className="field field-button pax-field" ref={paxWrapRef}>
        <button
          type="button"
          className="date-field-btn"
          aria-haspopup="dialog"
          aria-expanded={paxOpen}
          onClick={() => setPaxOpen((o) => !o)}
        >
          <span className="field-label">Passengers</span>
          <span className="field-value">
            {adults + children} {adults + children === 1 ? "guest" : "guests"}
            {" · "}
            {CABIN_SHORT[cabin]}
          </span>
        </button>
        {paxOpen && (
          <Passengers
            adults={adults}
            children={children}
            cabin={cabin}
            popRef={paxPopRef}
            wrapRef={paxWrapRef}
            onApply={(a, c, cb) => {
              setAdults(a);
              setChildren(c);
              setCabin(cb);
              setPaxOpen(false);
            }}
          />
        )}
      </div>

      <button type="submit" className="go" aria-label="Search flights" disabled={loading}>
        <SearchIcon />
      </button>

      {error && <p className="search-error" role="alert">{error}</p>}
    </form>
  );
}
