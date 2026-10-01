"use client";

import Link from "next/link";
import type { Flight } from "@/lib/types";
import type { TripSnapshot } from "@/lib/tripInfo";
import {
  formatEtb,
  formatTime,
  formatDuration,
  stopsLabel,
  airportCity,
  type SortKey,
} from "@/lib/resultsView";

/**
 * One flight result card. A compact, scannable SUMMARY only: airline +
 * route + price on top, then a short travel snapshot strip (hotel / car /
 * eSIM / visa / currency / Ethiopian food), then a View Details link.
 * Full information lives on the /flight-details page — never in the card.
 */

interface FlightCardProps {
  flight: Flight;
  /** Sort categories this flight currently wins among the *visible* list. */
  badges: SortKey[];
  /** Query string that reproduces the search, so Trip Details can reload it. */
  searchHref: string;
  /** Six short travel snapshot items for the destination. */
  snapshots: TripSnapshot[];
  /** Route airports (same for every offer in one search). */
  originCode: string;
  destCode: string;
  /** Price note under the total, e.g. "round trip, incl. taxes". */
  priceNote: string;
}

const BADGE_LABEL: Record<SortKey, string> = {
  cheapest: "Cheapest",
  fastest: "Fastest",
  best: "Best",
};

function Badge({ kind }: { kind: SortKey }) {
  return <span className={`fc-badge fc-badge-${kind}`}>{BADGE_LABEL[kind]}</span>;
}

export default function FlightCard({
  flight: f,
  badges,
  searchHref,
  snapshots,
  originCode,
  destCode,
  priceNote,
}: FlightCardProps) {
  const stops = stopsLabel(f.stops);
  const bag = f.baggageKg > 0 ? `${f.baggageKg} kg bag` : "Carry-on";
  const detailsHref = `/flight-details/${encodeURIComponent(f.id)}${searchHref}`;

  return (
    <li className="flight-card">
      {/* ----- Flight summary (top) ----- */}
      <div className="fc-top">
        <div className="fc-airline">
          <span className="fc-logo" aria-hidden="true">{f.airlineCode}</span>
          <span className="fc-name">{f.airline}</span>
          {f.flightNumber && <span className="fc-flightno">{f.flightNumber}</span>}
        </div>

        <div className="fc-times">
          <div className="fc-endpoint">
            <span className="fc-time">{formatTime(f.departure)}</span>
            <span className="fc-ap">
              {originCode ? `${airportCity(originCode)} (${originCode})` : "—"}
            </span>
          </div>

          <div className="fc-mid">
            <span className="fc-dur">{formatDuration(f.durationMinutes)}</span>
            <span className="fc-line" aria-hidden="true">
              <span className="fc-dot" />
              <span className="fc-bar" />
              <span className="fc-dot" />
            </span>
            <span className="fc-stops">{stops}</span>
          </div>

          <div className="fc-endpoint fc-endpoint-right">
            <span className="fc-time">{formatTime(f.arrival)}</span>
            <span className="fc-ap">
              {destCode ? `${airportCity(destCode)} (${destCode})` : "—"}
            </span>
          </div>
        </div>

        <div className="fc-meta">
          <span>{bag}</span>
          <span aria-hidden="true">·</span>
          <span>{f.cabin.replace("_", " ")}</span>
        </div>
      </div>

      {/* ----- Travel snapshot strip (middle): six short items ----- */}
      <ul className="fc-trip" aria-label={`Travel information for the destination`}>
        {snapshots.map((s) => (
          <li key={s.key} className="fc-trip-item">
            <span className="fc-trip-emoji" aria-hidden="true">{s.emoji}</span>
            <span className="fc-trip-txt">
              <span className="fc-trip-label">{s.label}</span>
              <span className="fc-trip-value">{s.value}</span>
            </span>
          </li>
        ))}
      </ul>

      {/* ----- Price + action (bottom) ----- */}
      <div className="fc-side">
        <div className="fc-badges">
          {badges.map((b) => (
            <Badge key={b} kind={b} />
          ))}
        </div>
        <span className="fc-price">ETB {formatEtb(f.price.etb)}</span>
        <span className="fc-price-note">{priceNote}</span>
        <Link
          href={detailsHref}
          className="fc-details-btn"
          aria-label={`View trip details for ${f.airline} ${f.flightNumber ?? ""}`}
        >
          View Details
        </Link>
      </div>
    </li>
  );
}
