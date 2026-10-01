"use client";

import { useEffect, useState } from "react";
import type { CabinClass } from "../lib/types";

/**
 * Cabin Class & Passengers popover (Banani "FlightSearchDropdowns" design).
 * Cabin-class select, Adults (age 16+) and Children (aged 2-17) steppers and
 * an Apply footer. Holds its own draft state; changes only reach the search
 * bar on Apply. Rendered only while open, so draft state resets on mount.
 */

const CABIN_OPTIONS: { value: CabinClass; label: string }[] = [
  { value: "economy", label: "Economy" },
  { value: "premium_economy", label: "Premium economy" },
  { value: "business", label: "Business" },
  { value: "first", label: "First" },
];

const MIN_TOTAL = 1;
const MAX_TOTAL = 9; // API accepts 1-9 passengers

interface PassengersProps {
  adults: number;
  children: number;
  cabin: CabinClass;
  onApply: (adults: number, children: number, cabin: CabinClass) => void;
  popRef: React.RefObject<HTMLDivElement | null>;
  wrapRef: React.RefObject<HTMLDivElement | null>;
}

export default function Passengers({
  adults,
  children,
  cabin,
  onApply,
  popRef,
  wrapRef,
}: PassengersProps) {
  // Draft state — only committed to the search bar on Apply.
  const [draftAdults, setDraftAdults] = useState(adults);
  const [draftChildren, setDraftChildren] = useState(children);
  const [draftCabin, setDraftCabin] = useState<CabinClass>(cabin);

  const total = draftAdults + draftChildren;
  const canApply = total >= MIN_TOTAL && total <= MAX_TOTAL;

  // Close on outside click or Escape, mirroring the dates popover.
  const open = true;
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || popRef.current?.contains(t)) return;
      onApply(draftAdults, draftChildren, draftCabin); // treat outside click as apply
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onApply(draftAdults, draftChildren, draftCabin);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftAdults, draftChildren, draftCabin]);

  const clampAdults = (n: number) =>
    Math.max(1, Math.min(MAX_TOTAL - draftChildren, n));
  const clampChildren = (n: number) =>
    Math.max(0, Math.min(MAX_TOTAL - draftAdults, n));

  return (
    <div className="psg-pop" ref={popRef} role="dialog" aria-label="Cabin class and passengers">
      <label className="psg-cabin">
        <span className="psg-label">Cabin class</span>
        <select
          className="psg-select"
          value={draftCabin}
          onChange={(e) => setDraftCabin(e.target.value as CabinClass)}
          aria-label="Cabin class"
        >
          {CABIN_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      <div className="psg-row">
        <div className="psg-who">
          <span className="psg-kind">Adults</span>
          <span className="psg-age">Age 16+</span>
        </div>
        <div className="psg-stepper" role="group" aria-label="Number of adults">
          <button
            type="button"
            className="psg-step"
            disabled={draftAdults <= 1}
            aria-label="Remove one adult"
            onClick={() => setDraftAdults((a) => clampAdults(a - 1))}
          >
            −
          </button>
          <span className="psg-count" aria-live="polite">{draftAdults}</span>
          <button
            type="button"
            className="psg-step"
            disabled={total >= MAX_TOTAL}
            aria-label="Add one adult"
            onClick={() => setDraftAdults((a) => clampAdults(a + 1))}
          >
            +
          </button>
        </div>
      </div>

      <div className="psg-row">
        <div className="psg-who">
          <span className="psg-kind">Children</span>
          <span className="psg-age">Aged 2-17</span>
        </div>
        <div className="psg-stepper" role="group" aria-label="Number of children">
          <button
            type="button"
            className="psg-step"
            disabled={draftChildren <= 0}
            aria-label="Remove one child"
            onClick={() => setDraftChildren((c) => clampChildren(c - 1))}
          >
            −
          </button>
          <span className="psg-count" aria-live="polite">{draftChildren}</span>
          <button
            type="button"
            className="psg-step"
            disabled={total >= MAX_TOTAL}
            aria-label="Add one child"
            onClick={() => setDraftChildren((c) => clampChildren(c + 1))}
          >
            +
          </button>
        </div>
      </div>

      <button
        type="button"
        className="psg-apply"
        disabled={!canApply}
        onClick={() => onApply(draftAdults, draftChildren, draftCabin)}
      >
        Apply
      </button>
    </div>
  );
}
