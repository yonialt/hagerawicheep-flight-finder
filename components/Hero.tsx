"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Header from "./Header";
import SearchBar from "./SearchBar";

const slides = [
  { src: "/images/dubai.jpg", place: "Dubai, UAE" },
  { src: "/images/new-york.jpg", place: "New York, USA" },
  { src: "/images/addis-ababa.jpg", place: "Addis Ababa, Ethiopia" },
  { src: "/images/hawassa.jpg", place: "Hawassa, Ethiopia" },
];

export default function Hero() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setActive((i) => (i + 1) % slides.length), 6500);
    return () => clearInterval(id);
  }, [active]);

  return (
    <section className="hero">
      {slides.map((s, i) => (
        <div key={s.src} className={`slide${i === active ? " slide-on" : ""}`} aria-hidden={i !== active}>
          <Image src={s.src} alt={s.place} fill priority={i === 0} sizes="100vw" quality={90} />
        </div>
      ))}
      <div className="shade" />

      <Header />

      <div className="search-wrap">
        <SearchBar />
      </div>

      <div className="caption">
        <span className="caption-place">{slides[active].place}</span>
        <div className="dots" role="group" aria-label="Choose background photo">
          {slides.map((s, i) => (
            <button
              key={s.src}
              type="button"
              className={`dot${i === active ? " dot-on" : ""}`}
              aria-label={`Show ${s.place}`}
              aria-pressed={i === active}
              onClick={() => setActive(i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
