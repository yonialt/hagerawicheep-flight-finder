"use client";

import { useState } from "react";
import { seedDestination } from "../lib/searchEvents";
import { ChevronDownIcon } from "./icons";

/**
 * "Popular hotel list" section (mockup: HotelListings.png) — three columns of
 * city accordions. The first panel (Las Vegas) is open by default, mirroring
 * the mockup. Each hotel row link prefills the destination field via the
 * seedDestination event, same handoff as the Popular Flight List.
 */

interface HotelRow {
  name: string;
  priceUsd: number;
}

interface HotelAccordion {
  id: string;
  city: string;
  rows: HotelRow[];
}

function usd(n: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

const ACCORDIONS: HotelAccordion[] = [
  {
    id: "las-vegas",
    city: "Las Vegas",
    rows: [
      { name: "OYO Hotel And Casino Las Vegas", priceUsd: 10 },
      { name: "Westgate Las Vegas Resort and Casino", priceUsd: 30 },
      { name: "Circus Circus Hotel, Casino & Theme Park", priceUsd: 35 },
      { name: "Alexis Park All Suite Resort", priceUsd: 37 },
      { name: "Tuscany Suites & Casino", priceUsd: 43 },
      { name: "Planet Hollywood Resort & Casino", priceUsd: 45 },
      { name: "Plaza Hotel & Casino", priceUsd: 47 },
      { name: "Silver Sevens Hotel and Casino, a Wyndham Garden", priceUsd: 48 },
      { name: "Downtown Grand Hotel & Casino", priceUsd: 48 },
      { name: "Excalibur Hotel & Casino", priceUsd: 49 },
    ],
  },
  {
    id: "boston",
    city: "Boston",
    rows: [
      { name: "Chandler Inn", priceUsd: 89 },
      { name: "The Godfrey Hotel Boston", priceUsd: 129 },
      { name: "Copley Square Hotel", priceUsd: 139 },
      { name: "Midtown Hotel", priceUsd: 149 },
      { name: "Hilton Boston Downtown", priceUsd: 179 },
    ],
  },
  {
    id: "denver",
    city: "Denver",
    rows: [
      { name: "The Curtis Hotel", priceUsd: 79 },
      { name: "Kimpton Hotel Born", priceUsd: 189 },
      { name: "The Oxford Hotel", priceUsd: 159 },
      { name: "Warwick Denver", priceUsd: 139 },
      { name: "Grand Hyatt Denver", priceUsd: 169 },
    ],
  },
  {
    id: "san-francisco",
    city: "San Francisco",
    rows: [
      { name: "Hotel Zephyr", priceUsd: 119 },
      { name: "Beck's Motor Lodge", priceUsd: 99 },
      { name: "Hotel Caza", priceUsd: 149 },
      { name: "The Fairmont Heritage Place", priceUsd: 249 },
      { name: "Hyatt Regency SF", priceUsd: 189 },
    ],
  },
  {
    id: "philadelphia",
    city: "Philadelphia",
    rows: [
      { name: "The Independent Hotel", priceUsd: 99 },
      { name: "Kimpton Hotel Palomar", priceUsd: 149 },
      { name: "The Logan Philadelphia", priceUsd: 169 },
      { name: "Sonesta Philadelphia", priceUsd: 139 },
      { name: "The Notary Hotel", priceUsd: 159 },
    ],
  },
  {
    id: "atlanta",
    city: "Atlanta",
    rows: [
      { name: "The Candler Hotel", priceUsd: 109 },
      { name: "Hotel Midtown", priceUsd: 129 },
      { name: "The Burgess Hotel", priceUsd: 159 },
      { name: "Glenn Hotel Autograph", priceUsd: 149 },
      { name: "Ellis Hotel", priceUsd: 139 },
    ],
  },
  {
    id: "new-york",
    city: "New York",
    rows: [
      { name: "The Jane Hotel", priceUsd: 89 },
      { name: "Moxy NYC Times Square", priceUsd: 129 },
      { name: "Pod 51 Hotel", priceUsd: 99 },
      { name: "The Watson Hotel", priceUsd: 119 },
      { name: "Hotel Edison Times Square", priceUsd: 149 },
      { name: "The New Yorker Hotel", priceUsd: 139 },
    ],
  },
  {
    id: "london",
    city: "London",
    rows: [
      { name: "The Z Hotel Paddington", priceUsd: 79 },
      { name: "Point A Hotel Paddington", priceUsd: 89 },
      { name: "Hub by Premier Inn Westminster", priceUsd: 99 },
      { name: "Premier Inn County Hall", priceUsd: 109 },
      { name: "CitizenM Tower of London", priceUsd: 129 },
    ],
  },
  {
    id: "los-angeles",
    city: "Los Angeles",
    rows: [
      { name: "Hollywood Palms Inns & Suites", priceUsd: 89 },
      { name: "The Line Hotel", priceUsd: 149 },
      { name: "Hotel Figueroa", priceUsd: 159 },
      { name: "Shore Hotel Santa Monica", priceUsd: 189 },
      { name: "The Hollywood Roosevelt", priceUsd: 199 },
    ],
  },
  {
    id: "orlando",
    city: "Orlando",
    rows: [
      { name: "Rosen Inn Pointe Orlando", priceUsd: 59 },
      { name: "Westgate Lakes Resort", priceUsd: 99 },
      { name: "Lake Buena Vista Resort Village", priceUsd: 119 },
      { name: "Wyndham Grand Bonnet Creek", priceUsd: 139 },
      { name: "Signia by Hilton Bonnet Creek", priceUsd: 159 },
    ],
  },
  {
    id: "miami",
    city: "Miami",
    rows: [
      { name: "South Beach Hotel", priceUsd: 99 },
      { name: "The Balfour Hotel", priceUsd: 129 },
      { name: "Freehand Miami", priceUsd: 109 },
      { name: "The Palms Hotel & Spa", priceUsd: 179 },
      { name: "Shelborne South Beach", priceUsd: 149 },
    ],
  },
  {
    id: "honolulu",
    city: "Honolulu",
    rows: [
      { name: "Alohilani Resort Waikiki Beach", priceUsd: 149 },
      { name: "Hyatt Place Waikiki Beach", priceUsd: 169 },
      { name: "Park Shore Waikiki", priceUsd: 139 },
      { name: "Hilton Garden Inn Waikiki", priceUsd: 189 },
      { name: "The Laylow Autograph Collection", priceUsd: 199 },
    ],
  },
  {
    id: "ocean-city",
    city: "Ocean City",
    rows: [
      { name: "Commander Hotel", priceUsd: 89 },
      { name: "Dunes Manor Hotel", priceUsd: 99 },
      { name: "Princess Bayside Hotel", priceUsd: 109 },
      { name: "Hilton Ocean City", priceUsd: 149 },
      { name: "Fenwick Islander Motel", priceUsd: 79 },
    ],
  },
  {
    id: "chicago",
    city: "Chicago",
    rows: [
      { name: "Freehand Chicago", priceUsd: 79 },
      { name: "Hotel Versey Days Inn", priceUsd: 89 },
      { name: "The Hoxton Chicago", priceUsd: 129 },
      { name: "Hotel Zachary", priceUsd: 149 },
      { name: "LondonHouse Chicago", priceUsd: 169 },
    ],
  },
  {
    id: "san-diego",
    city: "San Diego",
    rows: [
      { name: "Old Town Western Inn & Suites", priceUsd: 79 },
      { name: "Hotel Indigo Gaslamp", priceUsd: 129 },
      { name: "The Guild Hotel", priceUsd: 119 },
      { name: "Pendry San Diego", priceUsd: 199 },
      { name: "Hotel Del Coronado", priceUsd: 249 },
    ],
  },
  {
    id: "seattle",
    city: "Seattle",
    rows: [
      { name: "Hotel Max", priceUsd: 99 },
      { name: "The Loyal Inn", priceUsd: 89 },
      { name: "Palm Court Hotel", priceUsd: 109 },
      { name: "Thompson Seattle", priceUsd: 169 },
      { name: "Fairmont Olympic Hotel", priceUsd: 199 },
    ],
  },
  {
    id: "nashville",
    city: "Nashville",
    rows: [
      { name: "Dream Nashville", priceUsd: 119 },
      { name: "The Metropolitan Inn", priceUsd: 79 },
      { name: "Bobby Hotel", priceUsd: 139 },
      { name: "The Joseph Nashville", priceUsd: 219 },
      { name: "Noelle Nashville", priceUsd: 159 },
    ],
  },
  {
    id: "key-west",
    city: "Key West",
    rows: [
      { name: "Seaport Inn Key West", priceUsd: 99 },
      { name: "NYAH Key West", priceUsd: 129 },
      { name: "Best Western Hibiscus Motel", priceUsd: 109 },
      { name: "Ocean Key Resort", priceUsd: 229 },
      { name: "Southernmost Beach Resort", priceUsd: 189 },
    ],
  },
  {
    id: "tokyo",
    city: "Tokyo",
    rows: [
      { name: "UNPLAN Kagurazaka", priceUsd: 49 },
      { name: "Hotel Graphy Nezu", priceUsd: 59 },
      { name: "the b Tokyo Akasaka", priceUsd: 79 },
      { name: "Hotel Gracery Shinjuku", priceUsd: 109 },
      { name: "Park Hyatt Tokyo", priceUsd: 299 },
    ],
  },
  {
    id: "myrtle-beach",
    city: "Myrtle Beach",
    rows: [
      { name: "Landmark Resort", priceUsd: 69 },
      { name: "Caravelle Resort", priceUsd: 79 },
      { name: "Westgate Myrtle Beach", priceUsd: 99 },
      { name: "The Breakers Resort", priceUsd: 89 },
      { name: "Hilton Myrtle Beach Resort", priceUsd: 129 },
    ],
  },
];

// Column layout exactly as the mockup: 6 / 7 / 7 cities.
const COLUMNS: HotelAccordion[][] = [
  ["las-vegas", "boston", "denver", "san-francisco", "philadelphia", "atlanta"],
  ["new-york", "london", "los-angeles", "orlando", "miami", "honolulu", "ocean-city"],
  ["chicago", "san-diego", "seattle", "nashville", "key-west", "tokyo", "myrtle-beach"],
].map((ids) =>
  ids
    .map((id) => ACCORDIONS.find((a) => a.id === id))
    .filter((a): a is HotelAccordion => Boolean(a))
);

export default function HotelListings() {
  // First panel (Las Vegas) starts open, like the mockup.
  const [openId, setOpenId] = useState<string | null>("las-vegas");

  const toggle = (id: string) => setOpenId((cur) => (cur === id ? null : id));

  const renderAccordion = (a: HotelAccordion) => {
    const open = openId === a.id;
    return (
      <div key={a.id} className="pfl-item">
        <button
          type="button"
          className="pfl-head"
          aria-expanded={open}
          aria-controls={`hl-panel-${a.id}`}
          onClick={() => toggle(a.id)}
        >
          <span className="pfl-city">{a.city} Hotels</span>
          <span className={`pfl-chevron${open ? " pfl-chevron-up" : ""}`} aria-hidden="true">
            <ChevronDownIcon />
          </span>
        </button>
        {open && (
          <ul className="pfl-panel" id={`hl-panel-${a.id}`}>
            {a.rows.map((r) => (
              <li key={r.name} className="pfl-row">
                <a
                  href="#"
                  className="pfl-link"
                  onClick={(e) => {
                    e.preventDefault();
                    seedDestination(a.city);
                  }}
                >
                  {r.name}
                </a>
                <span className="pfl-price">${usd(r.priceUsd)}+</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  return (
    <section className="pfl" aria-labelledby="hl-heading">
      <h2 id="hl-heading" className="pfl-heading">Popular hotel list</h2>
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
