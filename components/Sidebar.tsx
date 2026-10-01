"use client";

import { useEffect, useState } from "react";
import {
  PlaneIcon,
  BedIcon,
  CarIcon,
  PackageIcon,
  CruiseIcon,
  PlanAiIcon,
  PinIcon,
  ChartIcon,
  TagIcon,
  GlobeIcon,
  SendIcon,
  TipsIcon,
  BriefcaseIcon,
  HeartIcon,
  DollarIcon,
  FeedbackIcon,
  CloseIcon,
} from "./icons";

/**
 * Slide-in sidebar opened by the header hamburger button (mockup: sodebars.png).
 * Self-contained: owns its open state so Header stays presentational —
 * the menu button just dispatches the same toggle event from anywhere.
 */

const MAIN_LINKS = [
  { id: "flights", label: "Flights", Icon: PlaneIcon },
  { id: "stays", label: "Stays", Icon: BedIcon },
  { id: "cars", label: "Cars", Icon: CarIcon },
  { id: "packages", label: "Packages", Icon: PackageIcon, accent: "orange" },
  { id: "cruises", label: "Cruises", Icon: CruiseIcon },
  { id: "plan-ai", label: "Plan with AI", Icon: PlanAiIcon, accent: "blue" },
];

const TOOL_LINKS = [
  { id: "plan-trip", label: "Plan your trip", Icon: PinIcon, accent: "orange" },
  { id: "airfare-trends", label: "Airfare Trends", Icon: ChartIcon },
  { id: "deals", label: "Monthly Flight Deals", Icon: TagIcon, accent: "teal" },
  { id: "explore", label: "Explore", Icon: GlobeIcon },
  { id: "tracker", label: "Flight Tracker", Icon: SendIcon },
  { id: "tips", label: "Travel tips", Icon: TipsIcon },
  { id: "business", label: "Hagerawi for Business", Icon: BriefcaseIcon, badge: "NEW" },
];

interface SidebarItem {
  id: string;
  label: string;
  Icon: () => React.ReactElement;
  accent?: string;
  badge?: string;
}

export const SIDEBAR_TOGGLE_EVENT = "hagerawi:toggle-sidebar";

export function toggleSidebar(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SIDEBAR_TOGGLE_EVENT));
}

export default function Sidebar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onToggle = () => setOpen((o) => !o);
    window.addEventListener(SIDEBAR_TOGGLE_EVENT, onToggle);
    return () => window.removeEventListener(SIDEBAR_TOGGLE_EVENT, onToggle);
  }, []);

  // Lock body scroll + close on Escape while open.
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const renderItem = ({ id, label, Icon, accent, badge }: SidebarItem) => (
    <li key={id}>
      <a
        href={`/${id}`}
        className={`sb-item${accent ? ` sb-${accent}` : ""}`}
        onClick={() => setOpen(false)}
      >
        <span className="sb-ic" aria-hidden="true">
          <Icon />
        </span>
        <span className="sb-label">{label}</span>
        {badge && <span className="sb-badge">{badge}</span>}
      </a>
    </li>
  );

  return (
    <>
      <div
        className={`sb-overlay${open ? " sb-overlay-on" : ""}`}
        aria-hidden="true"
        onClick={() => setOpen(false)}
      />
      <aside
        id="site-sidebar"
        className={`sb-panel${open ? " sb-panel-on" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        aria-hidden={!open}
      >
        <div className="sb-head">
          <span className="sb-title">Menu</span>
          <button
            type="button"
            className="sb-close"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          >
            <CloseIcon />
          </button>
        </div>

        <nav className="sb-nav" aria-label="Travel types">
          <ul className="sb-group">{MAIN_LINKS.map(renderItem)}</ul>
          <ul className="sb-group sb-group-border">{TOOL_LINKS.map(renderItem)}</ul>
        </nav>

        <div className="sb-foot">
          <ul className="sb-group">
            {renderItem({ id: "trips", label: "Trips", Icon: HeartIcon })}
          </ul>
          <ul className="sb-group sb-group-border">
            {renderItem({ id: "language", label: "English", Icon: GlobeIcon })}
            {renderItem({ id: "currency", label: "ETB — Ethiopian birr", Icon: DollarIcon, accent: "teal" })}
            {renderItem({ id: "feedback", label: "Feedback", Icon: FeedbackIcon })}
          </ul>
        </div>
      </aside>
    </>
  );
}
