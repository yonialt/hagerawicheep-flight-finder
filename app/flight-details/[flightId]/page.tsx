"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type { Flight, SearchResponse } from "@/lib/types";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "./trip.css";
import {
  breakdownFor,
  formatDayLabel,
  formatDuration,
  formatEtb,
  formatTime,
  airportCity,
  stopsLabel,
} from "@/lib/resultsView";
import { nightsBetween, tripInfoFor, type TripInfoBundle } from "@/lib/tripInfo";
import { airportBackgroundImage } from "@/lib/airports";

/** Stepper limits (nights / rental days). */
const MIN_NIGHTS = 1;
const MAX_NIGHTS = 30;
const MIN_DAYS = 1;
const MAX_DAYS = 10;

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * Trip Details — a real route (/flight-details/:flightId?search=<searchId>),
 * reached from a flight card's "View Details" link. NOT a modal.
 *
 * Layout (matches the reference design): minimal topbar → route heading with
 * Share/Save → two-column body. Left: Flight Route, Stay & Extras (hotel /
 * car / eSIM), Good to know (visa / currency), Ethiopian restaurants, booking
 * banner. Right: Flight Cost breakdown + Estimated Trip Cost sidebar.
 *
 * The flight comes from the cached search (via ?search=); supporting travel
 * info comes from lib/tripInfo, which is SAMPLE data and is labelled as such.
 */

const CABIN_LABEL: Record<string, string> = {
  economy: "Economy",
  premium_economy: "Premium economy",
  business: "Business",
  first: "First",
};

interface LegProps {
  dateIso?: string;
  dep: string;
  arr: string;
  durationMinutes: number;
  stops: number;
  via?: string[];
  fromCode: string;
  toCode: string;
  flightNumber?: string;
  arrivalCity: string;
}

function RouteLeg({
  dateIso,
  dep,
  arr,
  durationMinutes,
  stops,
  via,
  fromCode,
  toCode,
  flightNumber,
  arrivalCity,
}: LegProps) {
  return (
    <div className="route-leg">
      <div className="route-timeline">
        <div className="route-stop">
          <span className="route-dot" aria-hidden="true" />
          <div className="route-time">{formatTime(dep)}</div>
          <div className="route-ap">
            <strong>{fromCode}</strong> {airportCity(fromCode)}
          </div>
          {dateIso && (
            <div className="route-ap-sub">{formatDayLabel(dateIso)}</div>
          )}
        </div>

        <div className="route-stop">
          <span className="route-dot route-dot-end" aria-hidden="true" />
          <div className="route-time">{formatTime(arr)}</div>
          <div className="route-ap">
            <strong>{toCode}</strong> {airportCity(toCode)}
          </div>
          {stops === 0 && via?.length === 0 && (
            <div className="route-ap-sub">Direct flight</div>
          )}
          {stops > 0 && (
            <div className="route-ap-sub">
              Stop{stops > 1 ? "s" : ""}
              {via?.length ? `: ${via.join(", ")}` : ""}
            </div>
          )}
        </div>
      </div>

      <div className="route-side">
        <span className="route-pill">
          ✈ {formatDuration(durationMinutes)} ·{" "}
          {stops === 0 ? "Direct" : stopsLabel(stops)}
          {flightNumber ? ` · ${flightNumber}` : ""}
        </span>
        <div className="route-arrival-note">
          <p>ARRIVAL IN {arrivalCity.toUpperCase()}</p>
          <strong>{formatTime(arr)} UTC</strong>
          <span className={`route-badge ${stops === 0 ? "route-badge-green" : "route-badge-plain"}`}>
            {stopsLabel(stops)}
          </span>
        </div>
      </div>
    </div>
  );
}

function TripDetailsInner() {
  const params = useParams<{ flightId: string }>();
  const flightId = decodeURIComponent(String(params.flightId ?? ""));
  const searchParams = useSearchParams();
  const searchId = searchParams.get("search");
  const router = useRouter();

  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [bookingPlaceholder, setBookingPlaceholder] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!searchId) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    let cancelled = false;
    fetch(`/api/results?id=${encodeURIComponent(searchId)}`)
      .then(async (res) => {
        if (cancelled) return;
        const json = (await res.json()) as SearchResponse & { error?: string };
        if (!res.ok) {
          setNotFound(true);
        } else {
          setData(json);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setNotFound(true);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [searchId]);

  const flight: Flight | null = useMemo(
    () => data?.results.find((f) => f.id === flightId) ?? null,
    [data, flightId]
  );

  const meta = data?.meta;
  const originCode = meta?.origin ?? "";
  const destCode = meta?.destination ?? "";
  const departDate = meta?.departureDate ?? "";
  const returnDate = meta?.returnDate ?? null;
  const isRoundTrip = Boolean(flight?.returnDeparture);

  const bundle: TripInfoBundle = useMemo(() => tripInfoFor(destCode), [destCode]);

  // Destination city photo behind the whole page (hero-style). Every airport
  // gets one — its own photo when available, else a deterministic fallback.
  const bgImage = destCode ? airportBackgroundImage(destCode) : null;

  const breakdown = useMemo(
    () => (flight ? breakdownFor(flight) : null),
    [flight]
  );

  const nights = useMemo(
    () => nightsBetween(departDate, returnDate),
    [departDate, returnDate]
  );

  // --- Stay & Extras include/quantity state ---
  const [hotelIncluded, setHotelIncluded] = useState(true);
  const [carIncluded, setCarIncluded] = useState(true);
  const [esimIncluded, setEsimIncluded] = useState(true);
  const [hotelNights, setHotelNights] = useState(nights);
  const [carDays, setCarDays] = useState(nights);

  // Keep quantities in sync when trip dates change (e.g. back → new search).
  useEffect(() => {
    setHotelNights(nights);
    setCarDays(nights);
  }, [nights]);

  // Sidebar estimate: flight + included extras, mirroring the reference
  // layout (4 lines). Meals/local transport are intentionally excluded.
  const costs = useMemo(() => {
    if (!breakdown) return null;
    const hotelFull = bundle.hotel.pricePerNightEtb * hotelNights;
    const carFull = bundle.car.pricePerDayEtb * carDays;
    const hotelEtb = hotelIncluded ? hotelFull : 0;
    const carEtb = carIncluded ? carFull : 0;
    const esimEtb = esimIncluded ? bundle.esim.priceEtb : 0;
    return {
      flightEtb: breakdown.total,
      hotelFull,
      carFull,
      hotelEtb,
      carEtb,
      esimEtb,
      totalEtb: breakdown.total + hotelEtb + carEtb + esimEtb,
      nights: hotelNights,
      carDays,
    };
  }, [breakdown, bundle, hotelIncluded, carIncluded, esimIncluded, hotelNights, carDays]);

  function onShare() {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: document.title, url }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }).catch(() => {});
    }
  }

  // ---------- States ----------

  if (loading) {
    return (
      <main className="trip-page">
        <div className="trip-top"><Header /></div>
        <p className="trip-status">Loading trip…</p>
        <Footer />
      </main>
    );
  }

  if (notFound || !flight || !breakdown || !costs || !meta) {
    return (
      <main className="trip-page">
        <div className="trip-top"><Header /></div>
        <div className="trip-status trip-error">
          <p>This flight is no longer available — the search may have expired.</p>
          <Link href="/">← Run a new search</Link>
        </div>
        <Footer />
      </main>
    );
  }

  const bag =
    flight.baggageKg > 0
      ? `${flight.baggageKg} kg checked + 7 kg cabin`
      : "Carry-on only";

  const dateFact = returnDate
    ? `${formatDayLabel(departDate)} – ${formatDayLabel(returnDate)} ${returnDate.slice(0, 4)}`
    : `${formatDayLabel(departDate)} ${departDate.slice(0, 4)}`;

  return (
    <main className="trip-page">
      {bgImage !== null && (
        <div className="trip-bg" aria-hidden="true">
          <Image src={bgImage} alt="" fill priority sizes="100vw" />
        </div>
      )}
      <div className="trip-top"><Header /></div>

      <div className="trip-container">
        {/* ----- Topbar ----- */}
        <div className="trip-topbar">
          <button
            type="button"
            className="trip-topbar-link"
            onClick={() =>
              searchId
                ? router.push(`/results?id=${encodeURIComponent(searchId)}`)
                : router.push("/")
            }
          >
            ← Back to results
          </button>
          <span className="trip-topbar-meta">
            Trip ID: {searchId ? `${searchId.slice(0, 8).toUpperCase()}` : "—"} ·{" "}
            {saved ? "Saved just now" : "Not saved"}
          </span>
        </div>

        {/* ----- Heading ----- */}
        <p className="trip-kicker">Trip Details</p>
        <div className="trip-head">
          <div>
            <h1>
              {airportCity(originCode)} <span aria-hidden="true">→</span>{" "}
              {airportCity(destCode)}
            </h1>
            <p className="trip-head-sub">
              {dateFact} · {meta.passengers ?? 1}{" "}
              {(meta.passengers ?? 1) === 1 ? "traveler" : "travelers"} ·{" "}
              {CABIN_LABEL[meta.cabin ?? "economy"] ?? "Economy"}
            </p>
          </div>
          <div className="trip-head-actions">
            <button type="button" className="trip-chip-btn" onClick={onShare}>
              ⇗ {copied ? "Link copied" : "Share"}
            </button>
            <button
              type="button"
              className="trip-chip-btn"
              onClick={() => setSaved((s) => !s)}
              aria-pressed={saved}
            >
              {saved ? "♥ Saved" : "♡ Save"}
            </button>
          </div>
        </div>

        <div className="trip-columns">
          {/* ================= LEFT COLUMN ================= */}
          <div className="trip-main">
            {/* ---- Flight Route ---- */}
            <div className="trip-section">
              <span className="trip-section-dot" aria-hidden="true" />
              <h2>Flight Route</h2>
              <span className="trip-section-chip">
                {stopsLabel(flight.stops)} · {formatDuration(flight.durationMinutes)}
              </span>
            </div>

            <section className="trip-card route-card" aria-label="Flight itinerary">
              <div className="route-head">
                <span className="route-logo" aria-hidden="true">{flight.airlineCode}</span>
                <div className="route-head-txt">
                  <h3>{flight.airline}</h3>
                  <p>
                    {flight.flightNumber ?? "Flight number unavailable"} ·{" "}
                    {CABIN_LABEL[flight.cabin] ?? "Economy"}
                  </p>
                </div>
                <div className="route-badges">
                  <span className={`route-badge ${flight.stops === 0 ? "route-badge-green" : "route-badge-plain"}`}>
                    {stopsLabel(flight.stops)}
                  </span>
                  <span className="route-badge route-badge-amber">
                    {CABIN_LABEL[flight.cabin] ?? "Economy"}
                  </span>
                </div>
              </div>

              <RouteLeg
                dateIso={departDate}
                dep={flight.departure}
                arr={flight.arrival}
                durationMinutes={flight.durationMinutes}
                stops={flight.stops}
                via={flight.viaCities}
                fromCode={originCode}
                toCode={destCode}
                flightNumber={flight.flightNumber}
                arrivalCity={airportCity(destCode)}
              />

              {isRoundTrip && flight.returnDeparture && flight.returnArrival && (
                <RouteLeg
                  dateIso={returnDate ?? undefined}
                  dep={flight.returnDeparture}
                  arr={flight.returnArrival}
                  durationMinutes={flight.returnDurationMinutes ?? 0}
                  stops={flight.returnStops ?? 0}
                  fromCode={destCode}
                  toCode={originCode}
                  arrivalCity={airportCity(originCode)}
                />
              )}

              <div className="route-facts">
                <div>
                  <div className="route-fact-label">Date</div>
                  <div className="route-fact-value">{dateFact}</div>
                </div>
                <div>
                  <div className="route-fact-label">Duration</div>
                  <div className="route-fact-value">
                    {formatDuration(flight.durationMinutes)} · {stopsLabel(flight.stops)}
                  </div>
                </div>
                <div>
                  <div className="route-fact-label">Flight No.</div>
                  <div className="route-fact-value">{flight.flightNumber ?? "—"}</div>
                </div>
                <div>
                  <div className="route-fact-label">Baggage</div>
                  <div className="route-fact-value">{bag}</div>
                </div>
              </div>
            </section>

            {/* ---- Stay & Extras ---- */}
            <div className="trip-section">
              <span className="trip-section-dot" aria-hidden="true" />
              <h2>Stay &amp; Extras</h2>
              <span className="trip-section-chip">Bundle &amp; save</span>
            </div>

            <div className="stay-grid">
              <section className={`stay-card${hotelIncluded ? "" : " stay-card-off"}`} aria-label="Hotel">
                <div className="stay-kind-row">
                  <span className="stay-kind">Hotel</span>
                  <label className="stay-include">
                    <input
                      type="checkbox"
                      checked={hotelIncluded}
                      onChange={(e) => setHotelIncluded(e.target.checked)}
                      aria-label="Include hotel"
                    />
                    Include
                  </label>
                </div>
                <span className="stay-name">{bundle.hotel.name}</span>
                <span className="stay-loc">{bundle.hotel.area}</span>
                <div className="stay-rows">
                  <div className="stay-row">
                    <span>Rating</span>
                    <span className="stay-rating">★ {bundle.hotel.rating}</span>
                  </div>
                  <div className="stay-row">
                    <span>Stay</span>
                    <span className="stay-qty" aria-live="polite">
                      <button
                        type="button"
                        className="stay-step"
                        aria-label="Fewer nights"
                        disabled={!hotelIncluded || hotelNights <= MIN_NIGHTS}
                        onClick={() => setHotelNights((n) => Math.max(MIN_NIGHTS, n - 1))}
                      >
                        −
                      </button>
                      {plural(hotelNights, "night", "nights")}
                      <button
                        type="button"
                        className="stay-step"
                        aria-label="More nights"
                        disabled={!hotelIncluded || hotelNights >= MAX_NIGHTS}
                        onClick={() => setHotelNights((n) => Math.min(MAX_NIGHTS, n + 1))}
                      >
                        +
                      </button>
                    </span>
                  </div>
                  <div className="stay-row">
                    <span>Per night</span>
                    <span>ETB {formatEtb(bundle.hotel.pricePerNightEtb)}</span>
                  </div>
                  <div className="stay-row stay-row-sub">
                    <span>Estimated</span>
                    <span>ETB {formatEtb(costs.hotelFull)}</span>
                  </div>
                </div>
                {!hotelIncluded && <span className="stay-not-included">Not included</span>}
                <button type="button" className="stay-view-btn">View Hotel</button>
              </section>

              <section className={`stay-card${carIncluded ? "" : " stay-card-off"}`} aria-label="Car rental">
                <div className="stay-kind-row">
                  <span className="stay-kind">Car Rental</span>
                  <label className="stay-include">
                    <input
                      type="checkbox"
                      checked={carIncluded}
                      onChange={(e) => setCarIncluded(e.target.checked)}
                      aria-label="Include car rental"
                    />
                    Include
                  </label>
                </div>
                <span className="stay-name">{bundle.car.car}</span>
                <span className="stay-loc">{bundle.car.company} · {bundle.car.pickup}</span>
                <div className="stay-rows">
                  <div className="stay-row">
                    <span>Pickup</span>
                    <span>{bundle.car.pickup}</span>
                  </div>
                  <div className="stay-row">
                    <span>Rental</span>
                    <span className="stay-qty" aria-live="polite">
                      <button
                        type="button"
                        className="stay-step"
                        aria-label="Fewer days"
                        disabled={!carIncluded || carDays <= MIN_DAYS}
                        onClick={() => setCarDays((d) => Math.max(MIN_DAYS, d - 1))}
                      >
                        −
                      </button>
                      {plural(carDays, "day", "days")}
                      <button
                        type="button"
                        className="stay-step"
                        aria-label="More days"
                        disabled={!carIncluded || carDays >= MAX_DAYS}
                        onClick={() => setCarDays((d) => Math.min(MAX_DAYS, d + 1))}
                      >
                        +
                      </button>
                    </span>
                  </div>
                  <div className="stay-row">
                    <span>Per day</span>
                    <span>ETB {formatEtb(bundle.car.pricePerDayEtb)}</span>
                  </div>
                  <div className="stay-row stay-row-sub">
                    <span>Estimated</span>
                    <span>ETB {formatEtb(costs.carFull)}</span>
                  </div>
                </div>
                {!carIncluded && <span className="stay-not-included">Not included</span>}
                <button type="button" className="stay-view-btn">View Car</button>
              </section>

              <section className={`stay-card stay-card-esim${esimIncluded ? "" : " stay-card-off"}`} aria-label="eSIM">
                <div className="stay-kind-row">
                  <span className="stay-kind">eSIM</span>
                  <label className="stay-include stay-include-esim">
                    <input
                      type="checkbox"
                      checked={esimIncluded}
                      onChange={(e) => setEsimIncluded(e.target.checked)}
                      aria-label="Include eSIM"
                    />
                    Include
                  </label>
                </div>
                <span className="stay-name">{bundle.esim.provider}</span>
                <span className="stay-loc">Instant QR · keeps your number</span>
                <div className="stay-esim-chips">
                  <div className="stay-esim-chip">
                    <strong>{bundle.esim.dataLabel}</strong>
                    <span>Data</span>
                  </div>
                  <div className="stay-esim-chip">
                    <strong>{bundle.esim.validityDays} Days</strong>
                    <span>Validity</span>
                  </div>
                </div>
                <div>
                  <div className="stay-price-line">Price</div>
                  <div className="stay-price-strong">ETB {formatEtb(costs.esimEtb)}</div>
                </div>
                {!esimIncluded && <span className="stay-not-included">Not included</span>}
                <button type="button" className="stay-view-btn">View eSIM</button>
              </section>
            </div>

            {/* ---- Good to know ---- */}
            <div className="trip-section">
              <span className="trip-section-dot" aria-hidden="true" />
              <h2>Good to know</h2>
              <span className="trip-section-chip">Demo data</span>
            </div>

            <div className="gtk-grid">
              <section className="trip-card" aria-label="Visa information">
                <h3 className="gtk-title">Visa Information</h3>
                <p className="gtk-line">
                  {bundle.visa.destination} · Ethiopian passport
                </p>
                <div className="gtk-note">
                  ℹ Demo info only — check the official portal before booking.{" "}
                  {bundle.visa.requirement}.
                </div>
                {bundle.visa.sourceUrl && (
                  <a
                    className="gtk-link"
                    href={bundle.visa.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View Visa Information →
                  </a>
                )}
              </section>

              <section className="trip-card" aria-label="Currency">
                <h3 className="gtk-title">Currency</h3>
                <div className="gtk-currency">
                  <div className="gtk-cur-box">
                    <small>From</small>
                    <strong>ETB · Birr</strong>
                  </div>
                  <span className="gtk-cur-arrow" aria-hidden="true">→</span>
                  <div className="gtk-cur-box">
                    <small>Destination</small>
                    <strong>{bundle.currency.code} · {bundle.currency.name}</strong>
                  </div>
                </div>
                <p className="gtk-cur-note">
                  {bundle.currency.sampleRateLabel ?? "Sample rate for demo"} · Sample
                  rate for demo. Not live data — check the bank rate before travel.
                </p>
              </section>
            </div>

            {/* ---- Restaurants ---- */}
            <div className="trip-section">
              <span className="trip-section-dot" aria-hidden="true" />
              <h2>Ethiopian Restaurants in {bundle.city}</h2>
              <span className="resto-view-all">View all {bundle.restaurants.length} →</span>
            </div>

            <div className="resto-grid">
              {bundle.restaurants.map((r) => (
                <section className="resto-card" key={r.name} aria-label={r.name}>
                  <div className="resto-img resto-ph" aria-hidden="true">🍽️</div>
                  <div className="resto-body">
                    <span className="resto-name">{r.name}</span>
                    <span className="resto-loc">{r.location}, {bundle.city}</span>
                    <span className="resto-meta">Ethiopian Cuisine · {r.priceCategory}</span>
                    <span className="resto-rating">★ {r.rating}</span>
                    <button type="button" className="resto-view">View Restaurant</button>
                  </div>
                </section>
              ))}
            </div>

            {/* ---- Booking banner ---- */}
            <section className="trip-book" aria-label="Booking">
              <span className="trip-book-icon" aria-hidden="true">🏙</span>
              <div className="trip-book-txt">
                <strong>Ready to book this trip?</strong>
                <p>Estimated total ETB {formatEtb(costs.totalEtb)} · Placeholder checkout</p>
              </div>
              <button
                type="button"
                className="trip-book-btn"
                onClick={() => setBookingPlaceholder(true)}
              >
                Continue to Booking
              </button>
              {bookingPlaceholder && (
                <p className="trip-book-note" role="status">
                  Booking is not connected yet — this is a demo placeholder. No
                  reservation has been made and no payment is taken.
                </p>
              )}
            </section>
          </div>

          {/* ================= RIGHT SIDEBAR ================= */}
          <aside className="trip-aside">
            <section className="aside-card" aria-label="Flight cost">
              <h3>Flight Cost</h3>
              <div className="aside-row"><span>Base Fare</span><span>ETB {formatEtb(breakdown.base)}</span></div>
              <div className="aside-row"><span>Taxes</span><span>ETB {formatEtb(breakdown.taxes)}</span></div>
              <div className="aside-row"><span>Fees</span><span>ETB {formatEtb(breakdown.fees)}</span></div>
              <div className="aside-total">
                <span>Flight Total</span>
                <strong>ETB {formatEtb(breakdown.total)}</strong>
              </div>
            </section>

            <section className="aside-card aside-card-green" aria-label="Estimated trip cost">
              <h3>
                Estimated Trip Cost
                <span className="aside-badge">Estimate</span>
              </h3>
              <div className="aside-row-green"><span>Flight</span><span>ETB {formatEtb(costs.flightEtb)}</span></div>
              {hotelIncluded && (
                <div className="aside-row-green"><span>Hotel · {plural(costs.nights, "night", "nights")}</span><span>ETB {formatEtb(costs.hotelEtb)}</span></div>
              )}
              {carIncluded && (
                <div className="aside-row-green"><span>Car · {plural(costs.carDays, "day", "days")}</span><span>ETB {formatEtb(costs.carEtb)}</span></div>
              )}
              {esimIncluded && (
                <div className="aside-row-green"><span>eSIM · {bundle.esim.dataLabel}</span><span>ETB {formatEtb(costs.esimEtb)}</span></div>
              )}
              <div className="aside-grand">
                <div className="aside-grand-label">Estimated Total</div>
                <div className="aside-grand-row">
                  <span className="aside-grand-value">ETB {formatEtb(costs.totalEtb)}</span>
                  <span className="aside-wallet" aria-hidden="true">💳</span>
                </div>
              </div>
              <p className="aside-sample">
                Sample estimate only. Final prices may vary at booking.
              </p>
              <button
                type="button"
                className="aside-book-btn"
                onClick={() => setBookingPlaceholder(true)}
              >
                Continue to Booking
              </button>
              <p className="aside-footnote">Frontend placeholder · No payment taken</p>
            </section>

            <div className="aside-policy">
              <span className="aside-policy-icon" aria-hidden="true">🛡</span>
              <span>
                Free cancellation on hotel &amp; car for 48h. Flight changes per
                airline fare rules.
              </span>
            </div>
          </aside>
        </div>
      </div>

      <Footer />
    </main>
  );
}

export default function TripDetailsPage() {
  return (
    <Suspense
      fallback={
        <main className="trip-page">
          <p className="trip-status">Loading…</p>
        </main>
      }
    >
      <TripDetailsInner />
    </Suspense>
  );
}
