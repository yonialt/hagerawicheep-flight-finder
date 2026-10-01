"use client";

import { useEffect, useState } from "react";
import PopularFlightList from "./PopularFlightList";
import HotelListings from "./HotelListings";
import { onTabChange, type HomeTab } from "../lib/tabEvents";

/**
 * Sits below the hero and swaps the content section based on the navbar tab:
 * Flights → Popular Flight List (mockup: flight list.png)
 * Stays   → Hotel Listings (mockup: HotelListings.png)
 *
 * Header broadcasts the tab via lib/tabEvents CustomEvent, keeping Header
 * and these sections decoupled (same pattern as searchEvents.ts).
 */

export default function HomeSections() {
  // "flights" is the default view; Header also defaults to Flights.
  const [tab, setTabState] = useState<HomeTab>("flights");

  useEffect(() => {
    return onTabChange(setTabState);
  }, []);

  return tab === "stays" ? <HotelListings /> : <PopularFlightList />;
}
