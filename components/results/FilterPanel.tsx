"use client";

import { useMemo, useState } from "react";
import type { Flight } from "@/lib/types";
import {
  formatEtb,
  TIME_WINDOWS,
  type Filters,
  type TimeWindow,
} from "@/lib/resultsView";

/**
 * Filter panel — rendered inside the desktop sidebar and inside the mobile
 * bottom-sheet drawer. All state lives in the parent (the results page), so
 * this component is fully controlled: draft state is local, applied on
 * "Show results" (drawer) or instantly (sidebar via applyDraft).
 */

const STOP_OPTIONS = [
  { value: 0, label: "Non-stop" },
  { value: 1, label: "1 stop" },
  { value: 2, label: "2+ stops" },
];

interface FilterPanelProps {
  flights: Flight[];
  draft: Filters;
  onDraftChange: (f: Filters) => void;
  /** When true (sidebar) changes apply instantly; drawer shows a footer button. */
  instant?: boolean;
  onApply?: () => void;
  onReset: () => void;
  resultCount?: number;
}

export default function FilterPanel({
  flights,
  draft,
  onDraftChange,
  instant,
  onApply,
  onReset,
  resultCount,
}: FilterPanelProps) {
  const airlines = useMemo(() => {
    const map = new Map<string, { min: number; count: number }>();
    for (const f of flights) {
      const cur = map.get(f.airline) ?? { min: Infinity, count: 0 };
      map.set(f.airline, { min: Math.min(cur.min, f.price.etb), count: cur.count + 1 });
    }
    return [...map.entries()].sort((a, b) => a[1].min - b[1].min);
  }, [flights]);

  const maxPrice = useMemo(
    () => Math.max(...flights.map((f) => f.price.etb), 1000),
    [flights]
  );

  const [showAllAirlines, setShowAllAirlines] = useState(false);
  const visibleAirlines = showAllAirlines ? airlines : airlines.slice(0, 4);

  const setStops = (v: number, on: boolean) => {
    const next = new Set(draft.stops);
    if (on) next.add(v);
    else next.delete(v);
    onDraftChange({ ...draft, stops: next });
  };

  const setAirline = (name: string, on: boolean) => {
    const next = new Set(draft.airlines);
    if (on) next.add(name);
    else next.delete(name);
    onDraftChange({ ...draft, airlines: next });
  };

  const stopsActive = draft.stops.size > 0;
  const stopsLabel = stopsActive
    ? [...draft.stops].sort().map((s) => STOP_OPTIONS.find((o) => o.value === s)?.label ?? String(s)).join(", ")
    : "Any";

  const airlineLabel = draft.airlines.size > 0 ? `${draft.airlines.size} selected` : "Any";

  return (
    <div className="fp">
      <div className="fp-head">
        <h2>Filters</h2>
        <button type="button" className="fp-reset" onClick={onReset}>
          Reset all
        </button>
      </div>

      {/* ----- Price ----- */}
      <section className="fp-group">
        <h3>Price</h3>
        <p className="fp-hint">
          Up to ETB {formatEtb(draft.maxPrice === Number.MAX_SAFE_INTEGER ? maxPrice : draft.maxPrice)}
        </p>
        <input
          className="fp-range"
          type="range"
          min={Math.floor(maxPrice * 0.25)}
          max={maxPrice}
          step={100}
          value={draft.maxPrice === Number.MAX_SAFE_INTEGER ? maxPrice : draft.maxPrice}
          onChange={(e) => onDraftChange({ ...draft, maxPrice: Number(e.target.value) })}
          aria-label="Maximum price in ETB"
        />
      </section>

      {/* ----- Stops ----- */}
      <section className="fp-group">
        <h3>Stops</h3>
        {STOP_OPTIONS.map((o) => (
          <label key={o.value} className="fp-check">
            <input
              type="checkbox"
              checked={draft.stops.has(o.value)}
              onChange={(e) => setStops(o.value, e.target.checked)}
            />
            <span>{o.label}</span>
          </label>
        ))}
      </section>

      {/* ----- Airline ----- */}
      <section className="fp-group">
        <h3>Airline</h3>
        {visibleAirlines.map(([name, info]) => (
          <label key={name} className="fp-check">
            <input
              type="checkbox"
              checked={draft.airlines.has(name)}
              onChange={(e) => setAirline(name, e.target.checked)}
            />
            <span className="fp-check-label">{name}</span>
            <span className="fp-check-meta">from ETB {formatEtb(info.min)}</span>
          </label>
        ))}
        {airlines.length > 4 && (
          <button type="button" className="fp-more" onClick={() => setShowAllAirlines((s) => !s)}>
            {showAllAirlines ? "Show fewer" : `Show all ${airlines.length} airlines`}
          </button>
        )}
      </section>

      {/* ----- Departure time ----- */}
      <section className="fp-group">
        <h3>Departure time</h3>
        <div className="fp-windows">
          {TIME_WINDOWS.map((w) => (
            <button
              key={w.id}
              type="button"
              className={`fp-window${draft.depWindow === w.id ? " fp-window-on" : ""}`}
              aria-pressed={draft.depWindow === w.id}
              onClick={() => onDraftChange({ ...draft, depWindow: draft.depWindow === w.id ? null : (w.id as TimeWindow) })}
            >
              {w.label}
            </button>
          ))}
        </div>
      </section>

      {/* ----- Arrival time ----- */}
      <section className="fp-group">
        <h3>Arrival time</h3>
        <div className="fp-windows">
          {TIME_WINDOWS.map((w) => (
            <button
              key={w.id}
              type="button"
              className={`fp-window${draft.arrWindow === w.id ? " fp-window-on" : ""}`}
              aria-pressed={draft.arrWindow === w.id}
              onClick={() => onDraftChange({ ...draft, arrWindow: draft.arrWindow === w.id ? null : (w.id as TimeWindow) })}
            >
              {w.label}
            </button>
          ))}
        </div>
      </section>

      {/* ----- Baggage ----- */}
      <section className="fp-group">
        <h3>Baggage</h3>
        <label className="fp-check">
          <input
            type="checkbox"
            checked={draft.baggageOnly}
            onChange={(e) => onDraftChange({ ...draft, baggageOnly: e.target.checked })}
          />
          <span>Checked bag included</span>
        </label>
      </section>

      {instant && resultCount !== undefined && (
        <p className="fp-count" aria-live="polite">
          {resultCount} {resultCount === 1 ? "flight" : "flights"}
        </p>
      )}

      {!instant && (
        <div className="fp-foot">
          <button type="button" className="fp-show" onClick={onApply}>
            Show {resultCount ?? ""} {resultCount === 1 ? "flight" : "flights"}
          </button>
        </div>
      )}
    </div>
  );
}
