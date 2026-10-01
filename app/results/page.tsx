"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import type { SearchResponse } from "@/lib/types";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { airportBackgroundImage } from "@/lib/airports";
import "./results.css";
import FlightCard from "@/components/results/FlightCard";
import FilterPanel from "@/components/results/FilterPanel";
import { tripInfoFor, tripSnapshots } from "@/lib/tripInfo";
import {
  formatEtb,
  sortFlights,
  bestFlightIds,
  applyFilters,
  makeDefaultFilters,
  searchSummary,
  type Filters,
  type SortKey,
} from "@/lib/resultsView";

/**
 * Results page — the post-search experience. Reads ?id=<searchId>, re-fetches
 * the cached search, then renders:
 *   header (route + dates + passengers) → sort tabs (Cheapest default) →
 *   filter sidebar (mobile: bottom-sheet drawer) → ascending flight cards,
 *   each with a short destination travel snapshot. View Details navigates to
 *   the /flight-details page (a real route — no modal).
 */

function ResultsInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id");

  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("cheapest");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(makeDefaultFilters());
  const [draftFilters, setDraftFilters] = useState<Filters>(makeDefaultFilters());

  useEffect(() => {
    if (!id) {
      setError("No search ID provided — run a search from the homepage.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetch(`/api/results?id=${encodeURIComponent(id)}`)
      .then(async (res) => {
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error ?? "Could not load search results.");
        } else {
          setData(json as SearchResponse);
          const maxP = Math.max(
            ...(json as SearchResponse).results.map((f) => f.price.etb),
            1000
          );
          const df = makeDefaultFilters(maxP);
          setFilters(df);
          setDraftFilters(df);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Network error loading results.");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // ----- Derived lists -----

  const allFlights = data?.results ?? [];

  const priceCeiling = useMemo(
    () => Math.max(...allFlights.map((f) => f.price.etb), 1000),
    [allFlights]
  );

  const filtered = useMemo(
    () => applyFilters(allFlights, filters),
    [allFlights, filters]
  );

  const visible = useMemo(
    () => sortFlights(filtered, sortBy),
    [filtered, sortBy]
  );

  const badges = useMemo(() => bestFlightIds(visible), [visible]);

  const summary = useMemo(() => (data ? searchSummary(data) : null), [data]);

  // Short destination travel snapshots for the flight cards.
  const snapshots = useMemo(
    () => tripSnapshots(tripInfoFor(summary?.destCode ?? "")),
    [summary?.destCode]
  );

  // Destination city photo behind the whole page (hero-style). Every airport
  // gets one — its own photo when available, else a deterministic fallback.
  const bgImage = summary ? airportBackgroundImage(summary.destCode) : null;

  // Query string carried to /flight-details so it can reload the same search.
  const searchHref = id ? `?search=${encodeURIComponent(id)}` : "";

  // Count for the drawer button label before applying.
  const drawerResultCount = useMemo(
    () => applyFilters(allFlights, draftFilters).length,
    [allFlights, draftFilters]
  );

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.maxPrice < priceCeiling) n++;
    if (filters.stops.size > 0) n++;
    if (filters.airlines.size > 0) n++;
    if (filters.depWindow) n++;
    if (filters.arrWindow) n++;
    if (filters.baggageOnly) n++;
    return n;
  }, [filters, priceCeiling]);

  const hasResults = !loading && !error && visible.length > 0;

  return (
    <main className="results-page">
      {bgImage !== null && (
        <div className="results-bg" aria-hidden="true">
          <Image src={bgImage} alt="" fill priority sizes="100vw" />
        </div>
      )}
      <div className="results-top">
        <Header />
      </div>

      <div className="results-container">
        {/* ----- Route summary header ----- */}
        {summary && (
          <div className="results-head">
            <div>
              <h1>
                {summary.originCity} → {summary.destCity}
              </h1>
              <p className="results-sub">
                {summary.dates} · {summary.trip} · {summary.passengers} · {summary.cabin} ·{" "}
                {visible.length} of {allFlights.length} flights
              </p>
            </div>
            <button type="button" className="results-back" onClick={() => router.push("/")}>
              Modify search
            </button>
          </div>
        )}

        {/* ----- Sort tabs ----- */}
        <div className="sort-tabs" role="tablist" aria-label="Sort flights">
          {(
            [
              ["cheapest", "Cheapest"],
              ["fastest", "Fastest"],
              ["best", "Best"],
            ] as Array<[SortKey, string]>
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={sortBy === k}
              className={`sort-tab${sortBy === k ? " sort-tab-on" : ""}`}
              onClick={() => setSortBy(k)}
            >
              <span className="sort-tab-label">{label}</span>
              {hasResults && (
                <span className="sort-tab-meta">
                  ETB {formatEtb(sortFlights(filtered, k)[0]?.price.etb ?? 0)}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ----- Content: sidebar + list ----- */}
        <div className="results-body">
          {/* Desktop filter sidebar */}
          <aside className="results-side">
            <FilterPanel
              flights={allFlights}
              draft={filters}
              onDraftChange={setFilters}
              instant
              onReset={() => setFilters(makeDefaultFilters(priceCeiling))}
              resultCount={visible.length}
            />
          </aside>

          {/* ----- Flight list ----- */}
          <div className="results-main">
            {loading && <p className="results-status">Loading fares…</p>}

            {error && (
              <div className="results-status results-error">
                <p>{error}</p>
                <a href="/">← Back to search</a>
              </div>
            )}

            {!loading && !error && visible.length === 0 && (
              <div className="results-status">
                <p>No flights match your filters. Try widening your search.</p>
                <button
                  type="button"
                  className="results-reset-btn"
                  onClick={() => setFilters(makeDefaultFilters(priceCeiling))}
                >
                  Reset filters
                </button>
                <a href="/">← Modify search</a>
              </div>
            )}

            {hasResults && (
              <ul className="flight-list">
                {visible.map((f) => (
                  <FlightCard
                    key={f.id}
                    flight={f}
                    badges={(
                      Object.entries(badges)
                        .filter(([, fid]) => fid === f.id)
                        .map(([k]) => k) as SortKey[]
                    ).filter((k) => k !== "best" || sortBy === "best")}
                    searchHref={searchHref}
                    snapshots={snapshots}
                    originCode={summary?.originCode ?? ""}
                    destCode={summary?.destCode ?? ""}
                    priceNote={summary?.trip === "Round trip" ? "round trip, incl. taxes" : "one way, incl. taxes"}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <Footer />

      {/* ----- Mobile filter drawer ----- */}
      {drawerOpen && (
        <div className="drawer-root">
          <div className="drawer-overlay" onClick={() => setDrawerOpen(false)} />
          <div className="drawer-panel" role="dialog" aria-modal="true" aria-label="Filters">
            <div className="drawer-head">
              <h2>Filters</h2>
              <button type="button" className="drawer-close" onClick={() => setDrawerOpen(false)}>
                Close
              </button>
            </div>
            <div className="drawer-body">
              <FilterPanel
                flights={allFlights}
                draft={draftFilters}
                onDraftChange={setDraftFilters}
                instant={false}
                onApply={() => {
                  setFilters(draftFilters);
                  setDrawerOpen(false);
                }}
                onReset={() => setDraftFilters(makeDefaultFilters(priceCeiling))}
                resultCount={drawerResultCount}
              />
            </div>
          </div>
        </div>
      )}

      {/* ----- Mobile filter FAB ----- */}
      {hasResults && (
        <button
          type="button"
          className="filters-fab"
          onClick={() => {
            setDraftFilters(filters);
            setDrawerOpen(true);
          }}
        >
          Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </button>
      )}
    </main>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <main className="results-page">
          <p className="results-status">Loading…</p>
        </main>
      }
    >
      <ResultsInner />
    </Suspense>
  );
}
