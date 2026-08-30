// filepath: src/components/home/hero-section.tsx

"use client";

import { useEffect, useState } from "react";
import SearchBar from "@/components/search/hero-search";
import { cn } from "@/lib/utils";

const heroSlides = [
  {
    image:
      "/uploads/hotels/1.png",
    eyebrow: "CURATED STAYS",
    title: "Stay where the coast meets the city",
    description:
      "Curated escapes for slow mornings and bold adventures.",
  },
  {
    image:
      "/uploads/hotels/2.jpeg",
    eyebrow: "DISCOVER BANGLADESH",
    title: "Find your next unforgettable stay",
    description:
      "From city escapes to quiet retreats, discover places worth staying for.",
  },
  {
    image:
      "/uploads/hotels/10.jpeg",
    eyebrow: "STAY YOUR WAY",
    title: "Rooms made for the moments that matter",
    description:
      "Find the right room, the right setting, and the right stay.",
  },
  {
    image:
      "/uploads/hotels/4.jpeg",
    eyebrow: "TRAVEL BEAUTIFULLY",
    title: "A better way to discover hotels",
    description:
      "Explore distinctive stays across Bangladesh with effortless search.",
  },
  {
    image:
      "/uploads/hotels/5.jpeg",
    eyebrow: "YOUR NEXT ESCAPE",
    title: "Stay somewhere you will remember",
    description:
      "Beautiful places, thoughtful rooms, and stays worth coming back to.",
  },
];

export function HeroSection() {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % heroSlides.length);
    }, 7000);

    return () => window.clearInterval(interval);
  }, []);

  const currentSlide = heroSlides[activeSlide];

  return (
    <section className="relative min-h-[100svh] overflow-visible">
      {/* ================================================================
          HERO IMAGE CAROUSEL
          ================================================================ */}
      <div className="absolute inset-0">
  {heroSlides.map((slide, index) => (
    <div
      key={slide.image}
      className={cn(
        "absolute inset-0 transition-opacity duration-1000 ease-out",
        index === activeSlide ? "opacity-100" : "opacity-0"
      )}
      aria-hidden={index !== activeSlide}
    >
      <img
        src={slide.image}
        alt=""
        className="h-full w-full object-cover"
        loading={index === 0 ? "eager" : "lazy"}
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />
    </div>
  ))}

  {/* Theme-aware overall tone */}
  <div
    className="
      absolute inset-0
      bg-white/5
      dark:bg-black/15
    "
  />

  {/* Top → bottom tone */}
  <div
    className="
      absolute inset-0
      bg-linear-to-t
      from-black/20
      via-transparent
      to-white/5
      dark:from-black/35
      dark:via-black/5
      dark:to-black/15
    "
  />

  {/* Left readability */}
  <div
    className="
      absolute inset-y-0 left-0 w-[55%]
      bg-linear-to-r
      from-black/15
      via-black/5
      to-transparent
      dark:from-black/30
      dark:via-black/10
      dark:to-transparent
    "
  />

  {/* Bottom readability */}
  <div
    className="
      absolute inset-x-0 bottom-0 h-72
      bg-linear-to-t
      from-black/20
      to-transparent
      dark:from-black/35
      dark:to-transparent
    "
  />
</div>


      {/* ================================================================
          CONTENT
          ================================================================ */}
      <div className="relative z-10 flex min-h-[100svh] items-end">
        <div className="container mx-auto w-full px-4 pb-16 pt-28 sm:px-6 sm:pb-20 lg:px-8 lg:pb-24">
          <div className="flex flex-col items-start">
            {/* Supporting hero copy */}
            <div className="mb-5 max-w-xl text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.35)] sm:mb-6">
              <div className="mb-3 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/85 backdrop-blur-md">
                {currentSlide.eyebrow}
              </div>

              <h1 className="max-w-lg text-3xl font-semibold leading-[1.05] tracking-tight sm:text-4xl lg:text-[3.35rem]">
                {currentSlide.title}
              </h1>

              <p className="mt-3 max-w-md text-sm leading-6 text-white/75 sm:text-base">
                {currentSlide.description}
              </p>
            </div>

            {/* ============================================================
                SEARCH
                ============================================================ */}
            <div className="w-full max-w-[980px]">
              <SearchBar />
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================
          CAROUSEL DOTS — BOTTOM RIGHT
          ================================================================ */}
      <div
        className="absolute bottom-7 right-5 z-20 flex items-center gap-2 sm:bottom-9 sm:right-8"
        aria-label="Hero slides"
      >
        {heroSlides.map((slide, index) => (
          <button
            key={slide.image}
            type="button"
            aria-label={`Go to slide ${index + 1}`}
            aria-current={index === activeSlide}
            onClick={() => setActiveSlide(index)}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              index === activeSlide
                ? "w-6 bg-white"
                : "w-1.5 bg-white/45 hover:bg-white/75"
            )}
          />
        ))}
      </div>
    </section>
  );
}