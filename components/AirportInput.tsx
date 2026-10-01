"use client";

import { forwardRef, useId, useMemo, useState } from "react";
import { AIRPORTS } from "../lib/airports";
import { PlaneSolidIcon } from "./icons";

/**
 * Autocomplete text input for origin/destination. Free-text entry (city name
 * or IATA code) with a dropdown of matches from the static AIRPORTS list.
 * Selection fills the field with the city name; the server resolves it to
 * an IATA code (lib/airports.resolveCityToCode).
 *
 * Keyboard: ArrowUp/Down to move, Enter to pick, Escape to close, Tab out.
 * Accepts a ref (forwarded to the underlying <input>) for programmatic focus.
 */

interface AirportInputProps {
  label: string;
  placeholder: string;
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
}

const MAX_SHOW = 6;
const MAX_SHOW_EMPTY_QUERY = 8;

const AirportInput = forwardRef<HTMLInputElement, AirportInputProps>(
  function AirportInput(
    { label, placeholder, ariaLabel, value, onChange, required, disabled },
    ref
  ) {
    const [open, setOpen] = useState(false);
    const [highlight, setHighlight] = useState(0);
    const listId = useId();

    const matches = useMemo(() => {
      const q = value.trim().toUpperCase();
      if (q.length === 0) return AIRPORTS.slice(0, MAX_SHOW_EMPTY_QUERY);

      const hits = AIRPORTS.filter(
        (a) =>
          a.code.startsWith(q) ||
          a.city.toUpperCase().includes(q) ||
          a.country.toUpperCase().includes(q)
      );
      // Prefix matches on city/code first, then substring hits.
      hits.sort((x, y) => {
        const xs =
          x.city.toUpperCase().startsWith(q) || x.code.startsWith(q) ? 0 : 1;
        const ys =
          y.city.toUpperCase().startsWith(q) || y.code.startsWith(q) ? 0 : 1;
        return xs - ys;
      });
      return hits.slice(0, MAX_SHOW);
    }, [value]);

    const pick = (city: string) => {
      onChange(city);
      setOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!open || matches.length === 0) return; // Enter falls through → submits form
      if (e.key === "Enter") {
        e.preventDefault();
        pick(matches[highlight].city);
      } else {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setHighlight((h) => (h + 1) % matches.length);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setHighlight((h) => (h - 1 + matches.length) % matches.length);
        } else if (e.key === "Escape") {
          setOpen(false);
        }
      }
    };

    return (
      <label className="field">
        <span className="field-label">{label}</span>
        <div
          className="ac-wrap"
          role="combobox"
          aria-expanded={open && matches.length > 0}
          aria-haspopup="listbox"
        >
          <input
            ref={ref}
            className="field-input"
            type="text"
            value={value}
            placeholder={placeholder}
            maxLength={40}
            disabled={disabled}
            required={required}
            aria-label={ariaLabel}
            aria-controls={listId}
            aria-autocomplete="list"
            onChange={(e) => {
              onChange(e.target.value);
              setHighlight(0);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={handleKeyDown}
          />

          {open && matches.length > 0 && (
            <ul className="ac-menu" role="listbox" id={listId} aria-label={ariaLabel}>
              {matches.map((a, i) => (
                <li
                  key={a.code}
                  id={`${listId}-${a.code}`}
                  role="option"
                  aria-selected={i === highlight}
                  className={`ac-item${i === highlight ? " ac-active" : ""}`}
                  // Keep focus in the input so onBlur doesn't close the menu
                  // before the click lands.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(a.city)}
                  onMouseEnter={() => setHighlight(i)}
                >
                  <span className="ac-icon" aria-hidden="true">
                    <PlaneSolidIcon />
                  </span>
                  <span className="ac-main">
                    <span className="ac-city">
                      {a.city} <span className="ac-code">({a.code})</span>
                    </span>
                    <span className="ac-country">{a.country}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}

          {open && matches.length === 0 && value.trim() !== "" && (
            <div className="ac-empty">No matching city or airport code</div>
          )}
        </div>
      </label>
    );
  }
);

export default AirportInput;
