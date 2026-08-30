// filepath: src/components/home/hero-section.tsx

"use client";

import { useEffect, useState } from "react";
import SearchBar from "@/components/search/hero-search";
import { cn } from "@/lib/utils";

const fallbackSlides = [
  {
    image: "/uploads/hotels/1.png",
    eyebrow: "CURATED STAYS",
    title: "Stay where the coast meets the city",
    description: "Curated escapes for slow mornings and bold adventures.",
  },
  {
    image: "/uploads/hotels/2.jpeg",
    eyebrow: "DISCOVER BANGLADESH",
    title: "Find your next unforgettable stay",
    description: "From city escapes to quiet retreats, discover places worth staying for.",
  },
  {
    image: "/uploads/hotels/10.jpeg",
    eyebrow: "STAY YOUR WAY",
    title: "Rooms made for the moments that matter",
    description: "Find the right room, the right setting, and the right stay.",
  },
  {
    image: "/uploads/hotels/4.jpeg",
    eyebrow: "TRAVEL BEAUTIFULLY",
    title: "A better way to discover hotels",
    description: "Explore distinctive stays across Bangladesh with effortless search.",
  },
  {
    image: "/uploads/hotels/5.jpeg",
    eyebrow: "YOUR NEXT ESCAPE",
    title: "Stay somewhere you will remember",
    description: "Beautiful places, thoughtful rooms, and stays worth coming back to.",
  },
];

export function HeroSection() {
  const [activeSlide, setActiveSlide] = useState(0);
  // Start empty — only populated after the fetch resolves
  const [heroSlides, setHeroSlides] = useState<any[]>([]);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const res = await fetch("/api/public/hero-banners");
        const data = await res.json();
        if (data.success && data.data.length > 0) {
          // CMS has banners — use them exclusively
          const mappedBanners = data.data.map((banner: any) => ({
            image: banner.image_url,
            eyebrow: banner.eyebrow,
            title: banner.title,
            description: banner.description,
          }));
          setHeroSlides(mappedBanners);
        } else {
          // CMS returned nothing — fall back to local slides
          setHeroSlides(fallbackSlides);
        }
      } catch (error) {
        console.error("Failed to fetch hero banners:", error);
        // Network / parse error — fall back to local slides
        setHeroSlides(fallbackSlides);
      }
    };

    void fetchBanners();
  }, [])

  useEffect(() => {
    if (heroSlides.length === 0) return;
    
    const interval = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % heroSlides.length);
    }, 7000);

    return () => window.clearInterval(interval);
  }, [heroSlides.length]);

  const currentSlide = heroSlides[activeSlide] || heroSlides[0];

  if (!currentSlide) return null;

  return (
<section className="relative h-[100svh] min-h-[720px] overflow-visible">

      {/* ================================================================
          HERO IMAGE CAROUSEL
          ================================================================ */}
      <div className="absolute inset-0">
  {heroSlides.map((slide, index) => (
    <div
      key={index}
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

  {/* Theme-aware overall tone: very subtle white in light, subtle black in dark */}
  <div
    className="
      absolute inset-0
      bg-white/8
      dark:bg-black/20
    "
  />

  {/* Top → bottom tone */}
  <div
    className="
      absolute inset-0
      bg-gradient-to-t
      from-white/10 via-transparent to-white/5
      dark:from-black/30 dark:via-black/5 dark:to-black/10
    "
  />

  {/* Left readability gradient */}
  <div
    className="
      absolute inset-y-0 left-0 w-[55%]
      bg-gradient-to-r
      from-white/12 via-white/5 to-transparent
      dark:from-black/25 dark:via-black/8 dark:to-transparent
    "
  />

  {/* Bottom readability gradient */}
  <div
    className="
      absolute inset-x-0 bottom-0 h-72
      bg-gradient-to-t
      from-white/15 to-transparent
      dark:from-black/30 dark:to-transparent
    "
  />
</div>


      {/* ================================================================
          CONTENT
          ================================================================ */}
      <div className="relative z-10 flex min-h-[100svh] items-end">
        <div className="container mx-auto w-full px-4 pb-16 pt-28 sm:px-6 sm:pb-20 lg:px-8 lg:pb-24">
          <div className="flex w-full flex-col">
            {/* Supporting hero copy */}
            <div className="mb-5 flex flex-col items-start sm:mb-6">
              {/* Hero copy — drop-shadow aids readability on photograph */}
              <div className="max-w-xl drop-shadow-[0_2px_20px_rgba(0,0,0,0.28)] dark:drop-shadow-[0_2px_20px_rgba(0,0,0,0.50)]">
                {/* Eyebrow badge — foreground-tinted in light, white-tinted in dark */}
                <div className="mb-3 inline-flex items-center rounded-full border border-foreground/20 bg-foreground/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground/75 backdrop-blur-md dark:border-white/20 dark:bg-white/10 dark:text-white/85">
                  {currentSlide.eyebrow}
                </div>

                {/* Main heading: dark text in light mode, white in dark */}
                <h1
  className="
    mx-auto
    max-w-[850px]
    text-3xl
    font-semibold
    leading-[1.05]
    tracking-tight
    sm:text-4xl
    lg:text-[3.35rem]
  "
>
  {currentSlide.title}
</h1>

                {/* Description: foreground/70 in light, white/75 in dark */}
                <p className="mt-3 max-w-md text-sm leading-6 text-foreground/70 sm:text-base dark:text-white/75">
                  {currentSlide.description}
                </p>
              </div>
            </div>

            {/* ============================================================
                SEARCH
                ============================================================ */}
            <div className="w-full">
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