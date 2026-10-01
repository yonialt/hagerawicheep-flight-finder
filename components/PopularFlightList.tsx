"use client";

import { useState } from "react";
import { seedRoute } from "../lib/searchEvents";
import { ChevronDownIcon } from "./icons";

/**
 * "Popular Flight List" section (mockup: flight list.png) — three columns of
 * destination accordions. The first panel (Addis → Hawassa) is open by
 * default, mirroring the mockup's open "Las Vegas Flights". Each row link
 * prefills the search bar (origin + destination) via the seedRoute event.
 */

interface RouteRow {
  from: string;
  to: string;
  priceEtb: number;
}

interface Accordion {
  id: string;
  city: string;
  country: string;
  rows: RouteRow[];
}

function etb(n: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

function rowLabel(r: RouteRow): string {
  return `Flight ${r.from} - ${r.to}`;
}

const ADDIS = "Addis Ababa";

const ACCORDIONS: Accordion[] = [
  {
    id: "hawassa",
    city: "Hawassa",
    country: "Ethiopia",
    rows: [
      { from: ADDIS, to: "Hawassa", priceEtb: 4200 },
      { from: "Bahir Dar", to: "Hawassa", priceEtb: 5100 },
      { from: "Dire Dawa", to: "Hawassa", priceEtb: 5450 },
      { from: "Mekelle", to: "Hawassa", priceEtb: 5900 },
      { from: "Gondar", to: "Hawassa", priceEtb: 6100 },
      { from: "Jimma", to: "Hawassa", priceEtb: 5600 },
    ],
  },
  {
    id: "dubai",
    city: "Dubai",
    country: "UAE",
    rows: [
      { from: ADDIS, to: "Dubai", priceEtb: 38500 },
      { from: "Nairobi", to: "Dubai", priceEtb: 44200 },
      { from: "Jeddah", to: "Dubai", priceEtb: 29800 },
      { from: "Cairo", to: "Dubai", priceEtb: 31500 },
      { from: "Istanbul", to: "Dubai", priceEtb: 36400 },
      { from: "Mumbai", to: "Dubai", priceEtb: 27300 },
    ],
  },
  {
    id: "nairobi",
    city: "Nairobi",
    country: "Kenya",
    rows: [
      { from: ADDIS, to: "Nairobi", priceEtb: 18900 },
      { from: "Dubai", to: "Nairobi", priceEtb: 34700 },
      { from: "Jeddah", to: "Nairobi", priceEtb: 30200 },
      { from: "Cairo", to: "Nairobi", priceEtb: 33100 },
      { from: "Istanbul", to: "Nairobi", priceEtb: 41800 },
      { from: "London", to: "Nairobi", priceEtb: 58600 },
    ],
  },
  {
    id: "jeddah",
    city: "Jeddah",
    country: "Saudi Arabia",
    rows: [
      { from: ADDIS, to: "Jeddah", priceEtb: 21400 },
      { from: "Dubai", to: "Jeddah", priceEtb: 28900 },
      { from: "Nairobi", to: "Jeddah", priceEtb: 31600 },
      { from: "Cairo", to: "Jeddah", priceEtb: 24700 },
      { from: "Istanbul", to: "Jeddah", priceEtb: 33800 },
      { from: "Mumbai", to: "Jeddah", priceEtb: 29400 },
    ],
  },
  {
    id: "istanbul",
    city: "Istanbul",
    country: "Turkiye",
    rows: [
      { from: ADDIS, to: "Istanbul", priceEtb: 42300 },
      { from: "Dubai", to: "Istanbul", priceEtb: 37600 },
      { from: "Nairobi", to: "Istanbul", priceEtb: 45100 },
      { from: "Cairo", to: "Istanbul", priceEtb: 31200 },
      { from: "London", to: "Istanbul", priceEtb: 35900 },
      { from: "Frankfurt", to: "Istanbul", priceEtb: 34400 },
    ],
  },
  {
    id: "cairo",
    city: "Cairo",
    country: "Egypt",
    rows: [
      { from: ADDIS, to: "Cairo", priceEtb: 23800 },
      { from: "Dubai", to: "Cairo", priceEtb: 30800 },
      { from: "Nairobi", to: "Cairo", priceEtb: 32500 },
      { from: "Jeddah", to: "Cairo", priceEtb: 24100 },
      { from: "Istanbul", to: "Cairo", priceEtb: 29700 },
      { from: "Frankfurt", to: "Cairo", priceEtb: 38200 },
    ],
  },
  {
    id: "new-york",
    city: "New York",
    country: "USA",
    rows: [
      { from: ADDIS, to: "New York", priceEtb: 96500 },
      { from: "Dubai", to: "New York", priceEtb: 88400 },
      { from: "London", to: "New York", priceEtb: 62300 },
      { from: "Frankfurt", to: "New York", priceEtb: 65100 },
      { from: "Istanbul", to: "New York", priceEtb: 71200 },
      { from: "Cairo", to: "New York", priceEtb: 79800 },
    ],
  },
  {
    id: "london",
    city: "London",
    country: "UK",
    rows: [
      { from: ADDIS, to: "London", priceEtb: 78200 },
      { from: "Dubai", to: "London", priceEtb: 59600 },
      { from: "Frankfurt", to: "London", priceEtb: 43100 },
      { from: "Istanbul", to: "London", priceEtb: 40800 },
      { from: "Cairo", to: "London", priceEtb: 47500 },
      { from: "New York", to: "London", priceEtb: 55300 },
    ],
  },
  {
    id: "frankfurt",
    city: "Frankfurt",
    country: "Germany",
    rows: [
      { from: ADDIS, to: "Frankfurt", priceEtb: 71500 },
      { from: "Dubai", to: "Frankfurt", priceEtb: 54200 },
      { from: "London", to: "Frankfurt", priceEtb: 38900 },
      { from: "Istanbul", to: "Frankfurt", priceEtb: 36400 },
      { from: "Cairo", to: "Frankfurt", priceEtb: 41200 },
      { from: "New York", to: "Frankfurt", priceEtb: 60800 },
    ],
  },
  {
    id: "mumbai",
    city: "Mumbai",
    country: "India",
    rows: [
      { from: ADDIS, to: "Mumbai", priceEtb: 36900 },
      { from: "Dubai", to: "Mumbai", priceEtb: 24800 },
      { from: "Nairobi", to: "Mumbai", priceEtb: 41200 },
      { from: "Jeddah", to: "Mumbai", priceEtb: 28600 },
      { from: "Istanbul", to: "Mumbai", priceEtb: 39400 },
      { from: "Cairo", to: "Mumbai", priceEtb: 35700 },
    ],
  },
  {
    id: "beijing",
    city: "Beijing",
    country: "China",
    rows: [
      { from: ADDIS, to: "Beijing", priceEtb: 89400 },
      { from: "Dubai", to: "Beijing", priceEtb: 67300 },
      { from: "Istanbul", to: "Beijing", priceEtb: 74100 },
      { from: "Frankfurt", to: "Beijing", priceEtb: 78200 },
      { from: "Cairo", to: "Beijing", priceEtb: 81600 },
      { from: "Mumbai", to: "Beijing", priceEtb: 58900 },
    ],
  },
  {
    id: "cape-town",
    city: "Cape Town",
    country: "South Africa",
    rows: [
      { from: ADDIS, to: "Cape Town", priceEtb: 52300 },
      { from: "Nairobi", to: "Cape Town", priceEtb: 48700 },
      { from: "Dubai", to: "Cape Town", priceEtb: 61400 },
      { from: "Jeddah", to: "Cape Town", priceEtb: 59200 },
      { from: "Istanbul", to: "Cape Town", priceEtb: 72300 },
      { from: "London", to: "Cape Town", priceEtb: 76800 },
    ],
  },
  {
    id: "washington",
    city: "Washington",
    country: "USA",
    rows: [
      { from: ADDIS, to: "Washington", priceEtb: 92800 },
      { from: "Dubai", to: "Washington", priceEtb: 85100 },
      { from: "London", to: "Washington", priceEtb: 64700 },
      { from: "Frankfurt", to: "Washington", priceEtb: 66300 },
      { from: "Istanbul", to: "Washington", priceEtb: 72900 },
      { from: "Cairo", to: "Washington", priceEtb: 77400 },
    ],
  },
  {
    id: "bahir-dar",
    city: "Bahir Dar",
    country: "Ethiopia",
    rows: [
      { from: ADDIS, to: "Bahir Dar", priceEtb: 4600 },
      { from: "Hawassa", to: "Bahir Dar", priceEtb: 5300 },
      { from: "Dire Dawa", to: "Bahir Dar", priceEtb: 5150 },
      { from: "Mekelle", to: "Bahir Dar", priceEtb: 4900 },
      { from: "Gondar", to: "Bahir Dar", priceEtb: 4400 },
      { from: "Jimma", to: "Bahir Dar", priceEtb: 5500 },
    ],
  },
  {
    id: "mekelle",
    city: "Mekelle",
    country: "Ethiopia",
    rows: [
      { from: ADDIS, to: "Mekelle", priceEtb: 4800 },
      { from: "Bahir Dar", to: "Mekelle", priceEtb: 5100 },
      { from: "Dire Dawa", to: "Mekelle", priceEtb: 5250 },
      { from: "Hawassa", to: "Mekelle", priceEtb: 5950 },
      { from: "Gondar", to: "Mekelle", priceEtb: 4700 },
      { from: "Jimma", to: "Mekelle", priceEtb: 6100 },
    ],
  },
  {
    id: "gondar",
    city: "Gondar",
    country: "Ethiopia",
    rows: [
      { from: ADDIS, to: "Gondar", priceEtb: 4500 },
      { from: "Bahir Dar", to: "Gondar", priceEtb: 4300 },
      { from: "Mekelle", to: "Gondar", priceEtb: 4950 },
      { from: "Hawassa", to: "Gondar", priceEtb: 6200 },
      { from: "Dire Dawa", to: "Gondar", priceEtb: 5700 },
      { from: "Jimma", to: "Gondar", priceEtb: 5900 },
    ],
  },
];

// Column layout: left column gets one extra item when the count is uneven,
// mirroring the mockup's taller first column.
const COLUMNS: Accordion[][] = [
  ACCORDIONS.filter((_, i) => i % 3 === 0),
  ACCORDIONS.filter((_, i) => i % 3 === 1),
  ACCORDIONS.filter((_, i) => i % 3 === 2),
];

export default function PopularFlightList() {
  // First panel (Hawassa) starts open, like the mockup.
  const [openId, setOpenId] = useState<string | null>("hawassa");

  const toggle = (id: string) => setOpenId((cur) => (cur === id ? null : id));

  const renderAccordion = (a: Accordion) => {
    const open = openId === a.id;
    return (
      <div key={a.id} className="pfl-item">
        <button
          type="button"
          className="pfl-head"
          aria-expanded={open}
          aria-controls={`pfl-panel-${a.id}`}
          onClick={() => toggle(a.id)}
        >
          <span className="pfl-city">{a.city} Flights</span>
          <span className={`pfl-chevron${open ? " pfl-chevron-up" : ""}`} aria-hidden="true">
            <ChevronDownIcon />
          </span>
        </button>
        {open && (
          <ul className="pfl-panel" id={`pfl-panel-${a.id}`}>
            {a.rows.map((r) => (
              <li key={`${r.from}-${r.to}`} className="pfl-row">
                <a
                  href="#"
                  className="pfl-link"
                  onClick={(e) => {
                    e.preventDefault();
                    seedRoute(r.from, r.to);
                  }}
                >
                  {rowLabel(r)}
                </a>
                <span className="pfl-price">ETB {etb(r.priceEtb)}+</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  return (
    <section className="pfl" aria-labelledby="pfl-heading">
      <h2 id="pfl-heading" className="pfl-heading">Popular flight list</h2>
      <div className="pfl-columns">
        {COLUMNS.map((col, i) => (
          <div key={i} className="pfl-col">
            {col.map(renderAccordion)}
          </div>
        ))}
      </div>
    </section>
  );
}
