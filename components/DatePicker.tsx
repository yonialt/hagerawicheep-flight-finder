"use client";

import { useMemo, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";

/**
 * Kayak-style date picker popover (roadmap search bar).
 * Round trip/One way toggle, two month grids (Monday start), range
 * selection and an Apply footer. Holds its own draft state; changes only
 * reach the search bar on Apply. Rendered only while open, so draft state
 * resets every time the panel mounts.
 */

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"] as const;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fromISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** "Sat 3 Oct" — short label for the search bar fields. */
export function formatShortDate(isoDate: string): string {
  return fromISO(isoDate).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** Weeks of the month, Monday-first; null pads incomplete weeks. */
function monthGrid(year: number, month: number): (Date | null)[] {
  const lead = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

interface MonthViewProps {
  month: Date;
  today: Date;
  dep: string | null;
  ret: string | null;
  oneWay: boolean;
  showYear: boolean;
  onPick: (d: Date) => void;
}

function MonthView({ month, today, dep, ret, oneWay, showYear, onPick }: MonthViewProps) {
  const todayISO = toISO(today);
  const cells = monthGrid(month.getFullYear(), month.getMonth());
  return (
    <div className="dp-month">
      <div className="dp-month-name">
        {month.toLocaleString("en-GB", { month: "long" })}
        {showYear ? ` ${month.getFullYear()}` : ""}
      </div>
      <div className="dp-grid">
        {WEEKDAYS.map((w, i) => (
          <span key={`dow-${i}`} className="dp-dow">{w}</span>
        ))}
        {cells.map((d, i) => {
          if (!d) return <span key={`pad-${i}`} className="dp-out" />;
          const s = toISO(d);
          const isEndpoint = dep === s || (!oneWay && ret === s);
          const inRange = !oneWay && !!dep && !!ret && s > dep && s < ret;
          const cls = ["dp-cell"];
          if (inRange) cls.push("dp-inrange");
          if (isEndpoint) cls.push("dp-sel");
          else if (s === todayISO) cls.push("dp-today");
          return (
            <button
              key={s}
              type="button"
              className={cls.join(" ")}
              disabled={d < today}
              aria-pressed={isEndpoint}
              aria-label={d.toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              onClick={() => onPick(d)}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface DatePickerProps {
  departureDate: string;
  returnDate: string | null;
  onApply: (departure: string, returnDate: string | null) => void;
  popRef: React.RefObject<HTMLDivElement | null>;
}

export default function DatePicker({
  departureDate,
  returnDate,
  onApply,
  popRef,
}: DatePickerProps) {
  const now = new Date();
  const today = useMemo(
    () => new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const [trip, setTrip] = useState<"return" | "oneway">(
    returnDate ? "return" : "oneway"
  );
  const [dep, setDep] = useState<string | null>(departureDate || null);
  const [ret, setRet] = useState<string | null>(returnDate ?? null);
  const [visible, setVisible] = useState<Date>(() =>
    fromISO(departureDate || toISO(today))
  );

  const m0 = visible;
  const m1 = new Date(visible.getFullYear(), visible.getMonth() + 1, 1);
  const atMinMonth =
    visible.getFullYear() === today.getFullYear() &&
    visible.getMonth() === today.getMonth();

  const pickDay = (d: Date) => {
    const s = toISO(d);
    if (trip === "oneway") {
      setDep(s);
      return;
    }
    // Fresh range, a day before/at the current departure, or a completed
    // range all start a new departure; otherwise the click sets the return.
    if (!dep || ret || s <= dep) {
      setDep(s);
      setRet(null);
    } else {
      setRet(s);
    }
  };

  const canApply = !!dep && (trip === "oneway" || !!ret);

  let hint: string;
  if (!dep) {
    hint = "Select a departure date";
  } else if (trip === "return" && !ret) {
    hint = "Select a return date";
  } else if (trip === "oneway") {
    hint = `One way · ${formatShortDate(dep)}`;
  } else {
    hint = `${formatShortDate(dep)} — ${formatShortDate(ret!)}`;
  }

  const apply = () => {
    if (!canApply) return;
    onApply(dep!, trip === "return" ? ret! : null);
  };

  const showYearFor = (m: Date, other: Date): boolean =>
    m.getFullYear() !== other.getFullYear() ||
    m.getFullYear() !== today.getFullYear();

  return (
    <div className="date-pop" ref={popRef} role="dialog" aria-label="Choose travel dates">
      <div className="dp-head">
        <div className="dp-toggle" role="group" aria-label="Trip type">
          <button
            type="button"
            className={`dp-toggle-btn${trip === "return" ? " dp-toggle-on" : ""}`}
            aria-pressed={trip === "return"}
            onClick={() => setTrip("return")}
          >
            Round trip
          </button>
          <button
            type="button"
            className={`dp-toggle-btn${trip === "oneway" ? " dp-toggle-on" : ""}`}
            aria-pressed={trip === "oneway"}
            onClick={() => {
              setTrip("oneway");
              setRet(null);
            }}
          >
            One way
          </button>
        </div>
      </div>

      <div className="dp-body">
        <button
          type="button"
          className="dp-nav"
          onClick={() => setVisible(new Date(m0.getFullYear(), m0.getMonth() - 1, 1))}
          disabled={atMinMonth}
          aria-label="Previous month"
        >
          <ChevronLeftIcon />
        </button>
        <div className="dp-months">
          <MonthView
            month={m0}
            today={today}
            dep={dep}
            ret={ret}
            oneWay={trip === "oneway"}
            showYear={showYearFor(m0, m1)}
            onPick={pickDay}
          />
          <MonthView
            month={m1}
            today={today}
            dep={dep}
            ret={ret}
            oneWay={trip === "oneway"}
            showYear={showYearFor(m1, m0)}
            onPick={pickDay}
          />
        </div>
        <button
          type="button"
          className="dp-nav"
          onClick={() => setVisible(new Date(m0.getFullYear(), m0.getMonth() + 1, 1))}
          aria-label="Next month"
        >
          <ChevronRightIcon />
        </button>
      </div>

      <div className="dp-foot">
        <span className="dp-hint">{hint}</span>
        <button type="button" className="dp-apply" disabled={!canApply} onClick={apply}>
          Apply
        </button>
      </div>
    </div>
  );
}
