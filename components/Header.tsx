"use client";

import Image from "next/image";
import { useState } from "react";
import { BedIcon, PlaneIcon, CarIcon, UserIcon, MenuIcon } from "./icons";
import Sidebar, { toggleSidebar } from "./Sidebar";
import { setTab } from "../lib/tabEvents";

const tabs = [
  { id: "stays", label: "Stays", Icon: BedIcon },
  { id: "flights", label: "Flights", Icon: PlaneIcon },
  { id: "cars", label: "Cars", Icon: CarIcon },
];

export default function Header() {
  const [active, setActive] = useState("flights");

  return (
    <header className="header">
      <Sidebar />
      <a href="/" className="logo" aria-label="ሃገራዊ home">
        <Image src="/images/hagerawi-logo.svg" alt="ሃገራዊ" width={68} height={70} priority className="logo-img" />
      </a>

      <nav className="tabs" aria-label="Travel type">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={`tab${active === id ? " tab-active" : ""}`}
            aria-current={active === id ? "page" : undefined}
            onClick={() => {
              setActive(id);
              if (id === "stays" || id === "flights") setTab(id);
            }}
          >
            <Icon />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="actions">
        <a href="/signin" className="signin">
          <UserIcon />
          <span>Sign in</span>
        </a>
        <button
          type="button"
          className="menu"
          aria-label="Open menu"
          aria-haspopup="dialog"
          aria-expanded={false}
          onClick={toggleSidebar}
        >
          <MenuIcon />
        </button>
      </div>
    </header>
  );
}
